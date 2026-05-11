import { NextResponse } from "next/server";
import { getMarketDataProvider } from "@/lib/market/getMarketDataProvider";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getMarketDataProvider();
  const snapshot = await provider.getSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
