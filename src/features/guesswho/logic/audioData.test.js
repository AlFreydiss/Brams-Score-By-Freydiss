import { test } from 'node:test'
import assert from 'node:assert/strict'
import { baseMime, pickRecorderMime, blobToDataUrl } from './audioData.js'

test('baseMime retire les codecs', () => {
  assert.equal(baseMime('audio/webm;codecs=opus'), 'audio/webm')
  assert.equal(baseMime('audio/mp4; codecs=mp4a.40.2'), 'audio/mp4')
  assert.equal(baseMime(''), 'audio/webm')
})

test('pickRecorderMime : webm/opus sinon mp4 (iPhone) (Review Focus)', () => {
  assert.equal(pickRecorderMime((m) => m.startsWith('audio/webm')), 'audio/webm;codecs=opus')
  assert.equal(pickRecorderMime((m) => m === 'audio/mp4'), 'audio/mp4')
  assert.equal(pickRecorderMime(() => false), '')
})

test('blobToDataUrl : data URL, null au-delà de la limite (Review Focus)', async () => {
  const small = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm;codecs=opus' })
  assert.equal(await blobToDataUrl(small), 'data:audio/webm;base64,AQID')
  const big = new Blob([new Uint8Array(200_000)], { type: 'audio/webm' })
  assert.equal(await blobToDataUrl(big), null)
})
