import type { Player } from "@/game/types";
import { Confetti } from "./Confetti";

interface WinPopupProps {
  winner: Player;
  color: string;
  rolls: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function WinPopup({ winner, color, rolls, onPlayAgain, onHome }: WinPopupProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4">
      <Confetti />
      <div className="bounce-in modal-card rounded-3xl p-8 max-w-sm w-full text-center border-4" style={{ borderColor: color }}>
        <div className="text-8xl mb-1 bob" role="img" aria-label="trophy">
          🏆
        </div>
        <div className="text-7xl mb-2" role="img" aria-label={winner.name}>
          {winner.token}
        </div>
        <h2 className="title-candy text-4xl mb-1">{winner.name === "You" ? "You win!" : `${winner.name} wins!`}</h2>
        <p className="text-sm font-bold text-gray-500 mb-6">{rolls} rolls</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onHome}
            className="game-btn candy candy-sky flex-1 py-4 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-400 text-white font-black text-3xl"
            aria-label="Back to the start screen"
          >
            🏠
          </button>
          <button
            onClick={onPlayAgain}
            className="game-btn candy candy-emerald flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-3xl"
            aria-label="Play again"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  );
}
