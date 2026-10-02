import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEMO_PHASES, demoG } from './demoState.js'

test('demoG : un état cohérent par phase, sans réseau', async () => {
  assert.deepEqual(DEMO_PHASES, ['lobby', 'gages', 'listen', 'record', 'vote', 'result', 'gage', 'end'])
  for (const ph of DEMO_PHASES) {
    const g = demoG(ph)
    assert.equal(g.room.phase, ph)
    assert.ok(g.players.length >= 4)
    assert.ok(g.me && g.players.some((p) => p.user_id === g.me.user_id))
    assert.deepEqual(await g.act.vote('u2'), { ok: true })
  }
  assert.ok(demoG('listen').room.clip.title)
  assert.ok(demoG('vote').takes.length >= 3)
  assert.ok(demoG('result').room.last_result)
  assert.ok(demoG('gage').room.gage_result.length >= 1)
})
