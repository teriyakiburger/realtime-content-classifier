# Agent guidance

- Treat `docs/SPEC.md` as the behavioral source of truth.
- Update `docs/DECISIONS.md` when making a design decision that changes observable behavior.
- Keep DOM observation/extraction separate from classification, orchestration, and Ollama adapters.
- New behavior must have Vitest coverage and acceptance criteria.
- Tests must not require network access or a running Ollama server unless explicitly marked as integration tests.
- Runtime errors must fail open: content remains visible and the outcome is observable as `UNKNOWN` or an equivalent non-blocking state.
- Do not add third-party scraping or external LLM API integrations.
