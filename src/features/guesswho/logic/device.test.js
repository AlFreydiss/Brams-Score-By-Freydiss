import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deviceSummary } from './device.js'

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPHONE_DISCORD = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Discord/240.0'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const PC_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
const PC_EDGE = PC_CHROME + ' Edg/129.0.0.0'
const PC_FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0'

test('deviceSummary : appareil · navigateur version', () => {
  assert.equal(deviceSummary(IPHONE_SAFARI), 'iPhone · Safari 17')
  assert.equal(deviceSummary(IPHONE_DISCORD), 'iPhone · Discord')
  assert.equal(deviceSummary(ANDROID_CHROME), 'Android · Chrome 129')
  assert.equal(deviceSummary(PC_CHROME), 'PC · Chrome 129')
  assert.equal(deviceSummary(PC_EDGE), 'PC · Edge 129')
  assert.equal(deviceSummary(PC_FIREFOX), 'PC · Firefox 131')
})

test('deviceSummary : UA vide ou inconnu', () => {
  assert.equal(deviceSummary(''), 'Inconnu · Autre')
  assert.equal(deviceSummary(undefined), 'Inconnu · Autre')
  assert.ok(deviceSummary('x'.repeat(500)).length <= 80)
})
