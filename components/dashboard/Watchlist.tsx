import type { MarketQuote } from "@/types/market";

type WatchlistProps = {
  symbols: MarketQuote[];
};

const numberFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 2,
});

export function Watchlist({ symbols }: WatchlistProps) {
  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Watchlist
        </h2>
        <span className="text-xs text-slate-500">{symbols.length} symbols</span>
      </div>

      <div className="divide-y divide-slate-800/80">
        {symbols.map((item) => {
          const isUp = item.change >= 0;

          return (
            <button
              key={item.symbol}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-4 text-left transition hover:bg-slate-900/80"
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {item.symbol}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {item.name} · {item.venue}
                </span>
              </span>

              <span className="text-right">
                <span className="block text-sm font-medium text-slate-100">
                  {numberFormatter.format(item.price)}
                </span>
                <span
                  className={
                    isUp
                      ? "mt-1 block text-xs font-medium text-emerald-300"
                      : "mt-1 block text-xs font-medium text-rose-300"
                  }
                >
                  {isUp ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </span>
              </span>
            </button>
          );
        })}
        {symbols.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-500">
            Loading Taiwan stock watchlist...
          </div>
        )}
      </div>
    </aside>
  );
}
