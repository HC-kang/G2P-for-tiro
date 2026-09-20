import test from 'node:test'
import assert from 'node:assert/strict'
import { toBytes, wav } from './audio.ts'

test('toBytes accepts every bridge encoding', () => {
  assert.deepEqual([...toBytes(new Uint8Array([1, 2]))], [1, 2])
  assert.deepEqual([...toBytes([1, 2])], [1, 2])
  assert.deepEqual([...toBytes(btoa('\x01\x02'))], [1, 2])
})

test('wav header describes 16 kHz mono S16LE', async () => {
  const buf = new DataView(await wav([new Uint8Array(320), new Uint8Array(320)]).arrayBuffer())
  assert.equal(buf.byteLength, 44 + 640)
  assert.equal(String.fromCharCode(...new Uint8Array(buf.buffer, 0, 4)), 'RIFF')
  assert.equal(buf.getUint32(24, true), 16000)
  assert.equal(buf.getUint32(28, true), 32000)
  assert.equal(buf.getUint32(40, true), 640)
})
