import { DemoMarketDataProvider } from "./demoMarketDataProvider";
import { ShioajiMarketDataProvider } from "./shioajiMarketDataProvider";
import { UpstashMarketDataProvider } from "./upstashMarketDataProvider";
import type { MarketDataProvider } from "@/types/market";

export function getMarketDataProvider(): MarketDataProvider {
  if (process.env.MARKET_DATA_PROVIDER === "upstash") {
    return new UpstashMarketDataProvider();
  }

  if (process.env.MARKET_DATA_PROVIDER === "shioaji") {
    return new ShioajiMarketDataProvider();
  }

  return new DemoMarketDataProvider();
}
