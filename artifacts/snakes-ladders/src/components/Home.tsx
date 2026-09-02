import { useState } from "react";
import { ParentPanel } from "./ParentPanel";
import type { GameState } from "@/game/types";

export type Mode = 1 | 2;

interface HomeProps {
  saved: GameState | null;
  onContinue: () => void;
  onPickMode: (mode: Mode) => void;
  exactFinish: boolean;
  sixAgain: boolean;
  onToggleExact: () => void;
  onToggleSix: () => void;
  onEraseAll: () => void;
}

export function Home({ saved, onContinue, onPickMode, exactFinish, sixAgain, onToggleExact, onToggleSix, onEraseAll }: HomeProps) {
  const [parents, setParents] = useState(false);

  return (
    <div className="screen game-bg">
      <div className="safe-top px-4 pb-2 text-center">
        <div className="text-6xl mb-1" role="img" aria-label="snake and ladder">
          <span className="wiggle-slow">🐍</span>
          <span className="bob">🪜</span>
        </div>
        <h1 className="title-candy text-5xl">Snakes &amp; Ladders</h1>
        <p className="text-base font-bold text-emerald-700 mt-1">Who wants to play?</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col items-center justify-center gap-5">
        {saved && (
          <button
            onClick={onContinue}
            className="game-btn candy candy-amber rounded-3xl px-6 py-3 bg-gradient-to-b from-amber-200 to-amber-300 flex items-center gap-3 max-w-3xl w-full justify-center"
            aria-label="Carry on with the game in progress"
          >
            <span className="text-4xl" role="img" aria-hidden="true">
              ▶️
            </span>
            <span className="text-3xl font-black text-amber-900">Carry on</span>
            <span className="text-3xl" role="img" aria-hidden="true">
              {saved.players.map(p => p.token).join("")}
            </span>
          </button>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl w-full">
          <button
            onClick={() => onPickMode(1)}
            className="game-btn candy candy-violet mode-card rounded-3xl p-6 bg-gradient-to-b from-violet-200 to-purple-300 flex flex-col items-center"
            aria-label="One player, against Robo"
          >
            <div className="text-7xl mb-2" role="img" aria-hidden="true">
              <span className="bob">🧒</span>
              <span className="text-4xl mx-1 align-middle">vs</span>
              <span className="bob" style={{ animationDelay: "0.4s" }}>
                🤖
              </span>
            </div>
            <div className="text-4xl font-black text-gray-800 drop-shadow-sm">1 player</div>
            <div className="text-lg font-bold text-gray-700 mt-1">Race Robo</div>
          </button>
          <button
            onClick={() => onPickMode(2)}
            className="game-btn candy candy-sky mode-card rounded-3xl p-6 bg-gradient-to-b from-sky-200 to-blue-300 flex flex-col items-center"
            aria-label="Two players"
          >
            <div className="text-7xl mb-2" role="img" aria-hidden="true">
              <span className="bob">🧒</span>
              <span className="bob" style={{ animationDelay: "0.4s" }}>
                👧
              </span>
            </div>
            <div className="text-4xl font-black text-gray-800 drop-shadow-sm">2 players</div>
            <div className="text-lg font-bold text-gray-700 mt-1">Race a friend</div>
          </button>
        </div>
      </div>

      <div className="safe-bottom px-4 pt-2 flex items-end justify-end">
        <button
          type="button"
          onClick={() => setParents(true)}
          className="text-xs font-semibold text-gray-500/70 underline-offset-2 hover:underline px-2 py-1"
          aria-label="Settings for grown-ups"
        >
          Parents
        </button>
      </div>
      {parents && (
        <ParentPanel
          exactFinish={exactFinish}
          sixAgain={sixAgain}
          onToggleExact={onToggleExact}
          onToggleSix={onToggleSix}
          onErase={onEraseAll}
          onClose={() => setParents(false)}
        />
      )}
    </div>
  );
}
