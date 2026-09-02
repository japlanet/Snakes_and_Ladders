import { useCallback, useState } from "react";
import { Home } from "./components/Home";
import type { Mode } from "./components/Home";
import { Setup } from "./components/Setup";
import { GamePage } from "./pages/Game";
import { newGame } from "./game/engine";
import type { PlayerSpec } from "./game/engine";
import type { GameState } from "./game/types";
import { clearGame, eraseAllProgress, loadGame, storeGame } from "./game/save";
import { useStoredFlag } from "./hooks/useStoredFlag";
import { audio } from "./audio/engine";

type Screen = { name: "home" } | { name: "setup"; mode: Mode } | { name: "game"; state: GameState; run: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [exactFinish, setExactFinish] = useStoredFlag("snakes-ladders-exact", false);
  const [sixAgain, setSixAgain] = useStoredFlag("snakes-ladders-six", true);
  const [run, setRun] = useState(0);

  const startGame = useCallback(
    (specs: PlayerSpec[]) => {
      const state = newGame(specs, { exactFinish, sixAgain });
      storeGame(state);
      setRun(r => r + 1);
      setScreen({ name: "game", state, run: run + 1 });
    },
    [exactFinish, sixAgain, run],
  );

  const handlePlay = useCallback(
    (specs: PlayerSpec[]) => {
      audio.unlock();
      startGame(specs);
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
          startGame(specs);
        }}
      />
    );
  }

  if (screen.name === "setup") {
    return <Setup mode={screen.mode} onPlay={handlePlay} onBack={handleMenu} />;
  }

  return (
    <Home
      saved={loadGame()}
      onContinue={handleContinue}
      onPickMode={mode => {
        audio.unlock();
        setScreen({ name: "setup", mode });
      }}
      exactFinish={exactFinish}
      sixAgain={sixAgain}
      onToggleExact={() => setExactFinish(v => !v)}
      onToggleSix={() => setSixAgain(v => !v)}
      onEraseAll={handleEraseAll}
    />
  );
}
