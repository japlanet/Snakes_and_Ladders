import { useEffect, useRef, useState } from "react";

interface ParentPanelProps {
  exactFinish: boolean;
  sixAgain: boolean;
  onToggleExact: () => void;
  onToggleSix: () => void;
  onErase: () => void;
  onClose: () => void;
}

const HOLD_MS = 2000;

function Toggle({ on, label, hint, onChange }: { on: boolean; label: string; hint: string; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-left"
      role="switch"
      aria-checked={on}
    >
      <div className="flex-1">
        <div className="font-black text-gray-800">{label}</div>
        <div className="text-xs font-semibold text-gray-500">{hint}</div>
      </div>
      <span className={`inline-block w-12 h-7 rounded-full relative transition-colors ${on ? "bg-green-500" : "bg-gray-400"}`} aria-hidden="true">
        <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 26 : 4 }} />
      </span>
    </button>
  );
}

/** Grown-up settings: the rule variants and a hold-to-erase button a child cannot trigger by accident. */
export function ParentPanel({ exactFinish, sixAgain, onToggleExact, onToggleSix, onErase, onClose }: ParentPanelProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const started = useRef(0);

  const stop = () => {
    if (timer.current !== null) cancelAnimationFrame(timer.current);
    timer.current = null;
    setHolding(false);
    setProgress(0);
  };

  const start = () => {
    started.current = performance.now();
    setHolding(true);
    const tick = () => {
      const p = Math.min(1, (performance.now() - started.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        stop();
        onErase();
        return;
      }
      timer.current = requestAnimationFrame(tick);
    };
    timer.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bounce-in modal-card rounded-3xl p-6 max-w-sm w-full border-4 border-gray-200" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black text-gray-800 mb-1">For grown-ups</h2>
        <p className="text-sm font-semibold text-gray-500 mb-4">Rule changes apply to the next new game.</p>
        <div className="flex flex-col gap-3">
          <Toggle on={sixAgain} label="A six rolls again" hint="Rolling a 6 earns another go." onChange={onToggleSix} />
          <Toggle
            on={exactFinish}
            label="Exact finish"
            hint="Must land right on 100. Off is easier: any roll past the end wins."
            onChange={onToggleExact}
          />
        </div>
        <div className="mt-5">
          <button
            type="button"
            className="relative w-full overflow-hidden rounded-2xl bg-rose-100 px-4 py-3 font-black text-rose-700"
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            aria-label="Hold for two seconds to erase the saved game and settings"
          >
            <span className="absolute inset-y-0 left-0 bg-rose-400/60" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
            <span className="relative">{holding ? "Keep holding…" : "Hold to erase everything"}</span>
          </button>
        </div>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl bg-gray-200 px-4 py-3 font-black text-gray-700">
          Close
        </button>
      </div>
    </div>
  );
}
