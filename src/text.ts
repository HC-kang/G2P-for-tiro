// Markdown -> plain text the G2 text container can show (single font, no styling).
export function stripMd(md: string): string {
  return md
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/^#{1,6}\s*(.+)$/gm, '[$1]')
    .replace(/^(\s*)[*-]\s+/gm, '$1· ')
    .replace(/\*\*|__|`/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Split into pages of at most `max` chars, breaking at line ends when possible.
export function paginate(text: string, max: number): string[] {
  const pages: string[] = []
  let page = ''
  for (const line of text.split('\n')) {
    let rest = line
    while (rest.length > max) {
      if (page) { pages.push(page); page = '' }
      pages.push(rest.slice(0, max))
      rest = rest.slice(max)
    }
    if (page && page.length + 1 + rest.length > max) { pages.push(page); page = '' }
    page = page ? `${page}\n${rest}` : rest
  }
  if (page.trim()) pages.push(page)
  return pages.map(p => p.trim()).filter(Boolean)
}

const bytes = (s: string) => new TextEncoder().encode(s).length

// List limits measured on device (docs say "64 chars" and "1000 chars"; both are UTF-8 bytes):
//   per item:  62 bytes accepted, 64 and 68 rejected -> the 64 includes a terminator. Hangul is 3 bytes per char.
//   per page: 961 bytes accepted, 1007 rejected -> ~1000 bytes.
// Shorten every item until both hold.
export function fitItems(items: string[], maxBytes = 950, maxItemBytes = 62): string[] {
  for (let len = maxItemBytes; len > 1; len--) {
    const cut = items.map(i => i.slice(0, len))
    if (cut.every(i => bytes(i) <= maxItemBytes) && bytes(cut.join('')) <= maxBytes) return cut
  }
  return items.map(i => i.slice(0, 1))
}

// Context carried from the previous chunk into the next one: its last non-empty line,
// or the last `max` chars of that line when it is long.
export function overlapTail(prev: string, max: number): string {
  const last = prev.split('\n').filter(l => l.trim()).pop() ?? ''
  return last.length > max ? '…' + last.slice(-max) : last
}
