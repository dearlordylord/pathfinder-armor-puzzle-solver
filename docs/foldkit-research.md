# Foldkit migration research

Research snapshot: 2026-08-12. This note uses only the Foldkit npm registry metadata, the official Foldkit documentation, and the official `foldkit/foldkit` repository. The inspected source is release tag [`foldkit@0.142.1`](https://github.com/foldkit/foldkit/tree/foldkit%400.142.1), commit [`b2cf4e3`](https://github.com/foldkit/foldkit/commit/b2cf4e3359f2895c69f49aa286ce5584268d2398).

## Published versions and compatibility

The npm `latest` dist-tag currently resolves to:

| Package | Latest | Role |
| --- | ---: | --- |
| [`foldkit`](https://www.npmjs.com/package/foldkit) | `0.142.1` | Runtime, Model-View-Update primitives, HTML builder, and tests |
| [`@foldkit/vite-plugin`](https://www.npmjs.com/package/@foldkit/vite-plugin) | `0.12.3` | View-identity transform and model-preserving HMR |

The versions are corroborated by the matching release tag's [`foldkit/package.json`](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/foldkit/package.json) and [`vite-plugin-foldkit/package.json`](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/vite-plugin-foldkit/package.json). The registry endpoints used to resolve the tags are [`foldkit/latest`](https://registry.npmjs.org/foldkit/latest) and [`@foldkit/vite-plugin/latest`](https://registry.npmjs.org/%40foldkit%2Fvite-plugin/latest).

Important constraints for this repository:

- `foldkit@0.142.1` pins both `effect` and `@effect/platform-browser` to exactly `4.0.0-beta.107`. Foldkit's official installation command installs all three together, and explicitly warns that stable Effect v3 is incompatible ([Getting Started: Requirements](https://foldkit.dev/get-started/getting-started#requirements)).
- `@foldkit/vite-plugin@0.12.3` declares Vite `^7.0.0 || ^8.0.0` as a peer dependency ([package manifest](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/vite-plugin-foldkit/package.json)). This app currently uses Vite 4, so a Foldkit migration necessarily includes a Vite upgrade; simply swapping `@vitejs/plugin-react` for the Foldkit plugin is not dependency-compatible.
- Foldkit itself declares Node `>=18`, while the current `create-foldkit-app` scaffolder requires Node `22.22.2` or newer. Because this is an existing app, the direct-install route is appropriate; the scaffolder requirement should not be mistaken for the runtime package's engine floor ([core manifest](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/foldkit/package.json), [Getting Started](https://foldkit.dev/get-started/getting-started#requirements)). The selected Vite major's own Node requirement still needs to be satisfied.
- Foldkit is pre-1.0. Its README calls the core API stable but allows breaking changes in minor releases, so the migration should pin compatible versions and treat upgrades as deliberate work ([official README](https://github.com/foldkit/foldkit/tree/foldkit%400.142.1#readme), [changelog](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/foldkit/CHANGELOG.md)).

The direct-install dependency set for the current release is therefore:

```text
dependencies:
  foldkit: 0.142.1
  effect: 4.0.0-beta.107
  @effect/platform-browser: 4.0.0-beta.107

devDependencies:
  @foldkit/vite-plugin: 0.12.3
  vite: ^7 or ^8 (choose one supported by the project's Node runtime)
```

React, React DOM, their type packages, `@vitejs/plugin-react`, and the React-specific ESLint plugins become removable after the Foldkit entry point and views replace all TSX.

## Foldkit's application shape

Foldkit is an Elm-style Model-View-Update runtime built on Effect. A complete application has five pure definitions plus a small runtime entry point:

1. **Model** — one immutable application state tree defined as an Effect `Schema`, not just a TypeScript type. Runtime schema information supports decoding, comparison, lifecycle management, devtools, and HMR ([Model](https://foldkit.dev/core/model)).
2. **Messages** — tagged facts about events, conventionally past-tense and verb-first. `m()` from `foldkit/message` produces both an Effect `TaggedStruct` schema and a callable constructor; combine constructors with `Schema.Union` ([Messages](https://foldkit.dev/core/messages)).
3. **update** — a pure `(Model, Message) => [Model, Command[]]` transition. `Effect.Match.tagsExhaustive` provides compile-time exhaustiveness; `evo` from `foldkit/struct` immutably evolves selected fields ([Update](https://foldkit.dev/core/update)).
4. **init** — returns the initial `[Model, Command[]]` and is typed as `Runtime.ApplicationInit<Model, Message>` ([official counter source](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/examples/counter/src/main.ts)).
5. **view** — a pure `(Model, HtmlBuilder<Message>) => Document`. A full-page `Document` includes `title` and `body`; event attributes dispatch Messages rather than running mutation callbacks ([View](https://foldkit.dev/core/view)).

The browser-only entry creates and runs the app:

```ts
const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application)
```

This separation keeps the state machine importable by tests without booting the browser runtime as an import side effect ([Getting Started: Project Structure](https://foldkit.dev/get-started/getting-started#project-structure), [counter entry](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/examples/counter/src/entry.ts)). Because this application owns the full page, `Runtime.makeApplication` is the correct API; `makeElement`/`embed` are for widgets hosted inside another application ([Runtime](https://foldkit.dev/core/runtime)).

## View APIs needed by this app

JSX becomes calls on the typed `HtmlBuilder<Message>`:

```ts
h.div([h.Class('app')], [
  h.h1([], ['Pathfinder Puzzle Solver']),
  h.button([h.OnClick(ClickedToggleSolution())], ['Show Solution']),
])
```

The relevant official behavior is:

- Elements take attributes first and children second. Text is a string child; childless non-void nodes can omit the children argument. `h.empty` represents no rendered node ([View: typed HTML helpers](https://foldkit.dev/core/view#typed-html-helpers)).
- `h.Class(string)` covers the app's conditional class strings, `h.Style(record)` covers its inline grid placement, and `h.Attribute`/typed attribute helpers cover other DOM properties. The public builder exposes these constructors in the core source ([HTML builder source](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/foldkit/src/html/index.ts)). Existing CSS files can remain normal Vite CSS imports; no Tailwind migration is required by Foldkit.
- `h.OnClick(message)` dispatches a prebuilt Message. Handlers needing event-derived data use mapper APIs such as `h.OnInput(value => Message(...))`; view code itself stays side-effect free ([View: Event Handling](https://foldkit.dev/core/view#event-handling)). This app's tile and control clicks only need `OnClick` with an index payload.
- Dynamic sibling collections can use `h.keyed(tag)(key, attributes, children)`, while `h.Key` is also available on a node. The Vite plugin adds framework-managed view-function identity; user keys still identify list siblings ([Vite plugin README](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/vite-plugin-foldkit/README.md)). The six fixed tiles do not require memoization, but solution move `<li>` nodes should have stable string keys rather than React's current array-position keys if their identity matters.
- Reusable UI is ordinary view functions accepting Model fragments and `h`. Stateful features use Submodels; the React migration guide maps component props to function parameters, component state to the Model, handlers to Messages, and JSX to Model-to-HTML functions ([Coming from React](https://foldkit.dev/react/coming-from-react)). `GameBoard` and `Controls` are small enough to start as stateless view helpers rather than Submodels.

The Foldkit Vite plugin should be enabled for development **and production**, because it supplies view identity during its build transform as well as state-preserving HMR:

```ts
import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({ plugins: [foldkit()] })
```

The plugin preserves the schema-backed Model over its full-page development reload, while a manual browser refresh resets it. It also auto-mounts `@foldkit/devtools` in development if that optional package is installed ([Vite plugin README](https://github.com/foldkit/foldkit/blob/foldkit%400.142.1/packages/vite-plugin-foldkit/README.md)).

## Mapping the current app to Foldkit

The React UI currently has three kinds of state:

| Current mechanism | Current data | Foldkit destination |
| --- | --- | --- |
| Module-level mutable `GameManager` plus a subscription/version-counter render hack | game state, phase, solutions, history | Schema-backed root Model and pure update branches |
| `App.useState` | `showSolution` | root Model field |
| `Controls.useState` | `isCustomSetupMode` | root Model field (or a Controls Submodel only if the feature grows) |

Suggested root Model data is the serializable state itself, not a `GameManager` class instance:

```ts
S.Struct({
  gameState: S.Array(S.Boolean),
  phase: GamePhaseSchema,
  moveHistory: S.Array(S.Number),
  showSolution: S.Boolean,
  isCustomSetupMode: S.Boolean,
})
```

`possibleMoves` and the initial state are constants, so they need not be in the Model unless runtime configurability is intended. `solutions`, `isAllSame`, and completion are deterministically derived from `gameState`, phase, and the solver. They can be computed in update/view helpers rather than stored redundantly, subject to a small performance check.

This is an architectural requirement, not just style: Foldkit expects the Model to be immutable and schema-described, whereas the current `GameManager` hides mutable arrays, listeners, and recalculation behind methods. Keeping that object as the Model would preserve the React-era external-store pattern, prevent a faithful schema, and undermine HMR/devtools serialization. Foldkit's own React mapping replaces local/global stores with the single Model and puts every transition in `update` ([Model](https://foldkit.dev/core/model), [Coming from React](https://foldkit.dev/react/coming-from-react)).

The app's event union can stay small and explicit:

```text
ClickedTile { index }
ClickedToggleSolution
ClickedReset
ClickedToggleCustomSetup
ClickedCustomTile { index }
ClickedApplyCustomSetup
ClickedPlayAgain
```

All current operations are synchronous and pure (the solver is a pure BFS), so update can return empty Command arrays throughout. There is no need for Commands, Subscriptions, Mount, or managed resources in the first migration. In particular, the current `GameManager.subscribe`/React `useEffect` pair should disappear rather than be translated into a Foldkit Subscription: subscriptions are for external event streams, while user clicks already enter the update loop as Messages ([Coming from React](https://foldkit.dev/react/coming-from-react), [Subscriptions](https://foldkit.dev/core/subscriptions)).

One domain issue should be resolved while extracting pure transitions: `GameManager.updatePhase()` checks a broad “phase is PhaseOne or PhaseTwo and all same” branch before its narrower completion branch, making the later completion condition unreachable when phase is `PhaseTwo` and all tiles are the same. A parity test around the intended multi-phase flow is needed before choosing whether the Foldkit reducer preserves current observable behavior or fixes the intended state machine.

## Testing APIs and migration safety

Foldkit provides two complementary, runtime-aligned testing layers:

- **Story** tests the state machine by dispatching Messages, asserting Models, and resolving Commands inline. It is suitable for reset, custom setup, move/phase progression, and completion edge cases ([Story](https://foldkit.dev/testing/story)).
- **Scene** renders the actual Foldkit view into a virtual DOM, locates nodes by accessible role/label/text, performs interactions such as click/type, and asserts the result without a browser or jsdom. It is suitable for the show/hide solution flow, tile activation, custom setup controls, reset/play-again, and completion feedback ([Scene](https://foldkit.dev/testing/scene)).

Scene interactions dispatch the same Messages wired by the view and rerender through the actual update function. The official guidance is to use Story for update logic and edge cases and Scene for user flows, rendered contracts, and accessibility ([Scene: Story vs Scene](https://foldkit.dev/testing/scene#story-vs-scene)). The current frontend has no React component tests, so migration tests should first lock down the intended domain flow, especially the phase/completion ambiguity, then cover the visible interaction paths.

## Migration-critical conclusions

1. A complete React removal is straightforward for this UI because it has no third-party React components and no asynchronous effects. Foldkit's base Model/Message/update/view/runtime surface is sufficient.
2. The meaningful work is the state architecture: replace `GameManager`'s mutable observable instance with schema-backed immutable data and pure transition/derivation functions. Do not wrap the existing instance in Foldkit state.
3. The dependency migration is coupled: Foldkit `0.142.1`, exact Effect beta `107`, Vite plugin `0.12.3`, and Vite 7/8 must move together.
4. Keep the existing CSS and DOM structure initially to reduce visual risk; translate `App`, `GameBoard`, and `Controls` into plain `.ts` view functions.
5. Establish Story tests for domain transitions and Scene tests for the rendered interaction contract before deleting the React implementation.
6. Decide the intended completion-state behavior explicitly rather than accidentally carrying the current unreachable branch into the new reducer.

