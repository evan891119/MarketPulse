import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { DemoMarketDataProvider } from "./demoMarketDataProvider";
import type { MarketDataProvider, MarketSnapshot } from "@/types/market";

const requiredEnv = ["SHIOAJI_API_KEY", "SHIOAJI_SECRET_KEY"] as const;
const snapshotDirectory = ".marketpulse";
const defaultSnapshotFile = "shioaji-snapshot.json";
const staleSnapshotMs = 20_000;

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
      const [snapshot, snapshotStat] = await Promise.all([
        readFile(snapshotPath, "utf-8").then(
          (content) => JSON.parse(content) as MarketSnapshot,
        ),
        stat(snapshotPath),
      ]);
      const isStale = Date.now() - snapshotStat.mtimeMs > staleSnapshotMs;

      return {
        ...snapshot,
        source: "shioaji",
        mode: snapshot.mode ?? "snapshot",
        status: isStale ? "offline" : snapshot.status,
        statusLabel: isStale ? "Offline" : snapshot.statusLabel,
        message:
          isStale
            ? "Shioaji bridge snapshot is stale. Restart npm run shioaji:bridge to resume live updates."
            : (snapshot.message ??
              "Shioaji quote bridge snapshot loaded from the local runtime file."),
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
      mode: "snapshot",
      status: "offline",
      statusLabel: "Offline",
      message,
    };
  }
}
