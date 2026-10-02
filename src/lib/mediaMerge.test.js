import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeVideos, mergeChapters, rowToVideo } from './mediaMerge.js'

const ep = (season, episode, extra = {}) => ({ season, episode, title: `${season}-${episode}`, src: `x/${season}${episode}.mp4`, ...extra })
const row = (season, num, extra = {}) => ({ id: `id-${season}-${num}`, kind: 'episode', series: 'kny', season, num, title: null, data: { src: `r2/${season}${num}.mp4` }, ...extra })

test('rowToVideo : format des *-videos.json', () => {
  const v = rowToVideo(row('S05', 8, { title: 'Le Pilier', data: { src: 'a.mp4', subtitles: 'a.vtt', audioLang: 'ja', label: 'S05E08', duration: '23:40' } }))
  assert.equal(v.episode, 8)
  assert.equal(v.season, 'S05')
  assert.equal(v.title, 'Le Pilier')
  assert.equal(v.episodeLabel, 'S05E08')
  assert.equal(v.progressKey, 'add-S05-E8')
  assert.deepEqual(v.subtitles, [{ label: 'Français', srclang: 'fr', src: 'a.vtt', default: true }])
  assert.equal(v.badge, 'VOSTFR')
  assert.equal(v.audio[0].mediaSrc, undefined) // un seul fichier : pas de variante
})

test('mergeVideos : insère à sa place dans la saison, avant les films', () => {
  const list = [ep('S01', 1), ep('S01', 2), ep('S02', 1), ep('Film', 0, { kind: 'film' })]
  mergeVideos(list, [row('S02', 2), row('S01', 3)])
  assert.deepEqual(list.map(v => `${v.season}:${v.episode}`), ['S01:1', 'S01:2', 'S01:3', 'S02:1', 'S02:2', 'Film:0'])
})

test('mergeVideos : nouvelle saison avant les films / OAV', () => {
  const list = [ep('S01', 1), ep('OAV', 1, { kind: 'ova' })]
  mergeVideos(list, [row('S02', 1)])
  assert.deepEqual(list.map(v => v.season), ['S01', 'S02', 'OAV'])
})

test("mergeVideos : n'écrase jamais un épisode livré avec le site", () => {
  const list = [ep('S01', 1)]
  mergeVideos(list, [row('S01', 1)])
  assert.equal(list.length, 1)
  assert.equal(list[0].src, 'x/S011.mp4')
})

test('mergeVideos : idempotent, et une fiche supprimée disparaît', () => {
  const list = [ep('S01', 1)]
  mergeVideos(list, [row('S01', 2)])
  mergeVideos(list, [row('S01', 2)])
  assert.equal(list.length, 2)
  mergeVideos(list, [])
  assert.deepEqual(list.map(v => v.episode), [1])
})

test('mergeVideos : une fiche re-publiée remplace l’ajout précédent', () => {
  const list = [ep('S01', 1)]
  mergeVideos(list, [row('S01', 2)])
  mergeVideos(list, [row('S01', 2, { id: 'id-S01-2', title: 'Nouveau titre' })])
  assert.equal(list.length, 2)
  assert.equal(list[1].title, 'Nouveau titre')
})

test('mergeChapters : trie par numéro, sans écraser les chapitres livrés', () => {
  const base = [{ num: 1, pages: ['a'] }, { num: 3, pages: ['c'] }]
  const rows = [
    { id: 'c2', kind: 'chapter', num: 2, title: null, data: { pages: ['b1', 'b2'] } },
    { id: 'c3', kind: 'chapter', num: 3, title: 'doublon', data: { pages: ['zz'] } },
    { id: 'c4', kind: 'chapter', num: 4, title: 'vide', data: { pages: [] } },
  ]
  const out = mergeChapters(base, rows)
  assert.deepEqual(out.map(c => c.num), [1, 2, 3])
  assert.deepEqual(out[2].pages, ['c'])
  assert.equal(out[1].title, 'Chapitre 2')
  assert.equal(base.length, 2) // pas de mutation de l'entrée
})
