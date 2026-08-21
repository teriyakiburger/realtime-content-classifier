# Realtime Content Classifier

A self-hosted TypeScript/Vite PoC for classifying dynamically inserted content with three strategies: deterministic rules, local LLM inference, and Rule-first classification with local Mistral fallback.

The taxonomy is `TECH`, `NEWS`, `ENTERTAINMENT`, `OTHER`, and `UNKNOWN`. DOM observation, metadata extraction, classification, orchestration, and the Ollama adapter are separate layers.

## Local setup

Requirements: Node.js 20+ and, for Mistral/Hybrid modes, a local [Ollama](https://ollama.com/) server with `mistral:latest` available. The browser uses the Vite `/ollama` proxy; the default Ollama endpoint is `http://localhost:11434`. Override the browser base URL with `VITE_OLLAMA_BASE_URL` when needed.

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. Rule mode works without Ollama; Mistral 7B and Hybrid modes require the local model and server.

## Tests and evaluation

```powershell
npm test
npm run typecheck
npm run evaluate:holdout
npm run render:dashboard
```

The fixed evaluation artifacts are in `testdata/` and `reports/`. Benchmark results are proof-of-concept measurements from one local environment, not universal model benchmarks. Models are accessed through Ollama; model weights are not distributed with this repository.

## Documentation

See [docs/VISION.md](docs/VISION.md), [docs/SPEC.md](docs/SPEC.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md).

## License

Repository source code is licensed under the MIT License. Ollama, Mistral, Gemma, and all npm dependencies remain subject to their own licenses and terms.
