import { useState } from "react";
import type { Mode } from "./Home";
import type { PlayerSpec } from "@/game/engine";
import { PLAYER_COLORS, TOKENS, ROBO_TOKEN } from "@/game/players";

interface SetupProps {
  mode: Mode;
  onPlay: (players: PlayerSpec[]) => void;
  onBack: () => void;
}

function Row({
  label,
  color,
  picked,
  taken,
  onPick,
}: {
  label: string;
  color: string;
  picked: string;
  taken: string | null;
  onPick: (t: string) => void;
}) {
  return (
    <div className="w-full max-w-3xl rounded-3xl bg-white/70 p-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-4xl" role="img" aria-hidden="true">
          {picked}
        </span>
        <span className="text-2xl font-black" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 justify-center" role="radiogroup" aria-label={`${label} animal`}>
        {TOKENS.map(t => {
          const isTaken = t === taken;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === picked}
              disabled={isTaken}
              onClick={() => onPick(t)}
              className={`pick game-btn w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white text-4xl sm:text-5xl flex items-center justify-center shadow ${t === picked ? "is-picked" : ""} ${isTaken ? "is-taken" : ""}`}
              style={{ ["--player" as string]: color }}
              aria-label={`animal ${t}`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pick an animal for each player, then play. */
export function Setup({ mode, onPlay, onBack }: SetupProps) {
  const [first, setFirst] = useState<string>(TOKENS[0]);
  const [second, setSecond] = useState<string>(TOKENS[1]);

  const play = () => {
    const players: PlayerSpec[] =
      mode === 1
        ? [
            { name: "You", token: first, kind: "human" },
            { name: "Robo", token: ROBO_TOKEN, kind: "cpu" },
          ]
        : [
            { name: "Player 1", token: first, kind: "human" },
            { name: "Player 2", token: second, kind: "human" },
          ];
    onPlay(players);
  };

  return (
    <div className="screen game-bg">
      <div className="safe-top px-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="game-btn candy candy-sky rounded-full w-14 h-14 bg-gradient-to-b from-sky-300 to-blue-400 text-3xl" aria-label="Back">
          ↩️
        </button>
        <h1 className="title-candy text-4xl flex-1 text-center">Pick your animal</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col items-center justify-center gap-4">
        <Row label={mode === 1 ? "You" : "Player 1"} color={PLAYER_COLORS[0]} picked={first} taken={mode === 2 ? second : null} onPick={setFirst} />
        {mode === 2 ? (
          <Row label="Player 2" color={PLAYER_COLORS[1]} picked={second} taken={first} onPick={setSecond} />
        ) : (
          <div className="w-full max-w-3xl rounded-3xl bg-white/50 p-4 flex items-center gap-3">
            <span className="text-5xl bob" role="img" aria-hidden="true">
              {ROBO_TOKEN}
            </span>
            <span className="text-2xl font-black" style={{ color: PLAYER_COLORS[1] }}>
              Robo is ready!
            </span>
          </div>
        )}
      </div>

      <div className="safe-bottom px-4 pt-2 flex justify-center">
        <button
          onClick={play}
          className="game-btn candy candy-emerald rounded-3xl px-10 py-4 bg-gradient-to-b from-green-300 to-emerald-500 text-white font-black text-4xl flex items-center gap-3"
          aria-label="Play"
        >
          <span>▶️</span>
          <span>Play!</span>
        </button>
      </div>
    </div>
  );
}
