import type { ChartPoint, MarketQuote, MarketSnapshot } from "@/types/market";
import type { ChartInterval } from "./DashboardShell";

const width = 760;
const height = 320;

type MainChartProps = {
  chart: ChartPoint[];
  interval: ChartInterval;
  intervals: readonly ChartInterval[];
  onSelectInterval: (interval: ChartInterval) => void;
  quote: MarketQuote | null;
  snapshot: MarketSnapshot | null;
};

const modeLabels = {
  demo: "Demo data",
  live: "Live Tick stream",
  snapshot: "Shioaji snapshot",
  kbar: "Historical KBar fallback",
};

function getLinePoints(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((point, index) => {
      const divisor = Math.max(values.length - 1, 1);
      const x = (index / divisor) * width;
      const y = height - ((point - min) / range) * (height - 42) - 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MainChart({
  chart,
  interval,
  intervals,
  onSelectInterval,
  quote,
  snapshot,
}: MainChartProps) {
  const values =
    chart.length > 0 ? chart.map((point) => point.value) : [quote?.price ?? 0, quote?.price ?? 0];
  const linePoints = getLinePoints(values);
  const mode = snapshot?.mode ?? "demo";

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/70">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            {quote
              ? `${quote.name} ${quote.symbol}`
              : "Taiwan Stock"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {modeLabels[mode]} · Asia/Taipei market time
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {intervals.map((item) => (
            <button
              key={item}
              aria-pressed={item === interval}
              className={
                item === interval
                  ? "h-8 rounded-md bg-emerald-400 px-3 font-medium text-slate-950"
                  : "h-8 rounded-md border border-slate-800 px-3 font-medium text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }
              onClick={() => onSelectInterval(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5">
        <div className="relative overflow-hidden rounded-md border border-slate-800 bg-[#08111d]">
          <svg
            aria-label="Mock intraday price chart"
            className="h-[320px] w-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((line) => (
              <line
                key={line}
                stroke="#1e293b"
                strokeWidth="1"
                x1="0"
                x2={width}
                y1={(line + 1) * 64}
                y2={(line + 1) * 64}
              />
            ))}

            <polygon
              fill="url(#chartFill)"
              points={`0,${height} ${linePoints} ${width},${height}`}
            />
            <polyline
              fill="none"
              points={linePoints}
              stroke="#34d399"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>

          <div className="absolute left-4 top-4 rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2">
            <p className="text-xs text-slate-500">Price</p>
            <p className="text-lg font-semibold text-emerald-300">
              {quote?.price.toFixed(2) ?? "--"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
