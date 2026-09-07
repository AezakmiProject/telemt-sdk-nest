# Progress

## Done
- [x] Unit tests for the library — 43 specs across `telemt.exception`, `telemt.service`
      and `telemt.module`; 100% statement/branch/function/line coverage.
      `pnpm test`, `pnpm test:cov`, `pnpm typecheck`.
- [x] ISC `LICENSE`, npm keywords + description, `.gitignore`.
- [x] `src/index.ts` public barrel and `README.md`; every README example
      compile-checked against the real SDK types.
- [x] CI + release workflows and GitHub templates ported from `telemt-sdk`,
      plus `engines` and `packageManager` in `package.json`.
- [x] `pnpm build` fixed: `tsconfig.json` moved off the removed `node10` to
      `nodenext`, staying CommonJS. `engines` raised to `>=22.12` (see
      docs/decisions.md). All three CI steps green; built `dist/` smoke-tested in a
      real Nest container.
- [x] Package renamed to the org scope `@aezakmiproject/telemt-sdk-nest` (README,
      release workflow and issue template updated with it), plus `repository` /
      `homepage` / `bugs` and a `files` whitelist. Tarball is 27 files / 26.3 kB.
- [x] `peerDependencies`: `@nestjs/common` and `reflect-metadata`. Scoped to what the
      built output actually needs — `dist/` requires only `@nestjs/common` (plus the
      SDK, a real dependency), and the emitted decorator metadata calls
      `Reflect.metadata`. `@nestjs/core` is imported nowhere in `src/`, so it stays a
      devDependency, pulled in only by `@nestjs/testing`.
- [x] `@aezakmiproject/telemt-sdk` moved to `peerDependencies` + `devDependencies`;
      `dependencies` is now empty. Dependency audit run — see docs/decisions.md.

## Open
- [ ] `@aezakmiproject/telemt-sdk`'s published ESM build is unimportable from Node
      (`ERR_MODULE_NOT_FOUND`: extensionless relative imports in `dist/esm`). Only the
      CJS half works, which is why this package stays CommonJS. Fix lives in the SDK
      repo's `tsconfig.esm.json`.
