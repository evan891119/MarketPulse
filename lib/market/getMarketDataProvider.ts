import { DemoMarketDataProvider } from "./demoMarketDataProvider";
import { ShioajiMarketDataProvider } from "./shioajiMarketDataProvider";
import type { MarketDataProvider } from "@/types/market";

export function getMarketDataProvider(): MarketDataProvider {
  if (process.env.MARKET_DATA_PROVIDER === "shioaji") {
    return new ShioajiMarketDataProvider();
  }

  return new DemoMarketDataProvider();
}
