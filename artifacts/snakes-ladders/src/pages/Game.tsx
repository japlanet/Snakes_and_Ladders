import { useCallback, useEffect, useRef, useState } from "react";
import { Board } from "@/components/Board";
import type { TokenView } from "@/components/Board";
import { Dice } from "@/components/Dice";
import { PlayerCard } from "@/components/PlayerCard";
import { WinPopup } from "@/components/WinPopup";
import { ConfirmRestart } from "@/components/ConfirmRestart";
import { playTurn, rollDie } from "@/game/engine";
import { boardById } from "@/game/board";
import type { GameState, Step, TurnResult } from "@/game/types";
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
/** Wrong taps before the next square starts to pulse. */
const HINT_AFTER = 2;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** A move waiting for the player to count it out by tapping squares. */
interface Counting {
  result: TurnResult;
  /** Index into result.steps of the next hop to make. */
  next: number;
  wrong: number;
}

export function GamePage({ initial, onMenu, onPlayAgain }: GamePageProps) {
  const board = boardById(initial.boardId);
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
  const [counting, setCounting] = useState<Counting | null>(null);
  const countingRef = useRef<Counting | null>(null);
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

  // ---- showing a move ------------------------------------------------------

  const hopTo = useCallback((idx: number, square: number, hopIndex: number) => {
    setSliding(false);
    setSlideDuration(HOP_MS);
    setShown(s => s.map((p, i) => (i === idx ? square : p)));
    setHopKeys(k => k.map((v, i) => (i === idx ? v + 1 : v)));
    audio.playHop(hopIndex);
  }, []);

  /** Plays steps[from..] on the board. Resolves false if the page went away. */
  const animate = useCallback(
    async (idx: number, steps: Step[], from = 0): Promise<boolean> => {
      for (let k = from; k < steps.length; k++) {
        const step = steps[k];
        if (step.kind === "hop") {
          hopTo(idx, step.to, k);
          await sleep(HOP_MS + 40);
        } else {
          await sleep(320);
          if (!alive.current) return false;
          setSliding(true);
          setSlideDuration(SLIDE_MS);
          if (step.kind === "ladder") audio.playLadder();
          else audio.playSnake();
          setShown(s => s.map((p, i) => (i === idx ? step.to : p)));
          await sleep(SLIDE_MS + 120);
          setSliding(false);
        }
        if (!alive.current) return false;
      }
      return true;
    },
    [hopTo],
  );

  /** The move is over: make it official, save, and hand over. */
  const commit = useCallback(async (result: TurnResult) => {
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

    const before = stateRef.current;
    const result = playTurn(before, roll);
    const idx = result.player;
    await sleep(380);
    if (!alive.current) return;

    if (result.steps.length === 0) {
      setNope(idx);
      audio.playNope();
      await sleep(650);
      if (!alive.current) return;
      setNope(null);
      await commit(result);
      return;
    }

    if (before.manual && before.players[idx].kind === "human") {
      // Count-and-move: the player taps the squares; see handleSquareTap.
      const c: Counting = { result, next: 0, wrong: 0 };
      countingRef.current = c;
      setCounting(c);
      return;
    }

    if (!(await animate(idx, result.steps))) return;
    await commit(result);
  }, [animate, commit]);

  const handleSquareTap = useCallback(
    async (square: number) => {
      const c = countingRef.current;
      if (!c) return;
      const step = c.result.steps[c.next];
      if (!step || step.kind !== "hop") return;
      const idx = c.result.player;
      const hops = c.result.steps.filter(s => s.kind === "hop");
      const landing = hops[hops.length - 1].to;
      if (square === landing && square !== step.to) {
        // Counted in their head and tapped where the roll lands: the piece hops the rest of the way itself.
        countingRef.current = null;
        setCounting(null);
        if (!(await animate(idx, c.result.steps, c.next))) return;
        await commit(c.result);
        return;
      }
      if (square !== step.to) {
        const wrong = { ...c, wrong: c.wrong + 1 };
        countingRef.current = wrong;
        setCounting(wrong);
        setNope(idx);
        audio.playNope();
        await sleep(450);
        if (!alive.current) return;
        setNope(null);
        return;
      }
      hopTo(idx, step.to, c.next);
      const after = c.next + 1;
      const nextStep = c.result.steps[after];
      if (nextStep && nextStep.kind === "hop") {
        const more = { ...c, next: after };
        countingRef.current = more;
        setCounting(more);
        return;
      }
      // Counted all the way: any ladder or snake plays by itself.
      countingRef.current = null;
      setCounting(null);
      if (!(await animate(idx, c.result.steps, after))) return;
      await commit(c.result);
    },
    [animate, commit, hopTo],
  );

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
  const hopsLeft = counting ? counting.result.steps.filter(s => s.kind === "hop").length - counting.next : 0;
  const nextSquare = counting ? counting.result.steps[counting.next]?.to ?? null : null;
  const hint = counting && counting.wrong >= HINT_AFTER ? nextSquare : null;

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

  let status: string;
  if (state.phase === "won") status = "🏆";
  else if (counting) status = `${current.name}: count ${counting.result.roll}! ${hopsLeft} to go`;
  else if (busy) status = "…";
  else if (current.kind === "cpu") status = "Robo's go";
  else status = `${current.name}: tap the dice!`;

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
        <div className="font-black text-emerald-800 text-lg truncate" role="status">
          {status}
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
          <Board
            board={board}
            tokens={tokens}
            onSquareTap={counting ? handleSquareTap : undefined}
            hint={hint}
            hintColor={activeColor}
          />
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
          <div className="relative">
            <Dice face={face} rolling={rolling} ready={humanReady} disabled={!humanReady} color={activeColor} onRoll={() => void takeTurn()} />
            {counting && (
              <div className="count-badge bounce-in" style={{ background: activeColor }} aria-label={`${hopsLeft} squares to go`}>
                <span aria-hidden="true">👆</span>
                <span key={hopsLeft} className="count-number">
                  {hopsLeft}
                </span>
              </div>
            )}
          </div>
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
