import { memo } from "react";
import { BOARD_H, BOARD_W, COLS, LADDERS, LAST, ROWS, SNAKES, START_PAD, cellOf, centerOf } from "@/game/board";
import { ladderShape, snakeShape } from "./geometry";

const ROW_COLORS = ["#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#a5f3fc", "#bfdbfe", "#ddd6fe", "#fbcfe8", "#fecaca", "#fed7aa"];
const SNAKE_COLORS = ["#22c55e", "#a855f7", "#f97316", "#0ea5e9", "#14b8a6", "#ec4899", "#eab308", "#ef4444"];
const SNAKE_DARK = ["#166534", "#581c87", "#9a3412", "#075985", "#134e4a", "#9d174d", "#854d0e", "#991b1b"];

/** The grid, the ladders and the snakes. Static, so it only ever renders once. */
export const BoardArt = memo(function BoardArt() {
  const cells = [];
  for (let n = 1; n <= LAST; n++) {
    const { col, row } = cellOf(n);
    const x = col;
    const y = ROWS - 1 - row;
    const light = (row + col) % 2 === 0;
    cells.push(
      <g key={n}>
        <rect x={x} y={y} width={1} height={1} fill={ROW_COLORS[row]} opacity={light ? 0.55 : 1} />
        {n === LAST ? (
          <text x={x + 0.5} y={y + 0.72} fontSize={0.62} textAnchor="middle">
            ⭐
          </text>
        ) : (
          <text x={x + 0.09} y={y + 0.34} fontSize={0.27} fontWeight={800} fill="#1f2937" opacity={0.55}>
            {n}
          </text>
        )}
      </g>,
    );
  }

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} aria-hidden="true">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.03" dy="0.06" stdDeviation="0.04" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#fffdf7" />
      {cells}
      {/* grid lines */}
      <g stroke="#ffffff" strokeWidth={0.04} opacity={0.9}>
        {Array.from({ length: COLS + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i} y1={0} x2={i} y2={ROWS} />
        ))}
        {Array.from({ length: ROWS + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i} x2={COLS} y2={i} />
        ))}
      </g>
      {/* start pad */}
      <rect x={0.15} y={ROWS + 0.12} width={2.75} height={START_PAD - 0.24} rx={0.3} fill="#dcfce7" stroke="#86efac" strokeWidth={0.05} />
      <text x={0.5} y={ROWS + 0.62} fontSize={0.4} textAnchor="middle">
        🚩
      </text>
      <text x={6.4} y={ROWS + 0.63} fontSize={0.36} fontWeight={900} fill="#15803d" textAnchor="middle" opacity={0.75}>
        Roll the dice and race to the star!
      </text>

      {/* ladders */}
      {LADDERS.map(([bottom, top]) => {
        const shape = ladderShape(centerOf(bottom), centerOf(top));
        return (
          <g key={`l${bottom}`} filter="url(#shadow)" strokeLinecap="round">
            {shape.rails.map((r, i) => (
              <line key={i} {...r} stroke="#b45309" strokeWidth={0.11} />
            ))}
            {shape.rungs.map((r, i) => (
              <line key={i} {...r} stroke="#f59e0b" strokeWidth={0.09} />
            ))}
          </g>
        );
      })}

      {/* snakes */}
      {SNAKES.map(([head, tail], i) => {
        const s = snakeShape(centerOf(head), centerOf(tail), i);
        const color = SNAKE_COLORS[i % SNAKE_COLORS.length];
        const dark = SNAKE_DARK[i % SNAKE_DARK.length];
        const h = s.head;
        const eye = (side: number) => ({
          cx: h.x + s.facing.x * 0.06 + s.across.x * side * 0.14,
          cy: h.y + s.facing.y * 0.06 + s.across.y * side * 0.14,
        });
        const tongue = {
          x1: h.x + s.facing.x * 0.3,
          y1: h.y + s.facing.y * 0.3,
          x2: h.x + s.facing.x * 0.55,
          y2: h.y + s.facing.y * 0.55,
        };
        return (
          <g key={`s${head}`} filter="url(#shadow)">
            <path d={s.path} fill="none" stroke={dark} strokeWidth={0.4} strokeLinecap="round" />
            <path d={s.path} fill="none" stroke={color} strokeWidth={0.3} strokeLinecap="round" />
            <path d={s.path} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.11} strokeLinecap="round" strokeDasharray="0.1 0.32" />
            <line {...tongue} stroke="#ef4444" strokeWidth={0.06} strokeLinecap="round" />
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
  tokens: TokenView[];
}

const TOKEN_SIZE = 0.66;

export function Board({ tokens }: BoardProps) {
  return (
    <div className="board">
      <BoardArt />
      {tokens.map((t, i) => {
        const c = centerOf(t.pos);
        // Two tokens on one square sit side by side instead of on top of each other.
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
