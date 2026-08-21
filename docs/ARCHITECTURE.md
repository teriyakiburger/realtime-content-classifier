# Architecture

```text
Demo SPA DOM
  -> DOM observer / extractor
  -> content record boundary
  -> deduplication store
  -> strategy orchestrator
       -> rule classifier
       -> Ollama classifier adapter (Gemma or Mistral)
  -> result sink / metrics collector
```

## Boundaries

The observer only detects insertions and extracts records. The deduplication store owns identity and once-only processing. Strategies depend on pure classifier interfaces. The Ollama adapter owns HTTP, prompt/response parsing, model selection, timeout, and error translation. Metrics consume events and do not alter classification.

## Failure model

Failures are converted at the orchestration boundary into non-blocking `UNKNOWN` results. The UI never hides or blocks content because classification failed. Timeouts are bounded and counted as LLM failures.

## Replaceability

Gemma and Mistral implement the same local inference port. The strategy layer must not import model-specific code. Browser APIs are isolated behind ports so pure logic is testable under Node.
