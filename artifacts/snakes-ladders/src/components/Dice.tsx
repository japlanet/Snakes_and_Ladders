import { useEffect, useState } from "react";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface DiceProps {
  face: number;
  rolling: boolean;
  /** It is a person's turn and nothing is moving. */
  ready: boolean;
  disabled: boolean;
  color: string;
  onRoll: () => void;
}

export function Dice({ face, rolling, ready, disabled, color, onRoll }: DiceProps) {
  const [shown, setShown] = useState(face);

  useEffect(() => {
    if (!rolling) {
      setShown(face);
      return;
    }
    const timer = setInterval(() => setShown(1 + Math.floor(Math.random() * 6)), 75);
    return () => clearInterval(timer);
  }, [rolling, face]);

  const on = new Set(PIPS[shown] ?? PIPS[1]);
  return (
    <button
      type="button"
      className={`dice candy game-btn ${rolling ? "is-rolling" : ready ? "is-ready" : ""}`}
      style={{ boxShadow: ready ? `0 0 0 6px ${color}55, 0 8px 0 rgba(0,0,0,0.15), 0 12px 20px rgba(0,0,0,0.2)` : undefined }}
      onClick={onRoll}
      disabled={disabled}
      aria-label={ready ? "Roll the dice" : `Dice showing ${face}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`pip ${on.has(i) ? "on" : ""}`} />
      ))}
    </button>
  );
}
