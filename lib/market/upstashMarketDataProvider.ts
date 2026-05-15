import { DemoMarketDataProvider } from "./demoMarketDataProvider";
import type { MarketDataProvider, MarketSnapshot } from "@/types/market";

const defaultSnapshotKey = "marketpulse:snapshot";
const defaultMaxAgeMs = 20_000;

type UpstashGetResponse = {
  result?: string | null;
  error?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getMaxAgeMs() {
  const value = Number(process.env.MARKETPULSE_SNAPSHOT_MAX_AGE_MS);
  return Number.isFinite(value) && value > 0 ? value : defaultMaxAgeMs;
}

export class UpstashMarketDataProvider implements MarketDataProvider {
  async getSnapshot(): Promise<MarketSnapshot> {
    try {
      const restUrl = getRequiredEnv("UPSTASH_REDIS_REST_URL").replace(/\/$/, "");
      const token =
        process.env.UPSTASH_REDIS_REST_READ_TOKEN ??
        getRequiredEnv("UPSTASH_REDIS_REST_TOKEN");
      const snapshotKey =
        process.env.MARKETPULSE_SNAPSHOT_KEY ?? defaultSnapshotKey;
      const response = await fetch(
        `${restUrl}/get/${encodeURIComponent(snapshotKey)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Upstash returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as UpstashGetResponse;

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (!payload.result) {
        throw new Error(`Snapshot key ${snapshotKey} is empty`);
      }

      const snapshot = JSON.parse(payload.result) as MarketSnapshot;
      const updatedAtMs = Date.parse(snapshot.updatedAt);
      const isStale =
        Number.isFinite(updatedAtMs) && Date.now() - updatedAtMs > getMaxAgeMs();

      return {
        ...snapshot,
        source: "upstash",
        status: isStale ? "offline" : snapshot.status,
        statusLabel: isStale ? "Offline" : snapshot.statusLabel,
        message: isStale
          ? "Upstash market snapshot is stale. Check the NAS Shioaji bridge container."
          : (snapshot.message ??
            "Market snapshot loaded from Upstash Redis."),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      const fallback = await new DemoMarketDataProvider().getSnapshot();

      return {
        ...fallback,
        source: "upstash",
        mode: "snapshot",
        status: "offline",
        statusLabel: "Offline",
        message: `Upstash market snapshot is unavailable: ${reason}.`,
      };
    }
  }
}
