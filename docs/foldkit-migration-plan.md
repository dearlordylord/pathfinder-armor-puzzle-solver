# Full React-to-Foldkit migration plan

Prepared: 2026-08-12

Target release: `foldkit@0.142.1` (`foldkit@0.142.1` tag, commit `b2cf4e3359f2895c69f49aa286ce5584268d2398`)

Supporting research: [Foldkit migration research](./foldkit-research.md)

## Outcome

Replace the frontend's React runtime and mutable observer store with one native Foldkit application. The finished frontend has:

- no React, React DOM, JSX/TSX, React hooks, React Vite plugin, React types, or React lint plugins;
- one Effect Schema-backed immutable Model;
- one exhaustive, pure update function receiving typed Messages;
- pure Foldkit view functions for the app, board, controls, and solution display;
- a browser-only Foldkit runtime entry point;
- Foldkit Story tests for state transitions and Scene tests for visible user flows;
- the existing solver retained as a pure domain package, with readonly-compatible types;
- the obsolete mutable `@app/state` package removed;
- existing visual styling preserved initially, with semantic controls and keyboard accessibility added.

This is a direct migration, not a React-hosted `Runtime.embed` bridge. The app owns the page, so it should use `Runtime.makeApplication`.

## Current architecture and migration pressure

### Runtime and UI

`apps/frontend/src/main.tsx` boots `ReactDOM.createRoot`. `App.tsx`, `GameBoard.tsx`, and `Controls.tsx` render all UI. There is no router, server rendering, data fetching, timer, browser storage, React context, or third-party React component dependency. That makes a single-step runtime replacement practical.

The React state is split across three mechanisms:

| State | Current owner | Problem | Foldkit owner |
| --- | --- | --- | --- |
| Tiles, phase, solutions, history | module-global mutable `GameManager` | Hidden mutation and observer notifications sit outside rendering | Root Model plus pure derived functions |
| Solution visibility | `App.useState` | Component-local state | `model.showSolution` |
| Custom setup visibility | `Controls.useState` | Component-local state | `model.isCustomSetupMode` |
| Re-render signal | `useEffect` subscription and unused numeric version | Manual external-store bridge | Removed; Foldkit rerenders after update |

The two React components are presentational enough to become ordinary Foldkit view helpers. They do not warrant Submodels yet.

### Domain packages

`@app/solver` is already pure: it applies moves, checks terminal states, and uses breadth-first search. It should remain separate and framework-neutral.

`@app/state` is entirely the mutable `GameManager`. Only the React frontend consumes it. Preserving it behind a Foldkit Message would retain two state machines, defeat Model serialization/HMR/devtools, and keep subscription machinery that Foldkit replaces. Its useful rules should be made explicit in the Foldkit update/domain helpers, then the package should be deleted from the workspace.

The solver currently declares mutable array aliases (`boolean[]`, `number[]`). Effect Schema arrays and a Foldkit Model are naturally readonly. Change solver inputs and result types to readonly collections (while continuing to return fresh values), or add an explicit narrow conversion boundary. Prefer changing the pure solver API because none of its algorithms require mutation.

### Build and test baseline

The frontend uses Vite 4, TypeScript 5, Vitest 0.34, and `@vitejs/plugin-react`. The Foldkit Vite plugin requires Vite 7 or 8. Use Vite 8, TypeScript 7, and Vitest 4. As of this plan, npm's stable `typescript` release is `7.0.2`. Foldkit `0.142.1` is developed and tested upstream with `typescript@^6.0.3`, but TypeScript is a dev dependency rather than a Foldkit peer constraint. Start with TypeScript 7 and fall back to 6 only if a reproducible incompatibility exists in Foldkit's published declarations; record that incompatibility if encountered. The current Node `20.20.1` satisfies Vite 8's `^20.19.0` engine range, although the development and CI engines should be pinned/documented to prevent older Node installations.

The baseline `pnpm test` currently fails before collecting tests because the installed dependencies omit Rollup's Linux ARM64 native optional package, `@rollup/rollup-linux-arm64-gnu`. The production build reaches the frontend but then fails because `node_modules` contains the macOS ARM64 esbuild binary instead of Linux ARM64. Reinstall the dependency tree from the lockfile on the current OS/architecture before capturing baseline results. Do not treat either environment failure as a product regression.

There are no existing frontend behavior tests. The only active source test covers one solver scenario. Add characterization tests before deleting the old UI/store.

## Required product decision: completion semantics

> Implementation decision (2026-08-12): preserve the observable React UI
> behavior except for its broken solution-target transition. The React
> `Completed` branch is unreachable, and after beginning an opposite-board
> solution it can recommend undoing the move just made. Foldkit therefore has
> no terminal completion state and explicitly retains the opposite target while
> the board is mixed. Reaching a target immediately establishes the next
> opposite target, so guidance remains useful from every state.

The current phase implementation cannot reach `GamePhase.Completed`. In `GameManager.updatePhase`, the broad `PhaseOne || PhaseTwo`/all-same branch runs before the narrower completion branch, making the latter unreachable. More importantly, the model does not remember whether the newly uniform board is the opposite of the first uniform board.

The UI copy and solver define the intended journey as:

1. make a mixed board uniform;
2. make that uniform value become its opposite;
3. declare completion.

Implement that intent explicitly rather than preserving the bug. Recommended state data:

- `phase`: `SeekingFirstUniform | SeekingOpposite | Completed`;
- `firstUniformValue`: `Option<boolean>` (or an equivalent tagged phase payload);
- `gameState` and `moveHistory`.

Transition rules:

1. In `SeekingFirstUniform`, a move that first makes all tiles equal records that value and enters `SeekingOpposite`.
2. In `SeekingOpposite`, mixed intermediate boards remain in that phase.
3. In `SeekingOpposite`, an all-equal board whose value differs from `firstUniformValue` enters `Completed`.
4. Reaching the original uniform value again does not complete the game.
5. Reset and every custom-state edit start a new run and clear `firstUniformValue` and history.
6. If a new run begins already uniform, initialize it in `SeekingOpposite` and record the starting value; this matches the existing solution UI's “make them all opposite” behavior.

Lock these rules with ordinary domain/Story tests before translating phase-dependent UI copy. If product intent is instead “any uniform board wins,” simplify to a single phase and remove all opposite-board messaging; do not retain the current ambiguous four-value enum.

## Target design

### Constants and Model

Keep `initialGameState` and `possibleMoves` as immutable domain constants outside the Model because users cannot configure the move graph. Give them explicit readonly types.

Define the root Model with Effect Schema. Suggested fields:

```text
Model
├── gameState: readonly boolean[] (validated as exactly six entries)
├── phase: tagged/literal game phase
├── firstUniformValue: Option<boolean>
├── moveHistory: readonly number[]
├── showSolution: boolean
└── isCustomSetupMode: boolean
```

Do not store `solutions`, `currentSolution`, `nextSolution`, `isAllSame`, or `isCompleted`; derive them from the Model and solver. With six booleans, BFS has at most 64 board states, so render-time derivation is initially acceptable. Centralize it in one `deriveGameView(model)` helper so profiling can justify memoization later without changing view callers.

If profiling shows repeated BFS work is material, cache derived solutions in the Model only through update, with tests proving they always correspond to `gameState`. Do not add cache state speculatively.

### Messages

Use verb-first, past-tense Message constructors:

- `ClickedTile({ index })`
- `ClickedToggleSolution()`
- `ClickedReset()`
- `ClickedToggleCustomSetup()`
- `ClickedCustomTile({ index })`
- `ClickedApplyCustomSetup()`
- `ClickedPlayAgain()`

Use a bounded tile-index Schema if practical; otherwise validate the index in the pure transition helper and make invalid input a no-op or explicit defect consistently. DOM views only construct indices from the six known tiles.

### Update

Implement a pure, exhaustive `Match.tagsExhaustive` update. Every branch returns a new Model and an empty Commands array. No Foldkit Command, Subscription, Mount, or managed resource is needed for current behavior.

- Tile clicks apply the selected solver move, append history, and advance phase through the explicit state machine.
- Solution and custom-setup toggles only evolve their Boolean fields.
- Custom tile clicks directly toggle one tile, clear run progress, and recompute the initial phase from the edited state.
- Apply custom setup closes the panel without changing the configured board.
- Reset and Play Again restore the declared initial state and reset UI/run fields. Define whether solution visibility stays open; recommendation: reset it to false for a deterministic fresh run.

Do not translate `GameManager.subscribe` into a Foldkit Subscription. User DOM events already dispatch Messages, and the runtime owns the render loop.

### Views

Split pure definitions from boot side effects:

```text
apps/frontend/src/
├── entry.ts                 Runtime.makeApplication + Runtime.run
├── main.ts                  re-export Model, Message, init, update, view
├── model.ts                 schemas, types, init helpers, constants
├── message.ts               Message constructors and union
├── update.ts                pure transition logic
├── derived.ts               solution and display derivations
├── view.ts                  page Document and composition
├── view/
│   ├── gameBoard.ts         board view helper
│   ├── controls.ts          controls/custom setup helper
│   └── solution.ts          solution instructions helper
├── story.test.ts
├── scene.test.ts
├── vitest-setup.ts
└── styles/ or existing CSS files
```

This app is large enough that separate domain/update/view modules will be clearer than one monolithic `main.ts`, but keep a single root Model and update.

Translate JSX directly to `HtmlBuilder<Message>` calls:

- `className` and conditional template strings become `h.Class`;
- inline grid positioning becomes `h.Style`;
- `onClick` callbacks become `h.OnClick(Message(...))`;
- conditional fragments become conditional child arrays or `h.empty`;
- mapped solution steps use stable keyed `<li>` nodes;
- document title moves into the Foldkit `Document` return;
- `index.html` loads `/src/entry.ts`, removes the stale `/vite.svg` favicon, and retains `lang="en"`.

Keep the CSS and visual layout in the first pass, updating import locations only. Convert clickable tile `<div>` elements (both game and custom setup) to real `<button type="button">` elements or supply equivalent role, focus, and keyboard behavior. Prefer buttons, then neutralize global/button browser styling in the tile classes to preserve appearance. Add `aria-pressed` for ON/OFF state and useful accessible names such as “Tile 0, off, affects 0, 1, 3.”

### Runtime and development tooling

`entry.ts` should create a full-page application with `Runtime.makeApplication`, pass the `Model`, `Message`, `init`, `update`, `view`, and `#root` container, and run it. Keep the non-null container check explicit so a malformed HTML shell fails clearly.

Replace the React Vite plugin with `foldkit()` from `@foldkit/vite-plugin` in both development and production builds. Keep the existing workspace aliases until package exports/source-build ordering is deliberately changed. Set `optimizeDeps.entries` to `src/entry.ts` as in the official scaffold.

Devtools are optional for migration correctness. If added, pin `@foldkit/devtools` to `0.142.1`, pass `devTools: { Message }`, and keep it development-only through the supported plugin/runtime behavior. Do not enable the MCP relay unless the team wants the additional local port/process surface.

## Dependency changes

Use exact pins for the pre-1.0 Foldkit core and its exact Effect beta peers:

### Add to frontend dependencies

- `foldkit: 0.142.1`
- `effect: 4.0.0-beta.107`
- `@effect/platform-browser: 4.0.0-beta.107`

### Add/update frontend dev dependencies

- `@foldkit/vite-plugin: 0.12.3`
- `vite: ^8.0.16` (or the current compatible Vite 8 patch selected during implementation)
- `typescript: ^7.0.2`
- `vitest: ^4.1.9`
- `happy-dom: ^20.10.4`
- optionally `@foldkit/devtools: 0.142.1`
- optionally `@foldkit/oxlint-plugin` and `oxlint` if adopting Foldkit's recommended lint rules in the same change

### Remove from frontend

- `react`
- `react-dom`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `@app/state`

The current generic ESLint configuration is not present in the repository despite the lint dependencies. Either replace the broken script/dependencies with Foldkit's recommended Oxlint configuration or create a non-React ESLint configuration. Prefer Oxlint, but keep that tooling conversion in its own commit within the migration for easy diagnosis.

After removing `packages/state`, remove its workspace lockfile entries and generated `dist` artifacts through the normal package-manager/build flow. Do not hand-edit `pnpm-lock.yaml`.

## Implementation sequence

### 1. Repair and characterize the baseline

- Reinstall dependencies with pnpm so native optional packages match the ARM64 environment.
- Run the existing solver tests and production build.
- Add tests for solver behavior across all 64 six-tile inputs or use a property-based invariant: applying the returned first path reaches a uniform state and applying the second reaches the opposite uniform state.
- Add focused tests exposing current reset, custom-state, and completion behavior.
- Record the completion bug and approve the intended rules above.

Exit gate: tests run reliably; the desired completion state machine is executable documentation rather than inferred UI copy.

### 2. Make the domain boundary immutable

- Change solver aliases and signatures to readonly arrays.
- Ensure `applyMove`, `findPath`, and `solution` return fresh readonly-compatible data.
- Add invalid-index/malformed-move tests as appropriate.
- Extract pure game-run transition helpers from `GameManager`, implementing the approved completion semantics.

Exit gate: all game rules can be tested without React, Foldkit, listeners, or a class instance.

### 3. Install the compatible Foldkit toolchain

- Add Foldkit and exact Effect peers.
- Upgrade Vite, Vitest, TypeScript, and test DOM together.
- Replace the Vite plugin and update TypeScript config: remove JSX, include only `.ts`, target at least ES2022, retain strict mode, and enable `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes` if migration errors are handled in this change.
- Update Vitest config and add `foldkit/test/vitest` setup.
- Regenerate the pnpm lockfile and check peer-dependency output for zero Foldkit/Effect/Vite conflicts.

Exit gate: an empty/minimal Foldkit application typechecks, tests, starts, and builds under the repository's Node version.

### 4. Build Model, Messages, init, and update test-first

- Define schemas and immutable initial Model.
- Define the complete Message union.
- Implement exhaustive update branches using pure domain helpers.
- Add Story tests for every branch and phase transition, including reset, already-uniform initialization, custom edits, opposite completion, and repeated-original-value non-completion.

Exit gate: all application behavior is represented in Model/update and covered without a rendered view; every branch returns no Commands.

### 5. Translate and test the view

- Implement solution, board, and controls as pure view helpers.
- Compose them into the root `Document` view.
- Preserve class names and CSS, then update tile selectors for semantic buttons.
- Add Scene tests that interact by accessible role/name, not CSS class.

Required Scene flows:

1. initial board shows six correctly labeled tile buttons;
2. clicking a board tile toggles the affected tiles;
3. show/hide solution updates button state and instructions;
4. custom setup opens, toggles one tile without neighbors, applies, and closes;
5. reset restores the initial board and fresh-run UI;
6. following the two solver paths produces completed feedback and Play Again;
7. Play Again restores the initial state;
8. keyboard activation works through native button semantics.

Exit gate: the Foldkit Scene suite describes all visible behavior and basic accessibility; visual comparison shows no unintended layout regression.

### 6. Switch runtime and remove React completely

- Add `entry.ts` and point `index.html` at it.
- Delete `.tsx` files only after their Foldkit equivalents pass.
- Remove all React/runtime/plugin/type/lint dependencies and imports.
- Delete `packages/state` after no imports remain.
- Search source, manifests, configs, lockfile, docs, and built artifacts for `react`, `react-dom`, `jsx`, `tsx`, `GameManager`, and `@app/state`.
- Update README project structure and commands to say Foldkit rather than React.

Exit gate: the search has no production React references (historical migration docs may mention React), and a clean install does not install React through this app's dependency graph unless an unrelated transitive development tool legitimately does.

### 7. Full verification and deployment check

- Run formatting/lint, TypeScript typecheck, all workspace tests, and all workspace builds from a clean install.
- Start Vite and manually exercise all Scene flows in a real browser at narrow and desktop widths.
- Confirm state-preserving Foldkit HMR works during a code edit and manual refresh resets state.
- Inspect the production bundle for React/ReactDOM code and compare bundle size.
- Preview the production build and verify Vercel's root `pnpm build` still copies `apps/frontend/dist` to root `dist`.
- Confirm no `.references` content appears in Git status, build inputs, deployment output, or package publishing inputs.

Exit gate: clean CI-equivalent commands and production preview pass, deployment output remains `dist`, and the shipped bundle contains no React runtime.

## Acceptance criteria

- `foldkit@0.142.1` and compatible exact Effect beta peers are recorded in the lockfile.
- `.references/foldkit` remains pinned to tag `foldkit@0.142.1`/commit `b2cf4e3` and `.references/` is ignored.
- No application `.tsx`, JSX compiler setting, React imports, React dependencies, React Vite plugin, or mutable `GameManager` remains.
- The full game and UI state is a serializable Effect Schema-backed Foldkit Model.
- Every user event is a typed Message handled exhaustively by pure update.
- The intended two-stage completion flow is reachable and test-covered.
- No unnecessary Command or Subscription emulates synchronous local behavior.
- Existing CSS/layout is preserved, while interactive tiles are keyboard-accessible semantic controls.
- Story and Scene suites cover state transitions and user-visible flows.
- `pnpm test`, frontend typecheck/lint, `pnpm build`, production preview, and Vercel output checks pass from a clean dependency install.
- The production bundle contains no React or ReactDOM runtime.

## Risks and controls

| Risk | Control |
| --- | --- |
| Foldkit is pre-1.0 and releases quickly | Exact-pin core/Effect peers, keep the tagged reference clone, upgrade deliberately with changelog review |
| Toolchain jump obscures UI defects | Upgrade and validate a minimal Foldkit shell before translating behavior |
| Current completion bug becomes accidental product behavior | Approve explicit rules and write Story tests before implementation |
| Schema readonly types conflict with mutable solver aliases | Refactor the pure solver boundary before creating the Model |
| Repeated BFS derivation affects rendering | Centralize derivation, profile the six-bit state space, cache only if measured |
| HTML-builder translation changes layout | Preserve class names/CSS first and perform narrow/desktop visual checks |
| Clickable div accessibility is carried forward | Use semantic buttons and assert accessible roles/names in Scene tests |
| Native Rollup/esbuild packages break validation | Recreate dependencies for the active OS/architecture before baseline and CI runs |
| Vite 8 raises Node requirements for contributors/CI | Pin/document Node `>=20.19` (prefer current supported Node 22 in CI) |

## Deliberately out of scope

- routing, SSR, persistence, networking, timers, or other effects the app does not currently need;
- Tailwind or `@foldkit/ui` adoption;
- Foldkit Submodels for small stateless view helpers;
- MCP relay setup;
- solver algorithm redesign beyond readonly compatibility and stronger tests;
- visual redesign unrelated to semantic control/accessibility fixes.
