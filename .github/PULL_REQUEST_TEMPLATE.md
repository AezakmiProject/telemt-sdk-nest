## Summary

<!-- What changed and why. Link the issue if there is one. -->

## Checklist

- [ ] `pnpm typecheck && pnpm test && pnpm build` pass locally
- [ ] Public types are re-exported from `src/index.ts` when the API surface changed
- [ ] Unit tests cover the new behaviour (`src/*.spec.ts`)
- [ ] Docs updated (`README.md` / `docs/`) if a caller-visible option or export changed
- [ ] Architectural choices appended to `docs/decisions.md`
