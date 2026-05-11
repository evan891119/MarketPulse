import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DemoMarketDataProvider } from "./demoMarketDataProvider";
import type { MarketDataProvider, MarketSnapshot } from "@/types/market";

const requiredEnv = ["SHIOAJI_API_KEY", "SHIOAJI_SECRET_KEY"] as const;
const snapshotDirectory = ".marketpulse";
const defaultSnapshotFile = "shioaji-snapshot.json";

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

    const snapshotPath = join(
      process.cwd(),
      snapshotDirectory,
      process.env.SHIOAJI_SNAPSHOT_FILE || defaultSnapshotFile,
    );

    try {
      const snapshot = JSON.parse(
        await readFile(snapshotPath, "utf-8"),
      ) as MarketSnapshot;

      return {
        ...snapshot,
        source: "shioaji",
        message:
          snapshot.message ??
          "Shioaji quote bridge snapshot loaded from the local runtime file.",
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";

      return this.getFallbackSnapshot(
        `Shioaji bridge snapshot is unavailable at ${snapshotPath}: ${reason}.`,
      );
    }
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
