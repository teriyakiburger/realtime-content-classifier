# Vision

## Problem

Web applications insert content after initial page load. A useful classifier must observe that content, avoid duplicate work, classify it with predictable behavior, and remain safe when local inference is slow or unavailable.

## Goal

Evaluate three architectures on a controlled self-hosted demo SPA:

- rule-only;
- LLM-only;
- rule-first with LLM fallback.

The evaluation should make tradeoffs visible rather than optimize prematurely for one implementation.

## Non-goals

- scraping or targeting third-party websites;
- sending content to external LLM APIs;
- production moderation, enforcement, or legal/compliance decisions;
- claiming benchmark results before a reproducible fixture set and measurement protocol exist.

## Success

The project produces reproducible measurements for accuracy, `UNKNOWN` rate, mean latency, p95 latency, and LLM-call count, while preserving page usability during failures.
