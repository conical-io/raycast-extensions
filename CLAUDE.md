# [CLAUDE.md](http://CLAUDE.md) — Raycast Extension Development

This file gives Claude context about this project: what it is, how it's structured, the technologies involved, and the conventions to follow when making changes.

---

## What This Project Is

This is a forked [Raycast](https://raycast.com/) extension. The upstream source lives in the [raycast/extensions](https://github.com/raycast/extensions) monorepo. This fork exists to add custom functionality on top of the original extension without modifying upstream code where possible.

Raycast is a macOS launcher/productivity app. Extensions are built with React and TypeScript and rendered natively inside Raycast using its own component library (`@raycast/api`).

---

## Core Technologies

TechnologyRole**TypeScript**Primary language for all extension logic**React**UI layer — Raycast renders React components natively`@raycast/api`Raycast's component and utility library (lists, forms, actions, toasts, etc.)**Node.js**Runtime for scripts and tooling**npm**Package management`@raycast/utils`Optional helpers (e.g. `useFetch`, `useExec`, caching)

Raycast extensions are **not** web apps. There is no browser DOM, no `window`, no `document`. All UI must be built using components from `@raycast/api` (e.g. `<List>`, `<Form>`, `<Detail>`, `<ActionPanel>`, `<Action>`).

---

## Project Structure

```
.
├── src/
│   ├── index.tsx          # Primary entry point (or named per command)
│   ├── custom/            # All custom additions live here (see below)
│   │   ├── commands/      # New Raycast commands added in this fork
│   │   ├── components/    # Custom React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Helper functions and utilities
├── assets/                # Icons and images
├── package.json           # Extension manifest + dependencies
└── CHANGELOG.md
```

### The `src/custom/` Subfolder

All new logic introduced in this fork lives under `src/custom/`. This is a hard convention — it exists to:
- Make it immediately obvious what is custom vs. upstream
- Minimise merge conflicts when rebasing onto upstream updates
- Allow upstream files to be updated with minimal risk of clobbering custom work

**Do not modify upstream files directly if the change can instead be achieved by adding a file to **`src/custom/`** and importing it.** If an upstream file truly must be modified, leave a comment marking the change:

```ts
// CUSTOM: <brief reason for change>
```

---

## Key Raycast Concepts

### Commands

Each entry point in `package.json` under `"commands"` maps to a file in `src/`. Each command is a React component as the default export:

```ts
import { List } from "@raycast/api";

export default function MyCommand() {
  return <List>...</List>;
}
```

### Actions & ActionPanels

Interactive items go inside an `<ActionPanel>`. Use `<Action>`, `<Action.Push>`, `<Action.Open>`, etc.:

```ts
<ActionPanel>
  <Action title="Do Something" onAction={() => doSomething()} />
</ActionPanel>
```

### Preferences

User-configurable settings are declared in `package.json` under `"preferences"` and accessed via:

```ts
import { getPreferenceValues } from "@raycast/api";
const prefs = getPreferenceValues<{ apiKey: string }>();
```

### Toast Notifications

```ts
import { showToast, Toast } from "@raycast/api";
await showToast({ style: Toast.Style.Success, title: "Done" });
```

### Caching & Data Fetching

Prefer `useFetch` or `useExec` from `@raycast/utils` for data fetching — they handle loading states and caching automatically.

---

## Development Workflow

### Install & Run

```bash
npm install
npm run dev   # Opens extension in Raycast with hot-reloading
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
npm run lint --fix
```

Raycast enforces its own ESLint config (`@raycast/eslint-config`). Keep lint clean — the Raycast CLI will warn on build if there are violations.

### Type Checking

```bash
npx tsc --noEmit
```

---

## Conventions for New Code

- **All custom code goes in **`src/custom/` — commands, components, hooks, and utils each in their own subfolder
- **TypeScript strictly** — avoid `any`; use proper types from `@raycast/api` where applicable
- **No DOM APIs** — no `document`, `window`, `localStorage`, etc.
- **Prefer **`@raycast/utils`** hooks** over raw `useEffect` + `fetch` for async data
- **Keep commands focused** — one command per file, one responsibility per command
- **Comment custom modifications** to upstream files with `// CUSTOM:` so they're easy to find during a rebase

---

## Staying in Sync with Upstream

This fork should periodically rebase onto upstream `main` to pick up bug fixes and improvements:

```bash
git remote add upstream https://github.com/raycast/extensions
git fetch upstream
git rebase upstream/main
```

Because all custom logic is isolated in `src/custom/`, conflicts should be rare and limited to `package.json` (dependency or manifest changes).

---

## Useful References

- [Raycast Developer Docs](https://developers.raycast.com/)
- [API Reference](https://developers.raycast.com/api-reference)
- `@raycast/utils`[ Docs](https://developers.raycast.com/utils-reference)
- [Upstream Extensions Repo](https://github.com/raycast/extensions)