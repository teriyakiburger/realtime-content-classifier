# Acceptance criteria

- A self-hosted demo fixture can insert content after initial load and the observer emits records.
- The same content identity inserted repeatedly produces one classification.
- Each of the three strategies is selectable and observable.
- Rule-only makes zero Ollama calls.
- LLM-only attempts one call per unique eligible record.
- Rule-first calls Ollama only for inconclusive rules.
- Gemma and Mistral can be selected without changing strategy code.
- Invalid model output, timeout, observer error, and transport error produce visible content plus `UNKNOWN`.
- Accuracy, `UNKNOWN` rate, mean latency, p95 latency, and LLM-call count are reported from the same fixture protocol.
- Unit tests run without a browser, network, or Ollama process.
- Classifications use only `TECH`, `NEWS`, `ENTERTAINMENT`, `OTHER`, and `UNKNOWN`.
