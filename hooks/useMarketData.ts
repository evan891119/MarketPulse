"use client";

import { useEffect, useState } from "react";
import type { MarketSnapshot } from "@/types/market";

type MarketDataState = {
  data: MarketSnapshot | null;
  isLoading: boolean;
  error: string | null;
};

const refreshIntervalMs = 5000;

export function useMarketData() {
  const [state, setState] = useState<MarketDataState>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadMarketData() {
      try {
        const response = await fetch("/api/market", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Market data request failed: ${response.status}`);
        }

        const data = (await response.json()) as MarketSnapshot;

        if (isMounted) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load market data.",
          });
        }
      }
    }

    void loadMarketData();
    const intervalId = window.setInterval(loadMarketData, refreshIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
