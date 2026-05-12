"use client";

import { useMemo, useState } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { MainChart } from "./MainChart";
import { MarketInfo } from "./MarketInfo";
import { TradesPanel } from "./TradesPanel";
import { Watchlist } from "./Watchlist";
import { useMarketData } from "@/hooks/useMarketData";
import type { ChartPoint, MarketQuote, OrderBook, TradeTick } from "@/types/market";

const intervals = ["1m", "5m", "15m", "1h", "1d"] as const;
export type ChartInterval = (typeof intervals)[number];

function buildFallbackChart(quote: MarketQuote | null): ChartPoint[] {
  if (!quote) {
    return [];
  }

  const anchors = [
    quote.open,
    (quote.open + quote.high) / 2,
    quote.high,
    (quote.high + quote.low) / 2,
    quote.low,
    (quote.low + quote.price) / 2,
    quote.price,
  ];

  return anchors.map((value, index) => ({
    time: `${index + 1}`,
    value,
  }));
}

function resampleChart(chart: ChartPoint[], interval: ChartInterval) {
  const stepByInterval: Record<ChartInterval, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 30,
    "1d": 80,
  };
  const step = stepByInterval[interval];

  if (step <= 1) {
    return chart;
  }

  const sampled = chart.filter((_, index) => index % step === 0);
  const lastPoint = chart.at(-1);

  if (lastPoint && sampled.at(-1) !== lastPoint) {
    sampled.push(lastPoint);
  }

  return sampled.length > 0 ? sampled : chart;
}

function buildQuoteOrderBook(quote: MarketQuote | null): OrderBook {
  if (!quote) {
    return { asks: [], bids: [] };
  }

  return {
    asks:
      quote.askPrice && quote.askVolume
        ? [{ price: quote.askPrice, size: quote.askVolume }]
        : [],
    bids:
      quote.bidPrice && quote.bidVolume
        ? [{ price: quote.bidPrice, size: quote.bidVolume }]
        : [],
  };
}

function getTradeSymbol(trade: TradeTick) {
  if (trade.symbol) {
    return trade.symbol;
  }

  const parts = trade.id.split("-");
  return parts[0] === "historical" ? parts[1] : parts[0];
}

export function DashboardShell() {
  const { data, isLoading, error } = useMarketData();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] =
    useState<ChartInterval>("1m");
  const firstSymbol = data?.symbols[0]?.symbol ?? null;
  const activeSymbol =
    selectedSymbol &&
    data?.symbols.some((symbol) => symbol.symbol === selectedSymbol)
      ? selectedSymbol
      : firstSymbol;
  const selectedQuote =
    data?.symbols.find((symbol) => symbol.symbol === activeSymbol) ??
    data?.symbols[0] ??
    null;
  const chart = useMemo(() => {
    const baseChart =
      selectedQuote?.symbol === data?.primarySymbol
        ? (data?.chart ?? [])
        : buildFallbackChart(selectedQuote);

    return resampleChart(baseChart, selectedInterval);
  }, [data?.chart, data?.primarySymbol, selectedInterval, selectedQuote]);
  const primaryOrderBook = data?.orderBook ?? { asks: [], bids: [] };
  const hasPrimaryOrderBookLevels =
    primaryOrderBook.asks.length > 0 || primaryOrderBook.bids.length > 0;
  const selectedOrderBook =
    selectedQuote?.symbol === data?.primarySymbol && hasPrimaryOrderBookLevels
      ? primaryOrderBook
      : buildQuoteOrderBook(selectedQuote);
  const selectedTrades = (data?.trades ?? []).filter(
    (trade) => getTradeSymbol(trade) === activeSymbol,
  );

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <DashboardHeader
          error={error}
          isLoading={isLoading}
          snapshot={data}
        />

        <section className="grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <Watchlist
            onSelectSymbol={setSelectedSymbol}
            selectedSymbol={activeSymbol}
            symbols={data?.symbols ?? []}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <MainChart
              chart={chart}
              interval={selectedInterval}
              intervals={intervals}
              onSelectInterval={setSelectedInterval}
              quote={selectedQuote}
              snapshot={data}
            />
            <MarketInfo quote={selectedQuote} />
          </div>

          <TradesPanel
            mode={data?.mode ?? "demo"}
            orderBook={selectedOrderBook}
            trades={selectedTrades}
          />
        </section>
      </div>
    </main>
  );
}
