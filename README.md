# Utsav Planner (PromptWars Virtual Challenge 5)

> A GenAI-powered Celebration & Event Planning web application that transitions users **from inspiration to execution**.
> Specialised for Indian celebrations (₹ currency, Lakh/Crore formatting) under real budget, timeline, and vendor constraints, with real-time in-place plan revisions.

---

## 🌟 Core Capabilities

1. **Smart Intake:** Gather rich event context (occasion, budget in ₹, guest count, city, age groups, accessibility needs, and ranked category priorities) before generating plans.
2. **Dynamic Budget Engine:** Categorized budget split with pure TypeScript largest-remainder apportionment. Distinct `AI Estimate` vs `Confirmed Quote` discrimination (the honesty rule). Rebalances budget overruns across unconfirmed categories by priority order; provides structured trade-offs for >20% overages.
3. **Dependency-Aware Timeline:** Forward and backward pass topological graph scheduling. Moving or delaying a task alerts on cascade slips without corrupting completed tasks. Primary dates show deadlines with slack badges.
4. **Vendor Quote Comparator:** Paste 2–3 raw unstructured vendor quotes to extract base costs, per-guest rates, percentage GST/taxes, hidden fees, included/missing items, and 3 key pre-signing questions.
5. **Live Plan Revision ("What-If Bar"):** In-place adaptation for real-world changes (_"add 50 guests, cut ₹1 Lakh, move date 2 weeks earlier"_), preserving confirmed quotes and completed tasks with an interactive Before vs After diff.
6. **Keyless Demo Mode:** "Load demo wedding" mode allows full exploration of all core features without needing an API key.

---

## 🏗 Architecture & Principles

- **"LLM for language, pure code for math":** All critical mathematical calculations (largest-remainder budget allocation, cycle detection, critical path, topological sort, diffing) reside in pure, tested TypeScript functions. Gemini is reserved for language comprehension, category weights estimation, and extraction.
- **Lean AI Schemas:** Gemini output schemas contain no defaults, regexes, format validations, or `.refine()` blocks. Separate TypeScript mappers convert validated AI outputs into domain entities.
- **Strict Accessibility:** Built with Radix primitives, semantic HTML, ARIA live regions for async state changes, visible focus rings, and automated axe audits in unit and E2E tests.
- **Defense in Depth:** Zero client-side API keys, strict Content Security Policy (CSP) with per-request nonces via Next.js 16 Proxy, automated secret scanning with Secretlint and Gitleaks.

> **Note on Rate Limiting & Quotas:** The application includes an in-memory daily AI call cap per serverless instance to prevent runaway usage during demos. In a serverless production environment (such as Vercel), provider-side quotas set in Google AI Studio / GCP Console serve as the authoritative hard budget backstop.

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 22
- npm ≥ 10

### 1. Clone & Install

```bash
git clone https://github.com/madalapranavsai/Planner_prompt_wars.git
cd Planner_prompt_wars
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GEMINI_API_KEY="your-google-ai-studio-api-key"
GEMINI_MODEL="gemini-3.8-flash"
AI_PROVIDER="gemini"
AI_DAILY_CALL_CAP="500"
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification Scripts

| Script                 | Purpose                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `npm run lint`         | Runs ESLint with Next.js Core Web Vitals & TypeScript flat config                         |
| `npm run format:check` | Verifies code formatting with Prettier                                                    |
| `npm run typecheck`    | Strict TypeScript verification (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| `npm test`             | Runs Vitest unit tests, `vitest-axe` a11y tests, and `fast-check` property tests          |
| `npm run build`        | Builds optimized production bundle                                                        |
| `npm run test:e2e`     | Runs Playwright Chromium E2E specs + `@axe-core/playwright` accessibility audits          |

---

## 🚢 Deployment

Optimized for **Vercel**:

1. Push branch to GitHub.
2. Import project into Vercel Dashboard.
3. Configure `GEMINI_API_KEY` and `GEMINI_MODEL` under **Project Settings > Environment Variables**.
4. Deploy!
