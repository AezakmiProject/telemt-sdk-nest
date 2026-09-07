# Progress

## Done
- [x] Unit tests for the library — 43 specs across `telemt.exception`, `telemt.service`
      and `telemt.module`; 100% statement/branch/function/line coverage.
      `pnpm test`, `pnpm test:cov`, `pnpm typecheck`.
- [x] ISC `LICENSE`, npm keywords + description, `.gitignore`.
- [x] `src/index.ts` public barrel and `README.md`; every README example
      compile-checked against the real SDK types.

## Open
- [ ] `pnpm build` fails: `tsconfig.json` uses `moduleResolution: node10`, removed in
      TS 7. Migrating it also surfaces CJS/ESM interop errors against ESM-only
      `@nestjs/common@12` — see docs/decisions.md.
- [ ] `@nestjs/common` / `@nestjs/core` are only in `devDependencies`. A consumer
      installing this package gets no declared Nest compatibility range — they
      belong in `peerDependencies` (with the dev copies kept for local builds).
- [ ] No `repository` / `homepage` / `bugs` fields in `package.json`.
- [ ] No `files` field or `.npmignore`: `npm pack` currently ships `src/`, the specs,
      `coverage/`, `docs/` and the tsconfigs — and no `dist/`. Compare the sibling
      `telemt-sdk`, which whitelists `dist/**`, `README.md`, `CHANGELOG.md`.
