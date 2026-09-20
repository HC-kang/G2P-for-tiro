import test from 'node:test'
import assert from 'node:assert/strict'
import { stripMd, paginate } from './text.ts'

test('stripMd removes markdown markers', () => {
  assert.equal(stripMd('## 결정\n\n---\n\n* **PoC**는 `9월`\n\n\n\n끝'), '[결정]\n\n· PoC는 9월\n\n끝')
})

test('paginate keeps every char and respects max', () => {
  const text = 'a'.repeat(25) + '\n' + '가나다\n'.repeat(10)
  const pages = paginate(text, 10)
  assert.ok(pages.every(p => p.length <= 10 && p.length > 0))
  assert.equal(pages.join('').replace(/\n/g, ''), text.replace(/\n/g, ''))
  assert.deepEqual(paginate('', 10), [])
})

test('fitItems keeps the list under the byte budget', async () => {
  const { fitItems } = await import('./text.ts')
  const items = Array.from({ length: 20 }, (_, i) => `09-${i} ` + '가'.repeat(40))
  const out = fitItems(items)
  assert.equal(out.length, 20)
  assert.ok(new TextEncoder().encode(out.join('')).length <= 950)
  assert.ok(out.every(i => new TextEncoder().encode(i).length <= 62))
  assert.ok(fitItems(['09-14 ' + '가'.repeat(40)])[0].length < 30) // one long Hangul item alone still gets cut to 64 bytes
  assert.deepEqual(fitItems(['short']), ['short'])
})

test('overlapTail returns the last line, capped', async () => {
  const { overlapTail } = await import('./text.ts')
  assert.equal(overlapTail('[제목]\n· 첫째\n· 둘째\n\n', 80), '· 둘째')
  assert.equal(overlapTail('가'.repeat(100), 10), '…' + '가'.repeat(10))
  assert.equal(overlapTail('', 10), '')
})
