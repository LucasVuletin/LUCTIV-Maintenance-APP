# Repository instructions

## Product identity

- Product and application name: `LUCTIV: Maintenance APP`.
- Technical workspace/package name: `luctiv-maintenance-app`.
- Author credit: `Desarrollado por Lucas Vuletin`.

## Source-of-truth policy

- Treat this repository as the only active implementation.
- Treat `handoff/reference/` as read-only migration evidence.
- Use only the archived latest working-tree snapshot when legacy behavior must
  be checked.
- Do not inspect or restore older Git history from the legacy repository unless
  Lucas explicitly requests it.
- Do not copy React components into production source. Reimplement required
  behavior natively in Angular and TypeScript.

## Technical conventions

- Use Angular standalone components, signals, dependency injection and strict
  TypeScript.
- Keep domain models under `src/app/core/models`.
- Keep application state and persistence behind injectable services.
- Prefer feature folders when a screen grows beyond one focused component.
- Preserve Spanish operational terminology shown to users: PAD, pozo, etapa,
  SET, LIMPIO, SUCIO, PE, IEM and MTTO.
- Preserve offline capability. Do not introduce a required backend without an
  explicit architecture decision.
- Never commit secrets, credentials, `.env` values or Devin/Codex tokens.

## Required verification

Run after material changes:

```bash
npm run build
npm audit --omit=dev
```

Run unit tests in environments where the optional native Vitest/Rollup binding
is available:

```bash
npm test -- --watch=false
```

## Migration priorities

1. Domain parity for pumps, manifolds, PAD/pozo/etapa and SET.
2. Editable layout and reserve bench.
3. Offline alerts and replacement decisions.
4. Interstage PE/IEM planner and history.
5. Excel and PNG export parity.
6. PWA/offline installation and field validation.
