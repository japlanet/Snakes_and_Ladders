import { useCallback, useEffect, useRef, useState } from "react";
import { Board } from "@/components/Board";
import type { TokenView } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { PlayerCard } from "@/components/PlayerCard";
import { WinPopup } from "@/components/WinPopup";
import { ConfirmRestart } from "@/components/ConfirmRestart";
import { playTurn, rollDie } from "@/game/engine";
import type { GameState } from "@/game/types";
import { PLAYER_COLORS } from "@/game/players";
import { clearGame, storeGame } from "@/game/save";
import { audio } from "@/audio/engine";
import { useStoredFlag } from "@/hooks/useStoredFlag";

interface GamePageProps {
  initial: GameState;
  onMenu: () => void;
  onPlayAgain: () => void;
}

const ROLL_MS = 700;
const HOP_MS = 210;
const SLIDE_MS = 950;
const CPU_THINK_MS = 900;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function GamePage({ initial, onMenu, onPlayAgain }: GamePageProps) {
  // The settled game is the truth; the board below shows it catching up.
  const stateRef = useRef<GameState>(initial);
  const [state, setState] = useState<GameState>(initial);
  const [shown, setShown] = useState<number[]>(() => initial.players.map(p => p.pos));
  const [slideDuration, setSlideDuration] = useState(HOP_MS);
  const [sliding, setSliding] = useState(false);
  const [hopKeys, setHopKeys] = useState<number[]>(() => initial.players.map(() => 0));
  const [nope, setNope] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(initial.lastRoll ?? 6);
  const [showWin, setShowWin] = useState(initial.phase === "won");
  const [confirm, setConfirm] = useState(false);
  const [sfx, setSfx] = useStoredFlag("snakes-ladders-sfx", true);
  const [music, setMusic] = useStoredFlag("snakes-ladders-music", true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ---- sound ---------------------------------------------------------------

  useEffect(() => {
    audio.sfxEnabled = sfx;
  }, [sfx]);
  useEffect(() => {
    audio.setMusic(music);
  }, [music]);
  useEffect(() => {
    const onVis = () => audio.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      audio.stopMusic();
    };
  }, []);

  // ---- a turn --------------------------------------------------------------

  const takeTurn = useCallback(async () => {
    if (busyRef.current || stateRef.current.phase !== "roll") return;
    busyRef.current = true;
    setBusy(true);
    audio.unlock();

    const roll = rollDie();
    setRolling(true);
    audio.playRoll();
    await sleep(ROLL_MS);
    if (!alive.current) return;
    setRolling(false);
    setFace(roll);

    const result = playTurn(stateRef.current, roll);
    const idx = result.player;
    await sleep(380);
    if (!alive.current) return;

    if (result.steps.length === 0) {
      setNope(idx);
      audio.playNope();
      await sleep(650);
      if (!alive.current) return;
      setNope(null);
    }

    let hop = 0;
    for (const step of result.steps) {
      if (step.kind === "hop") {
        setSliding(false);
        setSlideDuration(HOP_MS);
        setShown(s => s.map((p, i) => (i === idx ? step.to : p)));
        setHopKeys(k => k.map((v, i) => (i === idx ? v + 1 : v)));
        audio.playHop(hop++);
        await sleep(HOP_MS + 40);
      } else {
        await sleep(320);
        if (!alive.current) return;
        setSliding(true);
        setSlideDuration(SLIDE_MS);
        if (step.kind === "ladder") audio.playLadder();
        else audio.playSnake();
        setShown(s => s.map((p, i) => (i === idx ? step.to : p)));
        await sleep(SLIDE_MS + 120);
        setSliding(false);
      }
      if (!alive.current) return;
    }

    stateRef.current = result.state;
    setState(result.state);
    if (result.state.phase === "won") clearGame();
    else storeGame(result.state);
    busyRef.current = false;
    setBusy(false);

    if (result.state.phase === "won") {
      await sleep(350);
      if (!alive.current) return;
      audio.playWin();
      setShowWin(true);
    } else if (result.state.players[result.state.turn].kind === "human") {
      audio.playYourTurn();
    }
  }, []);

  // Robo rolls by itself once the board has settled.
  const current = state.players[state.turn];
  const cpuTurn = state.phase === "roll" && current.kind === "cpu";
  useEffect(() => {
    if (!cpuTurn || busy) return;
    const t = setTimeout(() => void takeTurn(), CPU_THINK_MS);
    return () => clearTimeout(t);
  }, [cpuTurn, busy, state, takeTurn]);

  // ---- buttons -------------------------------------------------------------

  const handleRestart = () => {
    audio.playTick();
    setConfirm(false);
    onPlayAgain();
  };

  const humanReady = !busy && state.phase === "roll" && current.kind === "human";
  const activeColor = PLAYER_COLORS[state.turn % PLAYER_COLORS.length];

  const tokens: TokenView[] = state.players.map((p, i) => ({
    id: p.id,
    emoji: p.token,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    pos: shown[i],
    duration: slideDuration,
    sliding: sliding && i === state.turn,
    hopKey: hopKeys[i],
    nope: nope === i,
    active: humanReady && i === state.turn,
  }));

  return (
    <div className="screen game-bg">
      <div className="safe-top px-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              audio.playTick();
              onMenu();
            }}
            className="game-btn candy candy-sky rounded-full w-14 h-14 bg-gradient-to-b from-sky-300 to-blue-400 text-2xl"
            aria-label="Home"
          >
            🏠
          </button>
          <button
            onClick={() => {
              audio.playTick();
              setConfirm(true);
            }}
            className="game-btn candy candy-orange rounded-full w-14 h-14 bg-gradient-to-b from-orange-200 to-orange-400 text-2xl"
            aria-label="Start again"
          >
            🔄
          </button>
        </div>
        <div className="font-black text-emerald-800 text-lg truncate">
          {state.phase === "won" ? "🏆" : busy ? "…" : current.kind === "cpu" ? "Robo's go" : `${current.name}: tap the dice!`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSfx(v => !v)}
            className={`game-btn candy rounded-full w-14 h-14 text-2xl ${sfx ? "bg-gradient-to-b from-emerald-200 to-emerald-400" : "bg-gray-200"}`}
            aria-label={sfx ? "Sound effects on" : "Sound effects off"}
            aria-pressed={sfx}
          >
            {sfx ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => setMusic(v => !v)}
            className={`game-btn candy rounded-full w-14 h-14 text-2xl ${music ? "bg-gradient-to-b from-fuchsia-200 to-fuchsia-400" : "bg-gray-200"}`}
            aria-label={music ? "Music on" : "Music off"}
            aria-pressed={music}
          >
            {music ? "🎵" : "🎵̸"}
          </button>
        </div>
      </div>

      <div className="play-area">
        <div className="board-wrap">
          <Board tokens={tokens} />
        </div>
        <div className="side-panel">
          <PlayerCard
            player={state.players[0]}
            color={PLAYER_COLORS[0]}
            active={state.phase === "roll" && state.turn === 0}
            thinking={cpuTurn && state.turn === 0}
            winner={state.winner === 0}
            square={shown[0]}
          />
          <Dice face={face} rolling={rolling} ready={humanReady} disabled={!humanReady} color={activeColor} onRoll={() => void takeTurn()} />
          <PlayerCard
            player={state.players[1]}
            color={PLAYER_COLORS[1]}
            active={state.phase === "roll" && state.turn === 1}
            thinking={cpuTurn && state.turn === 1}
            winner={state.winner === 1}
            square={shown[1]}
          />
        </div>
      </div>

      {confirm && <ConfirmRestart onConfirm={handleRestart} onCancel={() => setConfirm(false)} />}
      {showWin && state.winner !== null && (
        <WinPopup
          winner={state.players[state.winner]}
          color={PLAYER_COLORS[state.winner % PLAYER_COLORS.length]}
          rolls={state.rolls}
          onPlayAgain={handleRestart}
          onHome={onMenu}
        />
      )}
    </div>
  );
}
