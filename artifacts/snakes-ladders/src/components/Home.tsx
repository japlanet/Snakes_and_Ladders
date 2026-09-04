import { useState } from "react";
import { ParentPanel } from "./ParentPanel";
import type { GameState } from "@/game/types";

export type Mode = 1 | 2;

interface HomeProps {
  saved: GameState | null;
  onContinue: () => void;
  onPickMode: (mode: Mode) => void;
  manual: boolean;
  onToggleManual: () => void;
  exactFinish: boolean;
  onToggleExact: () => void;
  onEraseAll: () => void;
}

export function Home({ saved, onContinue, onPickMode, manual, onToggleManual, exactFinish, onToggleExact, onEraseAll }: HomeProps) {
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

      <div className="safe-bottom px-4 pt-2 flex items-end justify-center relative">
        <button
          type="button"
          onClick={() => setParents(true)}
          className="absolute right-4 bottom-4 text-xs font-semibold text-gray-500/70 underline-offset-2 hover:underline px-2 py-1"
          aria-label="Settings for grown-ups"
        >
          Parents
        </button>
        <button
          onClick={onToggleManual}
          className={`game-btn candy flex items-center gap-3 px-5 py-3 rounded-full font-black text-lg ${
            manual ? "bg-gradient-to-b from-amber-200 to-amber-300 candy-amber text-amber-900" : "bg-gradient-to-b from-emerald-100 to-emerald-200 candy-emerald text-emerald-900"
          }`}
          aria-label={manual ? "You count and move your own piece. Tap to let pieces move by themselves." : "Pieces move by themselves. Tap to count and move your own piece."}
          aria-pressed={manual}
        >
          <span className="text-3xl" role="img" aria-hidden="true">
            {manual ? "👆" : "✨"}
          </span>
          <span>{manual ? "I move my piece" : "Pieces move themselves"}</span>
          <span className={`inline-block w-12 h-7 rounded-full relative transition-colors ${manual ? "bg-green-500" : "bg-gray-400"}`} aria-hidden="true">
            <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: manual ? 26 : 4 }} />
          </span>
        </button>
      </div>
      {parents && <ParentPanel exactFinish={exactFinish} onToggleExact={onToggleExact} onErase={onEraseAll} onClose={() => setParents(false)} />}
    </div>
  );
}
