# Build log

What broke, why, and how it was fixed. Raw material for resume bullets and
"tell me about a bug you fixed" interview questions. Add an entry every time
something takes more than ~15 minutes to figure out.

Template:

```
## N. Short title (YYYY-MM-DD)
**Symptom:** what you saw
**Cause:** what was actually wrong
**Fix:** what you changed
**Lesson:** what you'd do differently / what it taught you
```

---

## 1. Test helper produced duplicate SQL columns (2026-11-19)
**Symptom:** The "rejects a blank company name" test failed with
`column "company" specified more than once` instead of a check-constraint error.
**Cause:** The insert helper built its column list by concatenating default
columns with override columns, so overriding `company` listed it twice.
**Fix:** Merge defaults and overrides into one object first (`{...defaults, ...extra}`),
then derive columns and values from it.
**Lesson:** The test asserted on the *specific* error (`/check constraint/`). A
loose `rejects.toThrow()` would have passed for the wrong reason and hidden
both the helper bug and whether the constraint even exists. Assert on why
something failed, not just that it failed.

## 2. Tests couldn't find DATABASE_URL despite a default in vitest.config (2026-11-19)
**Symptom:** `npm test` without `DATABASE_URL` exported crashed in global setup,
even though `test.env.DATABASE_URL` was set in `vitest.config.ts`.
**Cause:** Vitest's `globalSetup` runs in the main process before workers start;
`test.env` is only applied inside the test workers.
**Fix:** Set the default on `process.env` at the top of `vitest.config.ts`.
**Lesson:** Know which process your code runs in. Config that "obviously applies"
may only apply to some of them.
