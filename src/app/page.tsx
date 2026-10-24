import { EstimateBadge } from "@/components/EstimateBadge";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-6 py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              Utsav Planner
            </span>
            <EstimateBadge source="ai_estimate" confidence="high" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            GenAI Celebration &amp; Event Planning
          </h1>
          <p className="text-lg text-muted-foreground text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Plan Indian weddings, birthdays, and celebrations with real budget constraints,
            dependency-aware timelines, and in-place revisions.
          </p>
        </header>

        <section aria-labelledby="features-heading" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <h2 id="features-heading" className="sr-only">
            Core Features
          </h2>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Dynamic Budget</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ₹ currency formatting, largest-remainder math, and rebalancing by priority.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Dependency Timeline</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Forward &amp; backward pass scheduling with cascade delay detection.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col gap-2">
            <h3 className="text-lg font-semibold">What-If Revisions</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              In-place curveball adaptations preserving completed tasks and confirmed quotes.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
