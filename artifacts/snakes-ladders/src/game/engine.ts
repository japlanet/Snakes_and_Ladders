/**
 * The rules of Snakes and Ladders as pure functions. Nothing here touches the
 * screen, so the whole thing is unit tested in engine.test.ts.
 */
import { DEFAULT_BOARD_ID, LAST, boardById, jumpsOf } from "./board.ts";
import type { GameState, Player, PlayerKind, Rules, Step, TurnResult } from "./types.ts";

export interface PlayerSpec {
  name: string;
  token: string;
  kind: PlayerKind;
}

export interface GameOptions {
  rules?: Rules;
  boardId?: string;
  manual?: boolean;
}

export const DEFAULT_RULES: Rules = { exactFinish: false };

export function newGame(specs: PlayerSpec[], options: GameOptions = {}): GameState {
  if (specs.length < 2) throw new Error("A game needs at least two players");
  return {
    v: 2,
    boardId: boardById(options.boardId ?? DEFAULT_BOARD_ID).id,
    manual: options.manual ?? false,
    players: specs.map((s, i) => ({ id: i, name: s.name, token: s.token, kind: s.kind, pos: 0 })),
    turn: 0,
    phase: "roll",
    winner: null,
    lastRoll: null,
    rules: { ...DEFAULT_RULES, ...options.rules },
    rolls: 0,
  };
}

export function rollDie(rng: () => number = Math.random): number {
  const r = Math.min(Math.max(rng(), 0), 0.999999);
  return 1 + Math.floor(r * 6);
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn];
}

/**
 * Where a roll takes a token from `from`, and the steps to show on the way.
 * The steps are one hop per square, then a ladder or snake jump if the square
 * landed on has one.
 */
export function destination(from: number, roll: number, rules: Rules, jumps: ReadonlyMap<number, number>): { steps: Step[]; to: number } {
  const steps: Step[] = [];
  let target = from + roll;
  if (target > LAST) {
    if (rules.exactFinish) return { steps, to: from };
    target = LAST;
  }
  for (let s = from + 1; s <= target; s++) steps.push({ kind: "hop", from: s - 1, to: s });
  const jump = jumps.get(target);
  if (jump !== undefined) {
    steps.push({ kind: jump > target ? "ladder" : "snake", from: target, to: jump });
    target = jump;
  }
  return { steps, to: target };
}

export function playTurn(state: GameState, roll: number): TurnResult {
  if (state.phase !== "roll") throw new Error("The game is over");
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new Error(`Bad roll: ${roll}`);
  const idx = state.turn;
  const mover = state.players[idx];
  const { steps, to } = destination(mover.pos, roll, state.rules, jumpsOf(boardById(state.boardId)));
  const players = state.players.map((p, i) => (i === idx ? { ...p, pos: to } : p));
  const won = to === LAST;
  const next: GameState = {
    ...state,
    players,
    turn: won ? idx : (idx + 1) % players.length,
    phase: won ? "won" : "roll",
    winner: won ? idx : null,
    lastRoll: roll,
    rolls: state.rolls + 1,
  };
  return { state: next, player: idx, roll, steps };
}

/** Play a whole game out with the given dice. Used by the tests. */
export function playOut(state: GameState, rng: () => number, maxRolls = 5000): GameState {
  let s = state;
  let n = 0;
  while (s.phase === "roll") {
    if (++n > maxRolls) throw new Error("Game did not finish");
    s = playTurn(s, rollDie(rng)).state;
  }
  return s;
}
