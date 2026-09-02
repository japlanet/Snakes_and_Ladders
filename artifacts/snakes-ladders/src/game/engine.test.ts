import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RULES, destination, newGame, playOut, playTurn, rollDie } from "./engine.ts";
import { JUMPS, LADDERS, LAST, SNAKES, cellOf, centerOf } from "./board.ts";
import type { GameState, Rules } from "./types.ts";

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function game(rules: Partial<Rules> = {}): GameState {
  return newGame(
    [
      { name: "A", token: "🐸", kind: "human" },
      { name: "B", token: "🤖", kind: "cpu" },
    ],
    { ...DEFAULT_RULES, ...rules },
  );
}

function at(state: GameState, positions: number[]): GameState {
  return { ...state, players: state.players.map((p, i) => ({ ...p, pos: positions[i] ?? p.pos })) };
}

test("squares snake back and forth up the board", () => {
  assert.deepEqual(cellOf(1), { col: 0, row: 0 });
  assert.deepEqual(cellOf(10), { col: 9, row: 0 });
  assert.deepEqual(cellOf(11), { col: 9, row: 1 });
  assert.deepEqual(cellOf(20), { col: 0, row: 1 });
  assert.deepEqual(cellOf(21), { col: 0, row: 2 });
  assert.deepEqual(cellOf(100), { col: 0, row: 9 });
  assert.throws(() => cellOf(0));
  assert.throws(() => cellOf(101));
});

test("square centres: 1 is bottom left, 100 is top left, 0 is on the start pad", () => {
  assert.deepEqual(centerOf(1), { x: 0.5, y: 9.5 });
  assert.deepEqual(centerOf(100), { x: 0.5, y: 0.5 });
  assert.ok(centerOf(0).y > 10);
});

test("board layout is sane", () => {
  const starts = new Set<number>();
  for (const [a] of [...LADDERS, ...SNAKES]) {
    assert.ok(!starts.has(a), `square ${a} used twice`);
    starts.add(a);
  }
  for (const [bottom, top] of LADDERS) assert.ok(top > bottom, `ladder ${bottom}->${top} goes down`);
  for (const [head, tail] of SNAKES) assert.ok(tail < head, `snake ${head}->${tail} goes up`);
  for (const [from, to] of JUMPS) {
    assert.ok(from >= 2 && from <= 99, `jump from ${from}`);
    assert.ok(to >= 1 && to <= 99, `jump to ${to}`);
    assert.ok(!JUMPS.has(to), `jump ${from}->${to} chains into another`);
  }
});

test("rollDie stays in 1..6 for every rng value", () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.9999999), 6);
  assert.equal(rollDie(() => 1), 6);
  assert.equal(rollDie(() => 0.5), 4);
});

test("a plain roll hops one square at a time", () => {
  const { steps, to } = destination(0, 3, DEFAULT_RULES);
  assert.equal(to, 3);
  assert.deepEqual(steps, [
    { kind: "hop", from: 0, to: 1 },
    { kind: "hop", from: 1, to: 2 },
    { kind: "hop", from: 2, to: 3 },
  ]);
});

test("landing at the foot of a ladder climbs it", () => {
  const { steps, to } = destination(0, 4, DEFAULT_RULES);
  assert.equal(to, 14);
  assert.equal(steps.length, 5);
  assert.deepEqual(steps[4], { kind: "ladder", from: 4, to: 14 });
});

test("landing on a snake's head slides to its tail", () => {
  const { steps, to } = destination(15, 2, DEFAULT_RULES);
  assert.equal(to, 7);
  assert.deepEqual(steps.at(-1), { kind: "snake", from: 17, to: 7 });
});

test("going past 100 stops at 100 and wins when exact finish is off", () => {
  const r = playTurn(at(game(), [97, 0]), 6);
  assert.equal(r.state.players[0].pos, LAST);
  assert.equal(r.steps.length, 3);
  assert.equal(r.state.phase, "won");
  assert.equal(r.state.winner, 0);
  assert.equal(r.again, false);
  assert.equal(r.state.turn, 0);
});

test("exact finish: an overshooting roll is lost and the turn passes", () => {
  const r = playTurn(at(game({ exactFinish: true }), [97, 0]), 5);
  assert.equal(r.state.players[0].pos, 97);
  assert.deepEqual(r.steps, []);
  assert.equal(r.state.phase, "roll");
  assert.equal(r.state.turn, 1);
});

test("exact finish: landing right on 100 wins", () => {
  const r = playTurn(at(game({ exactFinish: true }), [97, 0]), 3);
  assert.equal(r.state.players[0].pos, LAST);
  assert.equal(r.state.phase, "won");
});

test("turns alternate and the roll count grows", () => {
  let s = game();
  s = playTurn(s, 2).state;
  assert.equal(s.turn, 1);
  assert.equal(s.lastRoll, 2);
  s = playTurn(s, 3).state;
  assert.equal(s.turn, 0);
  assert.equal(s.rolls, 2);
  assert.deepEqual(
    s.players.map(p => p.pos),
    [2, 3],
  );
});

test("a six rolls again when the rule is on, not when it is off", () => {
  const on = playTurn(game({ sixAgain: true }), 6);
  assert.equal(on.again, true);
  assert.equal(on.state.turn, 0);
  const off = playTurn(game({ sixAgain: false }), 6);
  assert.equal(off.again, false);
  assert.equal(off.state.turn, 1);
});

test("a six that wins does not roll again", () => {
  const r = playTurn(at(game(), [94, 0]), 6);
  assert.equal(r.state.phase, "won");
  assert.equal(r.again, false);
});

test("the other player is untouched by a move", () => {
  const r = playTurn(at(game(), [10, 42]), 5);
  assert.equal(r.state.players[1].pos, 42);
  assert.equal(r.player, 0);
});

test("bad input is rejected", () => {
  assert.throws(() => playTurn(game(), 0));
  assert.throws(() => playTurn(game(), 7));
  assert.throws(() => playTurn(game(), 2.5));
  const done = playTurn(at(game(), [99, 0]), 1).state;
  assert.throws(() => playTurn(done, 1));
  assert.throws(() => newGame([{ name: "A", token: "🐸", kind: "human" }]));
});

test("state is never mutated", () => {
  const s = at(game(), [3, 0]);
  const frozen = JSON.stringify(s);
  playTurn(s, 1);
  assert.equal(JSON.stringify(s), frozen);
});

test("300 random games all finish cleanly with every rule mix", () => {
  const rulesets: Rules[] = [
    { exactFinish: false, sixAgain: true },
    { exactFinish: true, sixAgain: true },
    { exactFinish: false, sixAgain: false },
    { exactFinish: true, sixAgain: false },
  ];
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed);
    const rules = rulesets[seed % rulesets.length];
    let s = game(rules);
    let n = 0;
    while (s.phase === "roll") {
      const r = playTurn(s, rollDie(rng));
      for (const p of r.state.players) assert.ok(p.pos >= 0 && p.pos <= LAST, `seed ${seed}: position ${p.pos}`);
      for (const step of r.steps) assert.ok(step.to >= 1 && step.to <= LAST);
      if (r.steps.length > 0) assert.equal(r.steps[0].from, s.players[r.player].pos);
      s = r.state;
      assert.ok(++n < 5000, `seed ${seed}: game did not finish`);
    }
    assert.notEqual(s.winner, null);
    assert.equal(s.players[s.winner!].pos, LAST);
    assert.equal(s.players.filter(p => p.pos === LAST).length, 1);
    assert.equal(playOut(game(rules), seeded(seed)).phase, "won");
  }
});
