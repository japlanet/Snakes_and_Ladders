export type PlayerKind = "human" | "cpu";

export interface Player {
  id: number;
  name: string;
  /** The emoji shown on the board. */
  token: string;
  kind: PlayerKind;
  /** 0 = waiting on the start pad, 100 = home. */
  pos: number;
}

export interface Rules {
  /** Must land on 100 exactly; a roll that would go past is lost. */
  exactFinish: boolean;
  /** Rolling a six earns another turn. */
  sixAgain: boolean;
}

export type Phase = "roll" | "won";

export interface GameState {
  v: 1;
  players: Player[];
  /** Index into `players` of whoever rolls next. */
  turn: number;
  phase: Phase;
  winner: number | null;
  lastRoll: number | null;
  rules: Rules;
  /** Rolls taken so far, for the "how long was that" line at the end. */
  rolls: number;
}

export type StepKind = "hop" | "ladder" | "snake";

/** One visible piece of a move: a hop to the next square, or a jump along a ladder or snake. */
export interface Step {
  kind: StepKind;
  from: number;
  to: number;
}

export interface TurnResult {
  state: GameState;
  /** Index of the player who moved. */
  player: number;
  roll: number;
  /** Empty when the roll was lost (exact-finish rule). */
  steps: Step[];
  /** The same player rolls again. */
  again: boolean;
}
