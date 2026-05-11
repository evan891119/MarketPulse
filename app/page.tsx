export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-300">
            MVP Foundation
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            MarketPulse
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            A clean Next.js, TypeScript, and Tailwind CSS foundation for a
            real-time financial market dashboard. Dashboard modules, mock data,
            and simulated realtime updates are planned as separate Linear
            issues.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["Framework", "Next.js App Router"],
            ["Language", "TypeScript"],
            ["Styling", "Tailwind CSS"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-5"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-base font-medium text-slate-100">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
