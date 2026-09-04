import { useCallback, useState } from "react";
import { Home } from "./components/Home";
import type { Mode } from "./components/Home";
import { Setup } from "./components/Setup";
import { GamePage } from "./pages/Game";
import { newGame } from "./game/engine";
import type { PlayerSpec } from "./game/engine";
import type { GameState } from "./game/types";
import { DEFAULT_BOARD_ID, boardById } from "./game/board";
import { clearGame, eraseAllProgress, loadGame, storeGame } from "./game/save";
import { useStoredFlag } from "./hooks/useStoredFlag";
import { audio } from "./audio/engine";

type Screen = { name: "home" } | { name: "setup"; mode: Mode } | { name: "game"; state: GameState; run: number };

const BOARD_KEY = "snakes-ladders-board";

function readBoard(): string {
  try {
    return boardById(localStorage.getItem(BOARD_KEY) ?? DEFAULT_BOARD_ID).id;
  } catch {
    return DEFAULT_BOARD_ID;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [exactFinish, setExactFinish] = useStoredFlag("snakes-ladders-exact", false);
  const [manual, setManual] = useStoredFlag("snakes-ladders-manual", false);
  const [boardId, setBoardId] = useState<string>(readBoard);
  const [run, setRun] = useState(0);

  const startGame = useCallback(
    (specs: PlayerSpec[], board: string) => {
      const state = newGame(specs, { rules: { exactFinish }, boardId: board, manual });
      storeGame(state);
      setRun(r => r + 1);
      setScreen({ name: "game", state, run: run + 1 });
    },
    [exactFinish, manual, run],
  );

  const handlePlay = useCallback(
    (specs: PlayerSpec[], board: string) => {
      audio.unlock();
      setBoardId(board);
      try {
        localStorage.setItem(BOARD_KEY, board);
      } catch {}
      startGame(specs, board);
    },
    [startGame],
  );

  const handleContinue = useCallback(() => {
    audio.unlock();
    const saved = loadGame();
    if (saved) setScreen({ name: "game", state: saved, run: run + 1 });
  }, [run]);

  const handleMenu = useCallback(() => setScreen({ name: "home" }), []);

  const handleEraseAll = useCallback(() => {
    eraseAllProgress();
    window.location.reload();
  }, []);

  if (screen.name === "game") {
    const specs: PlayerSpec[] = screen.state.players.map(p => ({ name: p.name, token: p.token, kind: p.kind }));
    return (
      <GamePage
        key={screen.run}
        initial={screen.state}
        onMenu={handleMenu}
        onPlayAgain={() => {
          clearGame();
          startGame(specs, screen.state.boardId);
        }}
      />
    );
  }

  if (screen.name === "setup") {
    return <Setup mode={screen.mode} boardId={boardId} onPlay={handlePlay} onBack={handleMenu} />;
  }

  return (
    <Home
      saved={loadGame()}
      onContinue={handleContinue}
      onPickMode={mode => {
        audio.unlock();
        setScreen({ name: "setup", mode });
      }}
      manual={manual}
      onToggleManual={() => setManual(v => !v)}
      exactFinish={exactFinish}
      onToggleExact={() => setExactFinish(v => !v)}
      onEraseAll={handleEraseAll}
    />
  );
}
