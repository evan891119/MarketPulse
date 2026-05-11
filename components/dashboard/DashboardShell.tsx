"use client";

import { DashboardHeader } from "./DashboardHeader";
import { MainChart } from "./MainChart";
import { MarketInfo } from "./MarketInfo";
import { TradesPanel } from "./TradesPanel";
import { Watchlist } from "./Watchlist";
import { useMarketData } from "@/hooks/useMarketData";

export function DashboardShell() {
  const { data, isLoading, error } = useMarketData();
  const primaryQuote = data?.symbols[0] ?? null;
  const orderBook = data?.orderBook ?? { asks: [], bids: [] };
  const hasOrderBookLevels = orderBook.asks.length > 0 || orderBook.bids.length > 0;
  const fallbackOrderBook =
    !hasOrderBookLevels && primaryQuote
      ? {
          asks:
            primaryQuote.askPrice && primaryQuote.askVolume
              ? [
                  {
                    price: primaryQuote.askPrice,
                    size: primaryQuote.askVolume,
                  },
                ]
              : [],
          bids:
            primaryQuote.bidPrice && primaryQuote.bidVolume
              ? [
                  {
                    price: primaryQuote.bidPrice,
                    size: primaryQuote.bidVolume,
                  },
                ]
              : [],
        }
      : orderBook;

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <DashboardHeader
          error={error}
          isLoading={isLoading}
          snapshot={data}
        />

        <section className="grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <Watchlist symbols={data?.symbols ?? []} />

          <div className="flex min-w-0 flex-col gap-4">
            <MainChart snapshot={data} />
            <MarketInfo quote={primaryQuote} />
          </div>

          <TradesPanel
            mode={data?.mode ?? "demo"}
            orderBook={fallbackOrderBook}
            trades={data?.trades ?? []}
          />
        </section>
      </div>
    </main>
  );
}
