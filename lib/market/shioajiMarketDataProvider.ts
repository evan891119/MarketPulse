import { DemoMarketDataProvider } from "./demoMarketDataProvider";
import type { MarketDataProvider, MarketSnapshot } from "@/types/market";

const requiredEnv = ["SHIOAJI_API_KEY", "SHIOAJI_SECRET_KEY"] as const;

export class ShioajiMarketDataProvider implements MarketDataProvider {
  async getSnapshot(): Promise<MarketSnapshot> {
    const missingEnv = requiredEnv.filter((key) => !process.env[key]);

    if (missingEnv.length > 0) {
      return this.getFallbackSnapshot(
        `Missing server-side Shioaji environment variables: ${missingEnv.join(
          ", ",
        )}.`,
      );
    }

    if (process.env.SHIOAJI_FORCE_SIMULATION !== "true") {
      return this.getFallbackSnapshot(
        "SHIOAJI_FORCE_SIMULATION must be true before the Shioaji provider can run.",
      );
    }

    return this.getFallbackSnapshot(
      "Shioaji credentials are present, but the Python streaming bridge is not implemented in this Next.js boundary yet.",
    );
  }

  private async getFallbackSnapshot(message: string): Promise<MarketSnapshot> {
    const snapshot = await new DemoMarketDataProvider().getSnapshot();

    return {
      ...snapshot,
      source: "shioaji",
      status: "offline",
      statusLabel: "Offline",
      message,
    };
  }
}
