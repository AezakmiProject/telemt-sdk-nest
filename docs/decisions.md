# Architectural decisions

## 2026-09-07 — Vitest, not Jest, as the test runner
The project pins `typescript@7.0.2` (the native Go compiler). `ts-jest` drives the
TypeScript JS compiler API, which that release no longer ships, so the Nest-default
Jest setup is not viable here. Vitest transpiles via oxc and needs no `typescript`
package at all.

## 2026-09-07 — Legacy decorators configured in `vitest.config.mts`, not `tsconfig.json`
oxc does not read decorator settings out of `tsconfig.json`. Nest DI needs
`experimentalDecorators` plus `design:paramtypes`, so both are declared under the
`oxc` key in the vitest config.

## 2026-09-07 — `TelemtAPI` imported as a type in `telemt.service.ts`
The service only uses `TelemtAPI` in type position; the concrete client arrives via
the `TELEMT_CLIENT` token. Making it `import type` keeps the SDK (whose ESM build
emits extensionless relative imports that Node's ESM resolver rejects) out of the
service's runtime graph.

## 2026-09-07 — Spec typechecking split into `tsconfig.spec.json`
`tsconfig.json` still sets `moduleResolution: node10`, which TS 7 removed, so `tsc`
fails before it reaches the specs. `tsconfig.spec.json` overrides resolution to
`bundler` (matching how vitest resolves at run time) for typechecking only, leaving
the published build output untouched. **Open:** `pnpm build` remains broken until
the base config is migrated off `node10`.
