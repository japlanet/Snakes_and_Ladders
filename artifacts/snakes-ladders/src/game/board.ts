/**
 * The board: a 10 by 10 grid numbered 1 to 100, boustrophedon style, square 1
 * at the bottom left. Below the grid is a little start pad where tokens wait
 * before their first roll.
 *
 * Coordinates for drawing are in "cell units": x runs 0..10 left to right,
 * y runs 0..10.9 top to bottom (the extra 0.9 is the start pad).
 */

export const COLS = 10;
export const ROWS = 10;
export const LAST = COLS * ROWS;
export const START_PAD = 0.9;
export const BOARD_W = COLS;
export const BOARD_H = ROWS + START_PAD;

/** [bottom, top] */
export const LADDERS: ReadonlyArray<readonly [number, number]> = [
  [4, 14],
  [9, 31],
  [20, 38],
  [28, 84],
  [40, 59],
  [51, 67],
  [63, 81],
  [71, 91],
];

/** [head, tail] */
export const SNAKES: ReadonlyArray<readonly [number, number]> = [
  [17, 7],
  [54, 34],
  [62, 19],
  [64, 60],
  [87, 24],
  [93, 73],
  [95, 75],
  [99, 78],
];

/** Every square that sends you somewhere else, and where. */
export const JUMPS: ReadonlyMap<number, number> = new Map<number, number>([...LADDERS, ...SNAKES]);

export interface Cell {
  col: number;
  /** 0 is the bottom row. */
  row: number;
}

export function cellOf(square: number): Cell {
  if (square < 1 || square > LAST) throw new Error(`No square ${square}`);
  const i = square - 1;
  const row = Math.floor(i / COLS);
  const across = i % COLS;
  const col = row % 2 === 0 ? across : COLS - 1 - across;
  return { col, row };
}

export interface Point {
  x: number;
  y: number;
}

/** Centre of a square in cell units. Square 0 is the start pad. */
export function centerOf(square: number): Point {
  if (square <= 0) return { x: 1.75, y: ROWS + START_PAD / 2 };
  const { col, row } = cellOf(square);
  return { x: col + 0.5, y: ROWS - 1 - row + 0.5 };
}
