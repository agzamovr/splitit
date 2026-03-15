# Development guidelines

## Testing

- **Always add tests for new features.**
- **Avoid redundant tests:**
  - Don't test trivial empty-input cases (e.g. empty list → empty result) unless the path exercises meaningful logic.
  - Don't write multiple tests that hit the same code path (e.g. several values for the same default/fallback branch) — one representative case is enough.
  - Combine related assertions into a single test when they verify the same behaviour (e.g. resolved and unresolved states in one test).
- **Don't test framework or library behaviour.** Use TypeScript types to enforce contracts at compile time instead of covering them with runtime tests.
- **Focus tests on actual application logic and meaningful edge cases.**

## After implementation

- Always run `tsc` after implementing a change to catch type errors before committing.
- Always run `pnpm lint` after implementing a change to catch lint errors before committing.
