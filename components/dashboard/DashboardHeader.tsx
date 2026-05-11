import type { MarketConnectionStatus, MarketSnapshot } from "@/types/market";

type DashboardHeaderProps = {
  snapshot: MarketSnapshot | null;
  isLoading: boolean;
  error: string | null;
};

const statusStyles: Record<MarketConnectionStatus, string> = {
  connected: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  demo: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
  reconnecting: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  offline: "border-rose-500/25 bg-rose-500/10 text-rose-200",
};

const dotStyles: Record<MarketConnectionStatus, string> = {
  connected: "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]",
  demo: "bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.8)]",
  reconnecting: "bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.8)]",
  offline: "bg-rose-300 shadow-[0_0_16px_rgba(253,164,175,0.8)]",
};

const modeLabels = {
  demo: "Demo",
  live: "Live stream",
  snapshot: "Snapshot",
  kbar: "KBar fallback",
};

export function DashboardHeader({
  snapshot,
  isLoading,
  error,
}: DashboardHeaderProps) {
  const status: MarketConnectionStatus =
    snapshot?.status ?? (error ? "offline" : "reconnecting");
  const statusLabel = isLoading
    ? "Loading"
    : (snapshot?.statusLabel ?? "Offline");
  const updatedAt = snapshot
    ? new Intl.DateTimeFormat("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Taipei",
      }).format(new Date(snapshot.updatedAt))
    : "--:--:--";

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          MarketPulse
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Taiwan market dashboard · Shioaji-ready boundary
        </p>
        {(snapshot?.message || error) && (
          <p className="mt-2 max-w-2xl text-xs text-slate-500">
            {error ?? snapshot?.message}
          </p>
        )}
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[560px]">
        <div className={`rounded-md border px-4 py-3 ${statusStyles[status]}`}>
          <p className="text-xs uppercase tracking-[0.18em] opacity-80">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2 font-medium">
            <span className={`h-2 w-2 rounded-full ${dotStyles[status]}`} />
            {statusLabel}
            {snapshot ? ` · ${modeLabels[snapshot.mode]}` : ""}
          </div>
        </div>

        <div className="rounded-md border border-slate-800 bg-slate-900/80 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Last Update
          </p>
          <p className="mt-2 font-medium text-slate-200">{updatedAt} UTC+8</p>
        </div>

        <div className="rounded-md border border-slate-800 bg-slate-900/80 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Primary Symbol
          </p>
          <p className="mt-2 font-medium text-slate-200">
            {snapshot?.primarySymbol ?? "2330"}
          </p>
        </div>
      </div>
    </header>
  );
}
