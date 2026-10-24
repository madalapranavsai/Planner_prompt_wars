# PROMPTS.md — Prompt Evolution Log

> This log documents the engineering, iteration, and refinement of all Gemini GenAI prompts
> used in **Utsav Planner** (PromptWars Virtual Challenge 5).

---

## Prompt Design Principles

1. **Separation of Concerns:** Code calculates math (exact budget apportioning via largest-remainder, topological schedule dates, cascade delays). Gemini handles language comprehension, category insights, quote extraction, and natural-language curveball interpretation.
2. **Lean JSON Schemas:** AI output schemas are decoupled from domain models. No `.refine()`, regexes, defaults, or format constraints sent to the model. Mapping layers in TypeScript validate and convert AI output to strictly typed domain structures.
3. **Structured & Constrained:** All prompts output strictly structured JSON validated against Zod schemas.
4. **Honesty by Default:** The model is instructed to output category weights instead of rupee totals, never produce invented prices as confirmed quotes, and flag ambiguities.
5. **Untrusted Data Isolation:** Raw user input (such as pasted vendor quotes) is delimited and sanitized with explicit tripwire flags for prompt-injection defense.

---

## Prompt Inventory & Changelog

### 1. `plan-estimate@v1` (Core)

- **Target:** Category weights + rationale + confidence for Indian celebration market.
- **Key Constraints:** Outputs relative weights only (code allocates rupees via largest-remainder); never invents confirmed prices; labels all lines as `ai_estimate`.
- **Learnings:** Outputting raw rupee totals directly from an LLM invariably leads to rounding mismatches with the user's top-line budget. Outputting weights eliminates arithmetic drift.

### 2. `revision-parse@v1` (Core)

- **Target:** Natural language curveball parsing (e.g., _"add 50 guests, cut ₹1 Lakh, move 2 weeks earlier"_).
- **Key Constraints:** Understands Indian numeric denominations (lakh, crore, k), date shifts, and vendor cancellations; rejects unrecognized intents with structured `unsupported` items.

### 3. `quote-extract@v1` (Core)

- **Target:** Structured comparison of 2–3 raw vendor quotes.
- **Key Constraints:** Parses base cost, per-guest rates, itemized fees, taxes (including percentage GST), included/missing items, and 3 critical pre-signing questions. Fences raw quotes to prevent prompt injection.

### 4. `vendor-questions@v1` (Core)

- **Target:** Generating tailored pre-signing negotiation and due-diligence questions based on event priorities, age groups, and accessibility needs.

### 5. `task-tailor@v1` (Stretch)

- **Target:** Event-specific task suggestions augmenting baseline DAG templates.
- **Key Constraints:** Suggests maximum 5 tasks; must reference existing template IDs; cycle detection run in code before acceptance.

### 6. `intake-parse@v1` (Stretch)

- **Target:** Unstructured natural language celebration descriptions into partial `EventProfile`.
- **Key Constraints:** Never guesses budget or dates; flags missing essential fields for user form confirmation.

### 7. `insight-narrate@v1` (Stretch)

- **Target:** Human-friendly narration of pure-TS calculated budget trade-offs and timeline recovery options.
