import { memo } from "react";
import { BOARD_H, BOARD_W, COLS, LAST, ROWS, START_PAD, cellOf, centerOf } from "@/game/board";
import type { BoardDef } from "@/game/board";
import { ladderShape, snakeShape } from "./geometry";

interface BoardArtProps {
  board: BoardDef;
}

/**
 * The grid, the ladders and the snakes. Plain shapes only: no SVG filters,
 * because Safari on the iPad sometimes drops filtered groups entirely, which
 * made whole snakes and heads vanish. Shadows are offset dark copies instead.
 */
export const BoardArt = memo(function BoardArt({ board }: BoardArtProps) {
  const cells = [];
  for (let n = 1; n <= LAST; n++) {
    const { col, row } = cellOf(n);
    const x = col;
    const y = ROWS - 1 - row;
    const light = (row + col) % 2 === 0;
    cells.push(
      <g key={n}>
        <rect x={x} y={y} width={1} height={1} fill={board.rows[row]} opacity={light ? 0.6 : 1} />
        {n === LAST ? (
          <text x={x + 0.5} y={y + 0.72} fontSize={0.62} textAnchor="middle">
            {board.goal}
          </text>
        ) : (
          <text x={x + 0.09} y={y + 0.34} fontSize={0.27} fontWeight={800} fill={board.number} opacity={0.7}>
            {n}
          </text>
        )}
      </g>,
    );
  }

  const snakes = board.snakes.map(([head, tail], i) => ({
    head,
    shape: snakeShape(centerOf(head), centerOf(tail), i),
    color: board.snakeColors[i % board.snakeColors.length],
    dark: board.snakeDark[i % board.snakeDark.length],
  }));

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill={board.paper} />
      {cells}
      <g stroke={board.grid} strokeWidth={0.04}>
        {Array.from({ length: COLS + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i} y1={0} x2={i} y2={ROWS} />
        ))}
        {Array.from({ length: ROWS + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i} x2={COLS} y2={i} />
        ))}
      </g>
      {/* start pad */}
      <rect x={0.15} y={ROWS + 0.12} width={2.75} height={START_PAD - 0.24} rx={0.3} fill={board.pad} stroke={board.padStroke} strokeWidth={0.05} />
      <text x={0.5} y={ROWS + 0.62} fontSize={0.4} textAnchor="middle">
        🚩
      </text>
      <text x={6.4} y={ROWS + 0.63} fontSize={0.36} fontWeight={900} fill={board.text} textAnchor="middle" opacity={0.85}>
        Roll the dice and race to the {board.goal}!
      </text>

      {/* ladders */}
      {board.ladders.map(([bottom, top]) => {
        const shape = ladderShape(centerOf(bottom), centerOf(top));
        return (
          <g key={`l${bottom}`} strokeLinecap="round">
            {shape.rails.map((r, i) => (
              <line key={`sh${i}`} x1={r.x1 + 0.04} y1={r.y1 + 0.07} x2={r.x2 + 0.04} y2={r.y2 + 0.07} stroke="rgba(0,0,0,0.25)" strokeWidth={0.13} />
            ))}
            {shape.rails.map((r, i) => (
              <line key={i} {...r} stroke={board.rail} strokeWidth={0.11} />
            ))}
            {shape.rungs.map((r, i) => (
              <line key={i} {...r} stroke={board.rung} strokeWidth={0.09} />
            ))}
          </g>
        );
      })}

      {/* snake bodies first, then every head on top, so no body can hide a head */}
      {snakes.map(({ head, shape, color, dark }) => (
        <g key={`body${head}`} strokeLinecap="round" fill="none">
          <path d={shape.path} stroke="rgba(0,0,0,0.25)" strokeWidth={0.42} transform="translate(0.04 0.08)" />
          <path d={shape.path} stroke={dark} strokeWidth={0.4} />
          <path d={shape.path} stroke={color} strokeWidth={0.3} />
          <path d={shape.path} stroke="rgba(255,255,255,0.5)" strokeWidth={0.11} strokeDasharray="0.1 0.32" />
        </g>
      ))}
      {snakes.map(({ head, shape, color, dark }) => {
        const h = shape.head;
        const eye = (side: number) => ({
          cx: h.x + shape.facing.x * 0.06 + shape.across.x * side * 0.14,
          cy: h.y + shape.facing.y * 0.06 + shape.across.y * side * 0.14,
        });
        const tongue = {
          x1: h.x + shape.facing.x * 0.3,
          y1: h.y + shape.facing.y * 0.3,
          x2: h.x + shape.facing.x * 0.55,
          y2: h.y + shape.facing.y * 0.55,
        };
        return (
          <g key={`head${head}`}>
            <line {...tongue} stroke="#ef4444" strokeWidth={0.06} strokeLinecap="round" />
            <circle cx={h.x + 0.04} cy={h.y + 0.08} r={0.34} fill="rgba(0,0,0,0.25)" />
            <circle cx={h.x} cy={h.y} r={0.33} fill={color} stroke={dark} strokeWidth={0.07} />
            <circle {...eye(1)} r={0.09} fill="#fff" />
            <circle {...eye(-1)} r={0.09} fill="#fff" />
            <circle {...eye(1)} r={0.045} fill="#111" />
            <circle {...eye(-1)} r={0.045} fill="#111" />
          </g>
        );
      })}
    </svg>
  );
});

export interface TokenView {
  id: number;
  emoji: string;
  color: string;
  pos: number;
  /** ms for the slide to the current position. */
  duration: number;
  sliding: boolean;
  /** Bump this to replay the hop bounce. */
  hopKey: number;
  nope: boolean;
  /** Gently bob while waiting for this player to roll. */
  active: boolean;
}

interface BoardProps {
  board: BoardDef;
  tokens: TokenView[];
  /** When set, squares can be tapped (count-and-move mode). */
  onSquareTap?: (square: number) => void;
  /** Square to pulse as a hint for the next tap. */
  hint?: number | null;
  /** Colour of the hint ring. */
  hintColor?: string;
}

const TOKEN_SIZE = 0.66;

function squareStyle(square: number) {
  const { col, row } = cellOf(square);
  return {
    left: `${(col / BOARD_W) * 100}%`,
    top: `${((ROWS - 1 - row) / BOARD_H) * 100}%`,
    width: `${(1 / BOARD_W) * 100}%`,
    height: `${(1 / BOARD_H) * 100}%`,
  };
}

export function Board({ board, tokens, onSquareTap, hint, hintColor }: BoardProps) {
  return (
    <div className="board" style={{ background: board.paper }}>
      <BoardArt board={board} />
      {onSquareTap && (
        <div className="tap-layer" aria-label="Tap the next square">
          {Array.from({ length: LAST }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              className={`tap-square ${hint === n ? "is-hint" : ""}`}
              style={{ ...squareStyle(n), ["--player" as string]: hintColor ?? "#fbbf24" }}
              onClick={() => onSquareTap(n)}
              aria-label={`square ${n}`}
            />
          ))}
        </div>
      )}
      {tokens.map((t, i) => {
        const c = centerOf(t.pos);
        // Two tokens on one square sit offset instead of on top of each other.
        const ox = (i - (tokens.length - 1) / 2) * 0.3;
        const oy = (i - (tokens.length - 1) / 2) * 0.24;
        const left = ((c.x + ox - TOKEN_SIZE / 2) / BOARD_W) * 100;
        const top = ((c.y + oy - TOKEN_SIZE / 2) / BOARD_H) * 100;
        return (
          <div
            key={t.id}
            className={`token ${t.sliding ? "is-sliding" : ""}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${(TOKEN_SIZE / BOARD_W) * 100}%`,
              height: `${(TOKEN_SIZE / BOARD_H) * 100}%`,
              transitionDuration: `${t.duration}ms`,
              ["--player" as string]: t.color,
            }}
          >
            <div
              key={t.hopKey}
              className={`token-face ${t.nope ? "token-nope" : t.hopKey > 0 ? "token-hop" : ""} ${t.active && !t.nope ? "token-idle-active" : ""}`}
              style={{ fontSize: "min(4.2cqw, 3.9cqh)" }}
            >
              {t.emoji}
            </div>
          </div>
        );
      })}
    </div>
  );
}
