import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeUp, allSubmitted, shouldAdvance, missingSeats } from './hostLoop.js';

const P = (seat, connected = true) => ({ user_id: 'u' + seat, seat, connected });

test('timeUp : true au-delà de la fin de phase', () => {
  assert.equal(timeUp(1000, 1000), true);
  assert.equal(timeUp(1000, 1500), true);
  assert.equal(timeUp(1000, 999), false);
  assert.equal(timeUp(null, 9e9), false);
});

test('allSubmitted : tous les connectés assignés ont soumis', () => {
  const players = [P(0), P(1), P(2)];
  assert.equal(allSubmitted(players, new Set([0, 1, 2])), true);
  assert.equal(allSubmitted(players, new Set([0, 1])), false);
});

test('allSubmitted ignore les déconnectés', () => {
  const players = [P(0), P(1), P(2, false)];
  assert.equal(allSubmitted(players, new Set([0, 1])), true);
});

test('allSubmitted ignore les sièges non assignés (null)', () => {
  const players = [P(0), { user_id: 'x', seat: null, connected: true }];
  assert.equal(allSubmitted(players, new Set([0])), true);
});

test('allSubmitted : aucun actif = false (pas d\'avance fantôme)', () => {
  assert.equal(allSubmitted([], new Set()), false);
  assert.equal(allSubmitted([P(0, false)], new Set()), false);
});

test('shouldAdvance : avance au timeout', () => {
  const room = { status: 'writing', phaseEndsAtMs: 1000, current_round: 0 };
  assert.equal(shouldAdvance(room, [P(0)], new Set(), 2000), true);
});

test('shouldAdvance : avance quand tous ont soumis', () => {
  const room = { status: 'drawing', phaseEndsAtMs: 9e12, current_round: 1 };
  assert.equal(shouldAdvance(room, [P(0), P(1)], new Set([0, 1]), 0), true);
});

test('shouldAdvance : pas avant timeout ni complétion', () => {
  const room = { status: 'drawing', phaseEndsAtMs: 9e12, current_round: 1 };
  assert.equal(shouldAdvance(room, [P(0), P(1)], new Set([0]), 0), false);
});

test('shouldAdvance : faux hors phase de jeu', () => {
  assert.equal(shouldAdvance({ status: 'lobby', phaseEndsAtMs: 0 }, [P(0)], new Set(), 9e9), false);
  assert.equal(shouldAdvance({ status: 'reveal', phaseEndsAtMs: 0 }, [P(0)], new Set(), 9e9), false);
  assert.equal(shouldAdvance(null, [], new Set(), 0), false);
});

test('missingSeats : sièges sans page', () => {
  assert.deepEqual(missingSeats([], new Set([0, 2]), 4), [1, 3]);
  assert.deepEqual(missingSeats([], new Set([0, 1, 2, 3]), 4), []);
});
