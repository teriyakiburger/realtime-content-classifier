# Decisions

## Initial reversible assumptions

1. Node.js 20+ and strict TypeScript are the baseline runtime/toolchain.
2. Vitest is the test runner; unit tests are deterministic and network-free.
3. The initial labels are `TECH`, `NEWS`, `ENTERTAINMENT`, `OTHER`, and `UNKNOWN`.
4. A content identity is a producer-supplied stable ID; text hashing may be a later adapter policy.
5. Deduplication is scoped to one evaluation run, not permanent storage.
6. Latency excludes DOM observation time and includes strategy and inference time.
7. p95 uses the nearest-rank percentile over non-duplicate classification samples.
8. JSON is the initial fixture format, with explicit expected labels and metadata.
9. Ollama uses its local HTTP API through an adapter; Gemma and Mistral are configuration choices.
10. Milestone 1 implements contracts and the rule-only classifier; Ollama, DOM observation, and the SPA remain deferred.
11. Rule-only classification uses configurable regular expressions; no match returns `UNKNOWN`, and simultaneous matches for multiple categories fail open as `UNKNOWN`.
12. The common classifier contract permits synchronous or asynchronous results so local Ollama inference can remain behind the same boundary as rules.

These assumptions are intentionally easy to change before implementation.

## Human approval requested

- Confirm the five-label taxonomy (`TECH`/`NEWS`/`ENTERTAINMENT`/`OTHER`/`UNKNOWN`).
- Confirm producer-supplied IDs as the duplicate identity, versus normalized-text hashing.
- Confirm nearest-rank p95 and exclusion of duplicate records from metrics.
- Confirm Node 20+ as the supported baseline.
