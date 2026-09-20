// audioPcm arrives as Uint8Array, number[] or a base64 string depending on the host's JSON bridge.
export function toBytes(pcm: Uint8Array | number[] | string): Uint8Array {
  if (typeof pcm === 'string') return Uint8Array.from(atob(pcm), c => c.charCodeAt(0))
  return pcm instanceof Uint8Array ? pcm : Uint8Array.from(pcm)
}

// Wrap raw PCM S16LE mono in a WAV header.
export function wav(chunks: Uint8Array[], sampleRate = 16000): Blob {
  const size = chunks.reduce((n, c) => n + c.length, 0)
  const h = new DataView(new ArrayBuffer(44))
  const str = (o: number, s: string) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF'); h.setUint32(4, 36 + size, true); str(8, 'WAVEfmt ')
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true)
  h.setUint32(24, sampleRate, true); h.setUint32(28, sampleRate * 2, true)
  h.setUint16(32, 2, true); h.setUint16(34, 16, true)
  str(36, 'data'); h.setUint32(40, size, true)
  return new Blob([h, ...chunks] as BlobPart[], { type: 'audio/wav' })
}
