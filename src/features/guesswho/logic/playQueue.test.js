import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPlayQueue } from './playQueue.js'

// Faux élément audio + minuteries manuelles : aucune dépendance au navigateur.
function harness(urls) {
  const played = []
  const timers = []
  const audio = {
    src: '', paused: true, ended: null,
    play() { this.paused = false; played.push(this.src); return Promise.resolve() },
    pause() { this.paused = true },
    onEnded(fn) { this.ended = fn },
  }
  const idx = []
  const q = createPlayQueue({
    getUrls: () => urls, makeAudio: () => audio, onIdx: (i) => idx.push(i),
    later: (fn) => timers.push(fn), gapMs: 350,
  })
  return { q, audio, played, idx, flush: () => timers.splice(0).forEach((f) => f()) }
}

test('enchaîne les sons après la respiration', () => {
  const h = harness(['a', 'b', 'c'])
  h.q.start()
  h.audio.ended(); h.flush()
  h.audio.ended(); h.flush()
  assert.deepEqual(h.played, ['a', 'b', 'c'])
  h.audio.ended(); h.flush()
  assert.equal(h.idx.at(-1), null)
})

test('fin de phase pendant la respiration : plus aucun son ne repart', () => {
  const h = harness(['a', 'b', 'c'])
  h.q.start()
  h.audio.ended()   // « a » fini, « b » programmé dans 350 ms…
  h.q.dispose()     // …mais la phase de vote se termine avant
  h.flush()
  assert.deepEqual(h.played, ['a'])
  assert.equal(h.audio.paused, true)
})

test('stop : la file s\'arrête, un « ended » tardif ne relance rien', () => {
  const h = harness(['a', 'b'])
  h.q.start()
  h.q.stop()
  h.audio.ended(); h.flush()
  assert.deepEqual(h.played, ['a'])
})
