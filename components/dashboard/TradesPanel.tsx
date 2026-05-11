import type { OrderBook, TradeTick } from "@/types/market";

type TradesPanelProps = {
  trades: TradeTick[];
  orderBook?: OrderBook;
};

const priceFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 2,
});

export function TradesPanel({ trades, orderBook }: TradesPanelProps) {
  const levels = [
    ...(orderBook?.asks ?? []).map((level) => ({ ...level, side: "sell" })),
    ...(orderBook?.bids ?? []).map((level) => ({ ...level, side: "buy" })),
  ];

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Recent Trades
        </h2>
        <span className="text-xs text-slate-500">tick</span>
      </div>

      <div className="grid grid-cols-[1fr_1fr_0.8fr] gap-2 border-b border-slate-800 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
      </div>

      <div className="divide-y divide-slate-800/80">
        {trades.map((trade) => {
          const isBuy = trade.side === "buy";

          return (
            <div
              key={trade.id}
              className="grid grid-cols-[1fr_1fr_0.8fr] gap-2 px-4 py-3 text-sm"
            >
              <span className="font-mono text-slate-400">{trade.time}</span>
              <span
                className={
                  isBuy
                    ? "text-right font-mono text-emerald-300"
                    : "text-right font-mono text-rose-300"
                }
              >
                {priceFormatter.format(trade.price)}
              </span>
              <span className="text-right font-mono text-slate-300">
                {trade.size}
              </span>
            </div>
          );
        })}
        {trades.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-500">
            Loading tick data...
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Order Book
        </h3>
        <div className="mt-3 space-y-2">
          {levels.map(({ price, size, side }) => (
            <div
              key={`${price}-${side}`}
              className="grid grid-cols-[1fr_1fr] text-sm"
            >
              <span
                className={
                  side === "buy"
                    ? "font-mono text-emerald-300"
                    : "font-mono text-rose-300"
                }
              >
                {priceFormatter.format(price)}
              </span>
              <span className="text-right font-mono text-slate-400">
                {size}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
