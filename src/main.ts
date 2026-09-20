import {
  waitForEvenAppBridge,
  TextContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import { stripMd, paginate, fitItems, overlapTail } from './text.ts'
import { toBytes, wav } from './audio.ts'

// A page rebuild takes ~1000 UTF-8 bytes, but textContainerUpgrade takes ~2000 and the text
// container scrolls natively. So one "page" is a long scrollable chunk, not one screen.
// ponytail: (500 + 80 overlap + 40 heading) Hangul chars = 1860 bytes worst case. Tune on device if upgrades get rejected.
const PAGE_CHARS = 500
const OVERLAP_CHARS = 80

type Note = { noteGuid: string; title: string | null; createdAt: string }

const log = (...a: unknown[]) => { if (import.meta.env.DEV) navigator.sendBeacon('/__log', a.map(String).join(' ')) }
window.addEventListener('error', e => log('error', e.message))
window.addEventListener('unhandledrejection', e => log('rejection', e.reason))

// BYOK: the user's own key, kept in Even Hub storage on their phone. The REST API rejects
// browser origins, but the MCP endpoint allows CORS, so the WebView calls it directly.
let apiKey = ''
let groqKey = ''
let rpcId = 0

async function mcp<T>(name: string, args: object): Promise<T> {
  // dev server only: canned data for store screenshots (tree-shaken from production builds)
  if (import.meta.env.DEV && location.hash === '#demo') return (await import('./demo.ts')).demo(name, args) as T
  const res = await fetch('https://mcp.tiro.ooo/mcp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
  })
  log('mcp', name, res.status)
  if (res.status === 401) throw new Error('API key가 거부됐습니다')
  if (!res.ok) throw new Error(`Tiro ${res.status}`)
  // the server answers with plain JSON or a one-event SSE stream
  const body = await res.text()
  const rpc = JSON.parse(body.match(/^data: (.*)$/m)?.[1] ?? body)
  if (rpc.error || rpc.result?.isError) throw new Error(rpc.error?.message ?? rpc.result.content?.[0]?.text ?? 'Tiro 오류')
  const out = rpc.result.structuredContent ?? JSON.parse(rpc.result.content[0].text)
  return out.data ?? out
}

// Groq allows browser origins (CORS *), so the WebView calls it directly with the user's key.
async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'query.wav')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('language', 'ko')
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${groqKey}` }, body: form,
  })
  log('groq', res.status)
  if (res.status === 401) throw new Error('Groq key가 거부됐습니다')
  if (!res.ok) throw new Error(`Groq ${res.status}`)
  return ((await res.json()).text ?? '').trim()
}

type NoteDetail = { sourceType?: string; recordingEndAt?: string | null; summary?: { content?: string }; transcript?: string }
const getNote = (guid: string) => mcp<NoteDetail>('get_note', { noteGuid: guid, include: ['summary', 'transcript'] })

const bridge = await waitForEvenAppBridge()

const textPage = (content: string) => ({
  containerTotalNum: 1,
  textObject: [
    new TextContainerProperty({
      xPosition: 0, yPosition: 0, width: 576, height: 288,
      borderWidth: 0, paddingLength: 4,
      containerID: 1, containerName: 'main',
      content, isEventCapture: 1,
    }),
  ],
})

const listPage = (items: string[]) => ({
  containerTotalNum: 1,
  listObject: [
    new ListContainerProperty({
      xPosition: 0, yPosition: 0, width: 576, height: 288,
      borderWidth: 0, paddingLength: 4,
      containerID: 1, containerName: 'notes',
      itemContainer: new ListItemContainerProperty({
        itemCount: items.length, itemWidth: 568, isItemSelectBorderEn: 1, itemName: items,
      }),
      isEventCapture: 1,
    }),
  ],
})

const showText = (content: string) => bridge.rebuildPageContainer(new RebuildPageContainer(textPage(content)))

let notes: Note[] = []
// The list widget holds 20 items: 18 notes + "newer" + "older" rows.
const LIST_SIZE = 18
const VOICE = '[음성 검색]'
const ALL = '[전체 목록으로]'
const NEWER = '[최근 노트로]'
const OLDER = '[이전 노트 더 보기]'
let cursors: (string | undefined)[] = [undefined] // cursor of each visited list page; last = current
let nextCursor: string | null = null
let rows: (Note | 'voice' | 'all' | 'newer' | 'older')[] = []
let searching = false // list shows search results
let listening = false
let chunks: Uint8Array[] = []
let listenStart = 0
// Live view of a note that is still recording. Tiro publishes the transcript in ~300-char
// paragraphs, so new text shows up every 40-90 s depending on how fast people talk.
let liveGuid: string | null = null
let liveChars = -1
const LIVE_POLL_MS = 5000
// ponytail: hard cap so a forgotten mic never records a meeting; raise if queries get cut off
const MAX_LISTEN_MS = 15000
let pages: string[] = [] // empty = list view
let pageIndex = 0
let busy = false

async function showList() {
  pages = []
  liveGuid = null
  if (!notes.length && !searching) return showText('Tiro 노트가 없습니다.\n더블탭: 종료')
  // list limits: 20 items, 64 chars per item, ~1000 bytes per page (fitItems)
  const head = searching ? ['all' as const] : cursors.length > 1 ? ['newer' as const] : groqKey ? ['voice' as const] : []
  rows = [...head, ...notes, ...(!searching && nextCursor ? ['older' as const] : [])]
  const label = { voice: VOICE, all: ALL, newer: NEWER, older: OLDER }
  const items = rows.map(r => typeof r === 'string' ? label[r] : `${r.createdAt.slice(5, 10)} ${r.title ?? '(제목 없음)'}`)
  const fitted = fitItems(items)
  const ok = await bridge.rebuildPageContainer(new RebuildPageContainer(listPage(fitted)))
  log('list rebuild', ok, 'count', fitted.length)
  if (!ok) {
    // stay usable: a tap reloads the first page instead of acting on stale rows
    rows = []
    cursors = [undefined]
    await showText('목록을 표시하지 못했습니다.\n탭: 처음으로 · 더블탭: 종료')
  }
}

async function showPage() {
  const more = pageIndex < pages.length - 1 ? '\n\n▼ 계속 스크롤' : '\n\n— 끝 — 더블탭: 목록'
  // repeat the section heading and the end of the previous chunk so the reader keeps the thread
  let lead = ''
  if (pageIndex > 0) {
    const tail = overlapTail(pages[pageIndex - 1], OVERLAP_CHARS)
    const heading = pages.slice(0, pageIndex).join('\n').split('\n').filter(l => l.startsWith('[')).pop() ?? ''
    const parts = [pages[pageIndex].startsWith('[') || heading === tail ? '' : heading.slice(0, 40), tail]
    lead = `(이어서) ${parts.filter(Boolean).join('\n')}\n\n`
  }
  const content = lead + pages[pageIndex] + more
  const ok = await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: 'main', content }))
  log('page upgrade', ok, `${pageIndex + 1}/${pages.length}`, 'bytes', new TextEncoder().encode(content).length)
  if (!ok) await showText('내용을 표시하지 못했습니다.\n더블탭: 목록')
}

// Newest paragraph first: the text container always opens at the top and cannot be scrolled by code.
function liveText(transcript: string): string {
  const paras = transcript.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).reverse()
  const body = paras.join('\n\n').slice(0, PAGE_CHARS) || '아직 전사된 내용이 없습니다.'
  return `● 녹음 중 · 최신순 · ${new Date().toTimeString().slice(0, 5)} 갱신\n\n${body}\n\n더블탭: 목록`
}

async function pollLive(note: Note) {
  if (liveGuid !== note.noteGuid) return
  if (!busy) {
    try {
      const detail = await getNote(note.noteGuid)
      if (liveGuid !== note.noteGuid) return
      if (detail.recordingEndAt) {
        liveGuid = null
        return openNote(note) // recording ended: switch to the normal summary view
      }
      const chars = detail.transcript?.length ?? 0
      if (chars !== liveChars) {
        liveChars = chars
        pages = [liveText(detail.transcript ?? '')]
        await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: 'main', content: pages[0] }))
        log('live update', chars)
      }
    } catch (e) {
      log('live poll failed', e) // transient: keep polling
    }
  }
  setTimeout(() => pollLive(note), LIVE_POLL_MS)
}

async function openNote(note: Note) {
  await showText(`${note.title ?? ''}\n불러오는 중...`)
  const detail = await getNote(note.noteGuid)
  if (detail.sourceType === 'live-voice' && !detail.recordingEndAt) {
    liveGuid = note.noteGuid
    liveChars = detail.transcript?.length ?? 0
    pages = [liveText(detail.transcript ?? '')]
    // upgrade, not rebuild: a rebuild rejects text over ~1000 bytes
    await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: 'main', content: pages[0] }))
    setTimeout(() => pollLive(note), LIVE_POLL_MS)
    return
  }
  // one-page summary when it exists; otherwise the raw transcript
  pages = paginate(stripMd(detail.summary?.content || detail.transcript || ''), PAGE_CHARS)
  if (!pages.length) pages = ['아직 요약이 없습니다.']
  pageIndex = 0
  await showPage()
}

async function startListening() {
  chunks = []
  listening = true
  listenStart = Date.now()
  await showText('듣는 중...\n검색어를 말한 뒤 탭하세요.\n더블탭: 취소')
  const ok = await bridge.audioControl(true)
  log('mic open', ok)
  setTimeout(async () => {
    if (!listening || busy) return
    busy = true
    try { await finishListening() } finally { busy = false }
  }, MAX_LISTEN_MS)
}

async function stopMic() {
  listening = false
  await bridge.audioControl(false)
}

async function finishListening() {
  await stopMic()
  const bytes = chunks.reduce((n, c) => n + c.length, 0)
  // 16 kHz S16LE mono is 32000 B/s; a very different rate means the format assumption is wrong
  log('mic closed', 'bytes', bytes, 'frames', chunks.length, 'B/s', Math.round(bytes / ((Date.now() - listenStart) / 1000)))
  try {
    if (!bytes) throw new Error('마이크 입력이 없습니다')
    await showText('인식 중...')
    const keyword = await transcribe(wav(chunks))
    log('heard', keyword)
    if (!keyword) throw new Error('말소리를 인식하지 못했습니다')
    await showText(`"${keyword}"\n검색 중...`)
    notes = (await mcp<{ notes: Note[] }>('search_notes', { keyword, pagination: { size: LIST_SIZE } })).notes
    searching = true
    if (notes.length) await showList()
    else { rows = []; await showText(`"${keyword}"\n검색 결과가 없습니다.\n탭: 전체 목록 · 더블탭: 종료`) }
  } catch (e) {
    log('voice search failed', e)
    rows = []
    await showText(`음성 검색 실패\n${e}\n탭: 전체 목록 · 더블탭: 종료`)
  } finally {
    chunks = []
  }
}

const NO_KEY = '폰 화면에서 Tiro API key를 입력하세요.\n더블탭: 종료'
const started = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(textPage('Tiro 노트를 불러오는 중...')))
log('startup', started, location.href)

async function loadNotes() {
  if (!apiKey) return showText(NO_KEY)
  searching = false
  try {
    const cursor = cursors[cursors.length - 1]
    const page = await mcp<{ content: Note[]; nextCursor: string | null }>('list_notes', { pagination: { size: LIST_SIZE, ...(cursor && { cursor }) } })
    notes = page.content
    nextCursor = page.nextCursor
    await showList()
  } catch (e) {
    log('load failed', e)
    notes = []
    rows = []
    pages = []
    await showText(`Tiro 연결 실패\n${e}\n탭: 다시 시도 · 더블탭: 종료`)
  }
}

// phone-side settings form (BYOK). A blank field keeps the stored key.
const status = document.querySelector<HTMLElement>('#status')!
const keyStatus = () => `Tiro: ${apiKey ? apiKey.split('.')[0] + '.…' : '없음'} · Groq: ${groqKey ? '저장됨' : '없음'}`
async function saveKeys(tiro: string, groq: string) {
  apiKey = tiro
  groqKey = groq
  await bridge.setLocalStorage('tiroKey', tiro)
  await bridge.setLocalStorage('groqKey', groq)
  cursors = [undefined]
  status.textContent = `저장했습니다. ${keyStatus()}`
  await loadNotes()
}
document.querySelector<HTMLFormElement>('#app')!.addEventListener('submit', async e => {
  e.preventDefault()
  const [tiro, groq] = ['#key', '#groq'].map(id => document.querySelector<HTMLInputElement>(id)!)
  await saveKeys(tiro.value.trim() || apiKey, groq.value.trim() || groqKey)
  tiro.value = groq.value = ''
})
document.querySelector('#clear')!.addEventListener('click', () => saveKeys('', ''))

apiKey = (await bridge.getLocalStorage('tiroKey')) ?? ''
groqKey = (await bridge.getLocalStorage('groqKey')) ?? ''
if (import.meta.env.DEV && location.hash === '#demo') apiKey = groqKey = 'demo'
status.textContent = keyStatus()
await loadNotes()

// CLICK_EVENT is 0 and protobuf drops zero values, so a tap arrives with eventType undefined.
function eventTypeOf(envelope?: { eventType?: OsEventTypeList }): OsEventTypeList | null {
  if (!envelope) return null
  return envelope.eventType ?? OsEventTypeList.CLICK_EVENT
}

const unsubscribe = bridge.onEvenHubEvent(async event => {
  if (event.audioEvent) {
    if (listening) chunks.push(toBytes(event.audioEvent.audioPcm))
    return
  }
  const type = eventTypeOf(event.listEvent) ?? eventTypeOf(event.textEvent) ?? eventTypeOf(event.sysEvent)
  if (type === OsEventTypeList.SYSTEM_EXIT_EVENT || type === OsEventTypeList.ABNORMAL_EXIT_EVENT) return unsubscribe()
  if (type === null || busy) return
  busy = true
  try {
    if (listening) {
      if (type === OsEventTypeList.CLICK_EVENT) await finishListening()
      else if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) { await stopMic(); await showList() }
    } else if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      // root page double-tap must exit (Even Hub requirement); elsewhere it goes back
      if (pages.length) await showList()
      else if (searching) { cursors = [undefined]; await loadNotes() }
      else await bridge.shutDownPageContainer(1)
    } else if (!pages.length) {
      // hardware omits currentSelectItemIndex for the first item
      const row = rows[event.listEvent?.currentSelectItemIndex ?? 0]
      if (type !== OsEventTypeList.CLICK_EVENT) return
      if (!row) { cursors = [undefined]; await loadNotes(); return }
      if (row === 'voice') await startListening()
      else if (row === 'all') { cursors = [undefined]; await loadNotes() }
      else if (row === 'older') { cursors.push(nextCursor!); await loadNotes() }
      else if (row === 'newer') { cursors.pop(); await loadNotes() }
      else await openNote(row)
    } else if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT && pageIndex < pages.length - 1) {
      pageIndex += 1
      await showPage()
    } else if (type === OsEventTypeList.SCROLL_TOP_EVENT && pageIndex > 0) {
      pageIndex -= 1
      await showPage()
    }
  } catch (e) {
    pages = []
    liveGuid = null
    await showText(`오류\n${e}\n더블탭: 종료`)
  } finally {
    busy = false
  }
})
