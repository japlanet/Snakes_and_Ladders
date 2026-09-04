/**
 * The boards. Every board is a 10 by 10 grid numbered 1 to 100, boustrophedon
 * style, square 1 at the bottom left, with a little start pad below the grid
 * where tokens wait before their first roll. Boards differ in where the
 * snakes and ladders are and in their colours.
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

export type Jump = readonly [number, number];

export interface BoardDef {
  id: string;
  name: string;
  emoji: string;
  /** What sits on square 100. */
  goal: string;
  /** [bottom, top] */
  ladders: ReadonlyArray<Jump>;
  /** [head, tail] */
  snakes: ReadonlyArray<Jump>;
  /** One colour per row, bottom row first. */
  rows: ReadonlyArray<string>;
  paper: string;
  grid: string;
  number: string;
  pad: string;
  padStroke: string;
  text: string;
  rail: string;
  rung: string;
  snakeColors: ReadonlyArray<string>;
  snakeDark: ReadonlyArray<string>;
}

export const BOARDS: ReadonlyArray<BoardDef> = [
  {
    id: "meadow",
    name: "Meadow",
    emoji: "🌼",
    goal: "⭐",
    ladders: [[4, 14], [9, 31], [20, 38], [28, 84], [40, 59], [51, 67], [63, 81], [71, 91]],
    snakes: [[17, 7], [54, 34], [62, 19], [64, 60], [87, 24], [93, 73], [95, 75], [99, 78]],
    rows: ["#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#a5f3fc", "#bfdbfe", "#ddd6fe", "#fbcfe8", "#fecaca", "#fed7aa"],
    paper: "#fffdf7",
    grid: "rgba(255,255,255,0.9)",
    number: "#1f2937",
    pad: "#dcfce7",
    padStroke: "#86efac",
    text: "#15803d",
    rail: "#b45309",
    rung: "#f59e0b",
    snakeColors: ["#22c55e", "#a855f7", "#f97316", "#0ea5e9", "#14b8a6", "#ec4899", "#eab308", "#ef4444"],
    snakeDark: ["#166534", "#581c87", "#9a3412", "#075985", "#134e4a", "#9d174d", "#854d0e", "#991b1b"],
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    goal: "🏝️",
    // Lanes again, but with snakes where Candy has ladders and a band across the middle.
    ladders: [[3, 37], [8, 34], [45, 53], [61, 82], [65, 95], [70, 89]],
    snakes: [[35, 5], [40, 2], [50, 12], [57, 41], [93, 67], [97, 63]],
    rows: ["#bae6fd", "#a5f3fc", "#99f6e4", "#bfdbfe", "#a7f3d0", "#c7d2fe", "#bae6fd", "#99f6e4", "#a5f3fc", "#bfdbfe"],
    paper: "#f0f9ff",
    grid: "rgba(255,255,255,0.9)",
    number: "#0c4a6e",
    pad: "#e0f2fe",
    padStroke: "#7dd3fc",
    text: "#0369a1",
    rail: "#92400e",
    rung: "#fbbf24",
    snakeColors: ["#f97316", "#e11d48", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#3b82f6", "#84cc16"],
    snakeDark: ["#9a3412", "#881337", "#4c1d95", "#92400e", "#064e3b", "#9d174d", "#1e3a8a", "#3f6212"],
  },
  {
    id: "space",
    name: "Space",
    emoji: "🚀",
    goal: "🪐",
    ladders: [[2, 23], [13, 46], [21, 42], [36, 57], [44, 65], [53, 88], [66, 86], [77, 97]],
    snakes: [[19, 5], [33, 14], [49, 26], [61, 38], [70, 52], [82, 60], [91, 72], [96, 78]],
    rows: ["#312e81", "#3730a3", "#4c1d95", "#1e3a8a", "#5b21b6", "#1e40af", "#312e81", "#4c1d95", "#3730a3", "#1e3a8a"],
    paper: "#0f172a",
    grid: "rgba(255,255,255,0.18)",
    number: "#e0e7ff",
    pad: "#1e293b",
    padStroke: "#818cf8",
    text: "#c7d2fe",
    rail: "#cbd5e1",
    rung: "#fde047",
    snakeColors: ["#22d3ee", "#f472b6", "#a3e635", "#fb923c", "#c084fc", "#facc15", "#34d399", "#f87171"],
    snakeDark: ["#0e7490", "#9d174d", "#4d7c0f", "#c2410c", "#6b21a8", "#a16207", "#047857", "#b91c1c"],
  },
  {
    id: "candy",
    name: "Candy",
    emoji: "🍭",
    goal: "🍭",
    // Laid out in vertical lanes that alternate ladder and snake, so nothing crosses.
    ladders: [[2, 41], [6, 36], [10, 29], [46, 52], [58, 84], [67, 93]],
    snakes: [[33, 7], [37, 3], [55, 42], [82, 60], [90, 70], [95, 65]],
    rows: ["#fbcfe8", "#fde68a", "#bbf7d0", "#ddd6fe", "#fecdd3", "#fef9c3", "#a7f3d0", "#e9d5ff", "#fbcfe8", "#fde68a"],
    paper: "#fff1f2",
    grid: "rgba(255,255,255,0.9)",
    number: "#831843",
    pad: "#fce7f3",
    padStroke: "#f9a8d4",
    text: "#be185d",
    rail: "#dc2626",
    rung: "#ffffff",
    snakeColors: ["#f472b6", "#a78bfa", "#fb923c", "#2dd4bf", "#facc15", "#f87171", "#60a5fa", "#4ade80"],
    snakeDark: ["#9d174d", "#5b21b6", "#c2410c", "#0f766e", "#a16207", "#b91c1c", "#1d4ed8", "#15803d"],
  },
];

export const DEFAULT_BOARD_ID = BOARDS[0].id;

export function boardById(id: string): BoardDef {
  return BOARDS.find(b => b.id === id) ?? BOARDS[0];
}

const jumpCache = new Map<string, ReadonlyMap<number, number>>();

/** Every square on a board that sends you somewhere else, and where. */
export function jumpsOf(board: BoardDef): ReadonlyMap<number, number> {
  let m = jumpCache.get(board.id);
  if (!m) {
    m = new Map<number, number>([...board.ladders, ...board.snakes]);
    jumpCache.set(board.id, m);
  }
  return m;
}

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
