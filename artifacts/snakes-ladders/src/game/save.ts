/**
 * A game in progress is kept in localStorage so that Home, a refresh, or the
 * iPad dropping the tab in the background all come back to the same board.
 */
import { LAST } from "./board.ts";
import type { GameState, Player } from "./types.ts";

const PREFIX = "snakes-ladders-";
export const GAME_KEY = PREFIX + "game";

function isPlayer(x: unknown): x is Player {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === "number" &&
    typeof p.name === "string" &&
    typeof p.token === "string" &&
    p.token.length > 0 &&
    (p.kind === "human" || p.kind === "cpu") &&
    Number.isInteger(p.pos) &&
    (p.pos as number) >= 0 &&
    (p.pos as number) <= LAST
  );
}

/** True when `x` looks like a GameState we wrote, so a stale or fiddled value cannot crash the game. */
export function isGameState(x: unknown): x is GameState {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  if (s.v !== 1) return false;
  if (!Array.isArray(s.players) || s.players.length < 2 || !s.players.every(isPlayer)) return false;
  if (!Number.isInteger(s.turn) || (s.turn as number) < 0 || (s.turn as number) >= s.players.length) return false;
  if (s.phase !== "roll" && s.phase !== "won") return false;
  if (s.winner !== null && !(Number.isInteger(s.winner) && (s.winner as number) >= 0 && (s.winner as number) < s.players.length)) return false;
  if (s.lastRoll !== null && !(Number.isInteger(s.lastRoll) && (s.lastRoll as number) >= 1 && (s.lastRoll as number) <= 6)) return false;
  if (typeof s.rules !== "object" || s.rules === null) return false;
  const r = s.rules as Record<string, unknown>;
  if (typeof r.exactFinish !== "boolean" || typeof r.sixAgain !== "boolean") return false;
  if (!Number.isInteger(s.rolls) || (s.rolls as number) < 0) return false;
  return true;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function storeGame(state: GameState): void {
  try {
    storage()?.setItem(GAME_KEY, JSON.stringify(state));
  } catch {}
}

/** The unfinished game, if there is one. Finished games are not worth resuming. */
export function loadGame(): GameState | null {
  try {
    const raw = storage()?.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed) || parsed.phase !== "roll") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    storage()?.removeItem(GAME_KEY);
  } catch {}
}

/** Everything this game ever stored: the saved game, settings, sound toggles. */
export function eraseAllProgress(): void {
  const s = storage();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) s.removeItem(k);
  } catch {}
}
