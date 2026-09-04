import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { newGame, playTurn } from "./engine.ts";
import { GAME_KEY, clearGame, eraseAllProgress, isGameState, loadGame, storeGame } from "./save.ts";

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const mem = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: mem, configurable: true });

beforeEach(() => mem.clear());

const fresh = () =>
  newGame(
    [
      { name: "A", token: "🐸", kind: "human" },
      { name: "B", token: "🤖", kind: "cpu" },
    ],
    { boardId: "ocean", manual: true },
  );

test("a stored game round-trips, board and mode included", () => {
  const s = playTurn(fresh(), 3).state;
  storeGame(s);
  assert.deepEqual(loadGame(), s);
  assert.equal(loadGame()?.boardId, "ocean");
  assert.equal(loadGame()?.manual, true);
});

test("nothing stored, junk, or an old save format loads as null", () => {
  assert.equal(loadGame(), null);
  mem.setItem(GAME_KEY, "not json");
  assert.equal(loadGame(), null);
  mem.setItem(GAME_KEY, JSON.stringify({ ...fresh(), v: 1 }));
  assert.equal(loadGame(), null);
});

test("a finished game is not resumed", () => {
  let s = fresh();
  s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, pos: 99 } : p)) };
  s = playTurn(s, 1).state;
  assert.equal(s.phase, "won");
  storeGame(s);
  assert.equal(loadGame(), null);
});

test("the validator rejects broken states", () => {
  const good = fresh();
  assert.ok(isGameState(good));
  assert.ok(!isGameState(null));
  assert.ok(!isGameState({ ...good, boardId: "moon" }));
  assert.ok(!isGameState({ ...good, manual: "yes" }));
  assert.ok(!isGameState({ ...good, turn: 5 }));
  assert.ok(!isGameState({ ...good, phase: "moving" }));
  assert.ok(!isGameState({ ...good, lastRoll: 9 }));
  assert.ok(!isGameState({ ...good, players: [good.players[0]] }));
  assert.ok(!isGameState({ ...good, players: good.players.map(p => ({ ...p, pos: 101 })) }));
  assert.ok(!isGameState({ ...good, players: good.players.map(p => ({ ...p, kind: "alien" })) }));
  assert.ok(!isGameState({ ...good, rules: { exactFinish: "yes" } }));
});

test("clear and erase remove what we stored and nothing else", () => {
  storeGame(fresh());
  mem.setItem("snakes-ladders-sfx", "false");
  mem.setItem("other-app", "keep");
  clearGame();
  assert.equal(loadGame(), null);
  assert.equal(mem.getItem("snakes-ladders-sfx"), "false");
  eraseAllProgress();
  assert.equal(mem.getItem("snakes-ladders-sfx"), null);
  assert.equal(mem.getItem("other-app"), "keep");
});
