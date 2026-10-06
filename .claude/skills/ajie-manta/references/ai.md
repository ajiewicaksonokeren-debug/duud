# LLM / AI features

- Check current model IDs, pricing and limits from official docs at build time — never from memory.
- Use structured output (JSON schema / tool use) when code consumes the result; validate it anyway.
- Timeouts + retry with backoff on 429/5xx; stream long responses to the UI.
- Prompt caching for large stable prefixes (system prompt, docs).
- Cap cost: max tokens per call, per-user rate limit, daily budget alert.
- Never send secrets or unnecessary personal data in prompts; log prompts without PII.
- Keep a small eval set (10–50 real cases) and run it before changing prompt or model.
- Treat model output as untrusted input: no executing it, escape before rendering.
