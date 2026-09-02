# Snakes and Ladders Fun 🐍🪜

Snakes and Ladders for an iPad, for one child racing the computer ("Robo") or two children
sharing the screen. Little reading needed: the animals, the dice and the board do the talking.

- **1 player** races Robo 🤖, who rolls by itself after a short think. **2 players** take turns
  tapping the same dice. Each player picks an animal on the way in.
- The board is the classic 10 by 10 with eight ladders and eight snakes. Tokens hop one square
  at a time with a boing per hop, then climb (bright arpeggio) or slide (hiss) when they land on
  a ladder foot or a snake head.
- Rules, set from the small "Parents" link on the home screen: **a six rolls again** (on by
  default) and **exact finish** (off by default, so any roll past 100 wins; on means an
  overshooting roll is lost, the way grown-ups play).
- A game in progress is saved, so Home, a refresh, or the iPad dropping the tab in the
  background all come back to the same board via the ▶️ Carry on button.
- All sound is synthesised in the browser (`src/audio/engine.ts`): dice rattle, hops, ladder,
  snake, a fanfare for the winner, and a bouncy background tune. Effects and music have
  separate toggles on the play screen.
- The 🔄 button starts again after a picture-only yes/no. The Parents panel has a hold-for-two-
  seconds button that erases the saved game and settings, so a child cannot do it by accident.
- Installs to the iPad Home Screen with a proper icon and plays offline after the first visit
  (`public/manifest.webmanifest`, `public/sw.js`).

## Layout

Same pnpm workspace shape as Cake-Sort-Fun and Tile-Match-Fun. The game lives in
`artifacts/snakes-ladders`.

| Path | What |
| --- | --- |
| `src/game/board.ts` | The board: numbering, where the ladders and snakes are, square centres for drawing. |
| `src/game/engine.ts` | The rules: rolling, moving, jumps, winning, the rule variants. Pure functions. |
| `src/game/engine.test.ts` | Unit tests, including a 300-game random-play check under every rule mix. |
| `src/game/save.ts` | Saving and validating a game in progress. |
| `src/pages/Game.tsx` | The play screen: animates each turn step by step, drives Robo. |
| `src/components/Board.tsx` | Draws the grid, snakes and ladders as SVG, and the animal tokens over it. |
| `src/components/geometry.ts` | Wavy snake bodies and ladder rails as SVG paths. |
| `src/components/` | Dice, player cards, home and animal-picker screens, popups. |
| `src/audio/engine.ts` | Synthesised sound effects and the background tune. |

## Commands

```bash
pnpm install
pnpm --filter @workspace/snakes-ladders run test        # rules tests (node --test, no extra deps)
pnpm --filter @workspace/snakes-ladders run typecheck
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/snakes-ladders run dev
pnpm run build                                          # typecheck + tests + vite build
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`. `BASE_PATH` in
that file must match the repository name (`/Snakes_and_Ladders/` by default). In the repository
settings, set Pages to deploy from GitHub Actions. Then open the Pages URL in Safari on the
iPad, tap Share, and "Add to Home Screen".
