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
The base config excludes `**/*.spec.ts` so specs stay out of `dist/`.
`tsconfig.spec.json` adds them back under `noEmit` for typechecking. Since the base
config moved to `nodenext` it needs no resolution overrides — it only flips `noEmit`.

## 2026-09-07 — Stay CommonJS; `module: nodenext`, Node >=22.12
`moduleResolution: node10` was removed in TS 7, and it had been masking a real
mismatch: this package emits CommonJS but `@nestjs/common@12` is pure ESM
(`"type": "module"`, no CJS build, no conditional exports).

Of `node16` / `node18` / `nodenext`, only **`nodenext`** typechecks cleanly — it is
the mode in which TypeScript models Node's `require(esm)` support instead of
rejecting it outright (`node16` reports TS1479; `node18` is not a valid
`moduleResolution`). Output stays CommonJS because `package.json` has no
`"type": "module"`.

`require(esm)` is unflagged only from Node 22.12, so `engines` is `>=22.12` rather
than the `>=18` inherited from the SDK. Verified by loading the built `dist/` into a
real Nest DI container against the unmocked SDK.

**ESM was considered and rejected.** Going `"type": "module"` would resolve
`@aezakmiproject/telemt-sdk` through its `import` condition to `dist/esm`, whose
relative imports carry no file extensions — Node rejects that with
`ERR_MODULE_NOT_FOUND`. Its `tsconfig.esm.json` builds with
`moduleResolution: "bundler"`, which permits extensionless specifiers and emits them
verbatim into a directory published as real Node ESM. The CJS half is unaffected, so
requiring the SDK works. Revisit if that build is fixed upstream.

## 2026-09-07 — Every runtime dependency is a peer; `dependencies` is empty
`@aezakmiproject/telemt-sdk` moved from `dependencies` to `peerDependencies` (kept in
`devDependencies` for local builds), joining `@nestjs/common` and `reflect-metadata`.
The consumer owns the SDK version, and a single client instance is shared rather than
this wrapper pinning a second copy of the SDK into their tree.

Peers were chosen from what the built output actually loads, not by convention:
`dist/` requires only `@nestjs/common` and the SDK, and the emitted decorator
metadata calls `Reflect.metadata`. `@nestjs/core` is imported nowhere in `src/` and
stays a devDependency, pulled in only as a peer of `@nestjs/testing`.
