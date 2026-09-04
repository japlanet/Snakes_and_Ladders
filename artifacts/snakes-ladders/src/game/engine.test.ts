import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RULES, destination, newGame, playOut, playTurn, rollDie } from "./engine.ts";
import { BOARDS, LAST, boardById, cellOf, centerOf, jumpsOf } from "./board.ts";
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

function game(rules: Partial<Rules> = {}, boardId = "meadow"): GameState {
  return newGame(
    [
      { name: "A", token: "🐸", kind: "human" },
      { name: "B", token: "🤖", kind: "cpu" },
    ],
    { rules: { ...DEFAULT_RULES, ...rules }, boardId },
  );
}

function at(state: GameState, positions: number[]): GameState {
  return { ...state, players: state.players.map((p, i) => ({ ...p, pos: positions[i] ?? p.pos })) };
}

const meadow = jumpsOf(boardById("meadow"));

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

test("every board layout is sane", () => {
  const ids = new Set<string>();
  for (const board of BOARDS) {
    assert.ok(!ids.has(board.id), `board id ${board.id} used twice`);
    ids.add(board.id);
    assert.equal(board.rows.length, 10, `${board.id}: needs ten row colours`);
    assert.ok(board.ladders.length >= 6 && board.snakes.length >= 6, `${board.id}: too few snakes or ladders`);
    const starts = new Set<number>();
    for (const [a] of [...board.ladders, ...board.snakes]) {
      assert.ok(!starts.has(a), `${board.id}: square ${a} used twice`);
      starts.add(a);
    }
    for (const [bottom, top] of board.ladders) assert.ok(top > bottom, `${board.id}: ladder ${bottom}->${top} goes down`);
    for (const [head, tail] of board.snakes) assert.ok(tail < head, `${board.id}: snake ${head}->${tail} goes up`);
    const jumps = jumpsOf(board);
    assert.equal(jumps.size, board.ladders.length + board.snakes.length);
    for (const [from, to] of jumps) {
      assert.ok(from >= 2 && from <= 99, `${board.id}: jump from ${from}`);
      assert.ok(to >= 1 && to <= 99, `${board.id}: jump to ${to}`);
      assert.ok(!jumps.has(to), `${board.id}: jump ${from}->${to} chains into another`);
    }
  }
  assert.equal(boardById("no-such-board").id, BOARDS[0].id);
});

test("rollDie stays in 1..6 for every rng value", () => {
  assert.equal(rollDie(() => 0), 1);
  assert.equal(rollDie(() => 0.9999999), 6);
  assert.equal(rollDie(() => 1), 6);
  assert.equal(rollDie(() => 0.5), 4);
});

test("a plain roll hops one square at a time", () => {
  const { steps, to } = destination(0, 3, DEFAULT_RULES, meadow);
  assert.equal(to, 3);
  assert.deepEqual(steps, [
    { kind: "hop", from: 0, to: 1 },
    { kind: "hop", from: 1, to: 2 },
    { kind: "hop", from: 2, to: 3 },
  ]);
});

test("landing at the foot of a ladder climbs it", () => {
  const { steps, to } = destination(0, 4, DEFAULT_RULES, meadow);
  assert.equal(to, 14);
  assert.equal(steps.length, 5);
  assert.deepEqual(steps[4], { kind: "ladder", from: 4, to: 14 });
});

test("landing on a snake's head slides to its tail", () => {
  const { steps, to } = destination(15, 2, DEFAULT_RULES, meadow);
  assert.equal(to, 7);
  assert.deepEqual(steps.at(-1), { kind: "snake", from: 17, to: 7 });
});

test("each board has its own snakes and ladders", () => {
  // Square 4 is a ladder foot on the meadow but not in space.
  assert.equal(destination(0, 4, DEFAULT_RULES, jumpsOf(boardById("meadow"))).to, 14);
  assert.equal(destination(0, 4, DEFAULT_RULES, jumpsOf(boardById("space"))).to, 4);
  const r = playTurn(game({}, "space"), 2);
  assert.equal(r.state.players[0].pos, 23, "space board: 2 is a ladder to 23");
  assert.equal(r.state.boardId, "space");
});

test("going past 100 stops at 100 and wins when exact finish is off", () => {
  const r = playTurn(at(game(), [97, 0]), 6);
  assert.equal(r.state.players[0].pos, LAST);
  assert.equal(r.steps.length, 3);
  assert.equal(r.state.phase, "won");
  assert.equal(r.state.winner, 0);
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

test("turns alternate, a six included, and the roll count grows", () => {
  let s = game();
  s = playTurn(s, 6).state;
  assert.equal(s.turn, 1, "a six does not roll again");
  assert.equal(s.lastRoll, 6);
  s = playTurn(s, 3).state;
  assert.equal(s.turn, 0);
  assert.equal(s.rolls, 2);
  assert.deepEqual(
    s.players.map(p => p.pos),
    [6, 3],
  );
});

test("the other player is untouched by a move", () => {
  const r = playTurn(at(game(), [10, 42]), 5);
  assert.equal(r.state.players[1].pos, 42);
  assert.equal(r.player, 0);
});

test("game options are kept in the state", () => {
  const s = newGame(
    [
      { name: "A", token: "🐸", kind: "human" },
      { name: "B", token: "🐰", kind: "human" },
    ],
    { boardId: "candy", manual: true },
  );
  assert.equal(s.boardId, "candy");
  assert.equal(s.manual, true);
  assert.equal(s.rules.exactFinish, false);
  const t = playTurn(s, 2).state;
  assert.equal(t.manual, true);
  assert.equal(t.boardId, "candy");
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

test("random games on every board and rule mix all finish cleanly", () => {
  const rulesets: Rules[] = [{ exactFinish: false }, { exactFinish: true }];
  for (const board of BOARDS) {
    for (let seed = 1; seed <= 150; seed++) {
      const rng = seeded(seed);
      const rules = rulesets[seed % rulesets.length];
      let s = game(rules, board.id);
      let n = 0;
      while (s.phase === "roll") {
        const before = s;
        const r = playTurn(s, rollDie(rng));
        for (const p of r.state.players) assert.ok(p.pos >= 0 && p.pos <= LAST, `${board.id} seed ${seed}: position ${p.pos}`);
        for (const step of r.steps) assert.ok(step.to >= 1 && step.to <= LAST);
        if (r.steps.length > 0) assert.equal(r.steps[0].from, before.players[r.player].pos);
        assert.equal(r.state.turn, r.state.phase === "won" ? r.player : (r.player + 1) % 2, "turns always alternate");
        s = r.state;
        assert.ok(++n < 5000, `${board.id} seed ${seed}: game did not finish`);
      }
      assert.notEqual(s.winner, null);
      assert.equal(s.players[s.winner!].pos, LAST);
      assert.equal(s.players.filter(p => p.pos === LAST).length, 1);
    }
    assert.equal(playOut(game({}, board.id), seeded(7)).phase, "won");
  }
});
