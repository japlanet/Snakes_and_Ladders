import type { Player } from "@/game/types";

interface PlayerCardProps {
  player: Player;
  color: string;
  active: boolean;
  thinking: boolean;
  winner: boolean;
  /** The square the token is currently shown on. */
  square: number;
}

export function PlayerCard({ player, color, active, thinking, winner, square }: PlayerCardProps) {
  return (
    <div
      className={`player-card flex items-center gap-3 px-4 py-2 min-w-0 ${active ? "is-active" : ""} ${winner ? "is-winner" : ""}`}
      style={{ ["--player" as string]: color }}
      aria-label={`${player.name}, on square ${square}${active ? ", their turn" : ""}`}
    >
      <div className="text-5xl leading-none" role="img" aria-hidden="true">
        {winner ? "🏆" : player.token}
      </div>
      <div className="min-w-0">
        <div className="font-black text-lg truncate" style={{ color }}>
          {player.name}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-full bg-white px-3 py-0.5 font-black text-2xl text-gray-800 shadow-inner">{square}</span>
          {thinking && (
            <span className="flex gap-1" style={{ color }} aria-label="thinking">
              <span className="thinking-dot" style={{ animationDelay: "0s" }} />
              <span className="thinking-dot" style={{ animationDelay: "0.15s" }} />
              <span className="thinking-dot" style={{ animationDelay: "0.3s" }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
