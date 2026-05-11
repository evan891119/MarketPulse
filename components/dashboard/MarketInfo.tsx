import type { MarketQuote } from "@/types/market";

type MarketInfoProps = {
  quote: MarketQuote | null;
};

const numberFormatter = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("zh-TW", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function MarketInfo({ quote }: MarketInfoProps) {
  const marketStats = quote
    ? [
        {
          label: "Last Price",
          value: numberFormatter.format(quote.price),
          tone: quote.change >= 0 ? "positive" : "negative",
        },
        {
          label: "Change",
          value: `${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(
            2,
          )} / ${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`,
          tone: quote.change >= 0 ? "positive" : "negative",
        },
        { label: "Open", value: numberFormatter.format(quote.open) },
        { label: "High", value: numberFormatter.format(quote.high) },
        { label: "Low", value: numberFormatter.format(quote.low) },
        { label: "Volume", value: compactFormatter.format(quote.volume) },
        {
          label: "Best Bid",
          value: quote.bidPrice
            ? `${numberFormatter.format(quote.bidPrice)} / ${quote.bidVolume}`
            : "--",
        },
        {
          label: "Best Ask",
          value: quote.askPrice
            ? `${numberFormatter.format(quote.askPrice)} / ${quote.askVolume}`
            : "--",
        },
      ]
    : [];

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/70">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
          Market Info
        </h2>
      </div>

      <div className="grid gap-px overflow-hidden rounded-b-lg bg-slate-800 sm:grid-cols-2 xl:grid-cols-3">
        {marketStats.map((stat) => (
          <div key={stat.label} className="bg-slate-950 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
              {stat.label}
            </p>
            <p
              className={
                stat.tone === "positive"
                  ? "mt-2 text-lg font-semibold text-emerald-300"
                  : stat.tone === "negative"
                    ? "mt-2 text-lg font-semibold text-rose-300"
                    : "mt-2 text-lg font-semibold text-slate-100"
              }
            >
              {stat.value}
            </p>
          </div>
        ))}
        {marketStats.length === 0 && (
          <div className="bg-slate-950 px-4 py-6 text-sm text-slate-500">
            Loading market information...
          </div>
        )}
      </div>
    </section>
  );
}
