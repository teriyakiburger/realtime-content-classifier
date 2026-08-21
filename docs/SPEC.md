# Specification

## Inputs and outputs

The system receives DOM-derived content records from the self-hosted demo SPA. A record has a stable content identity, text, source metadata, and insertion timestamp. Classification returns one label from the configured taxonomy, including `UNKNOWN`, plus strategy, latency, and whether an LLM call occurred. Local LLM classifiers may return this result asynchronously.

The initial taxonomy is `TECH`, `NEWS`, `ENTERTAINMENT`, `OTHER`, and `UNKNOWN`.

## Strategies

- Rule-only applies deterministic rules and never calls Ollama.
- LLM-only sends every eligible unique record to the configured local Ollama adapter.
- Rule-first applies rules; only inconclusive records go to the LLM adapter.

Gemma and Mistral are interchangeable Ollama model configurations behind the same adapter contract.

## Invariants

- DOM handling does not contain classification policy.
- Classification policy does not depend on browser APIs.
- A duplicate content identity is classified at most once per evaluation run.
- Observer, parser, timeout, transport, malformed-response, and model errors fail open: content remains visible and the result is non-blocking `UNKNOWN`.
- No external network or hosted model is required.

## Measurements

For each strategy/model/dataset combination, record correctness against fixture truth, `UNKNOWN` rate, mean latency, p95 latency, total records, and LLM-call count. Latency starts when classification begins and ends when the result is produced; duplicate records do not add classification samples.

## Configuration

Ollama base URL, model name, request timeout, and strategy are runtime configuration. Defaults must be local and documented. No credentials or external API keys are expected.
