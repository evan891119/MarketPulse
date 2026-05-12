export type MarketConnectionStatus =
  | "connected"
  | "reconnecting"
  | "offline"
  | "demo";

export type MarketDataSource = "demo" | "shioaji";
export type MarketDataMode = "demo" | "live" | "snapshot" | "kbar";

export type MarketSymbol = {
  symbol: string;
  name: string;
  venue: "TWSE" | "TPEX" | "TAIFEX" | "Crypto" | "US";
};

export type MarketQuote = MarketSymbol & {
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  bidPrice?: number;
  bidVolume?: number;
  askPrice?: number;
  askVolume?: number;
  updatedAt: string;
};

export type ChartPoint = {
  time: string;
  value: number;
};

export type TradeTick = {
  id: string;
  symbol?: string;
  time: string;
  price: number;
  size: number;
  side: "buy" | "sell" | "unknown";
};

export type OrderBookLevel = {
  price: number;
  size: number;
};

export type OrderBook = {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
};

export type MarketSnapshot = {
  source: MarketDataSource;
  mode: MarketDataMode;
  status: MarketConnectionStatus;
  statusLabel: string;
  primarySymbol: string;
  symbols: MarketQuote[];
  chart: ChartPoint[];
  trades: TradeTick[];
  orderBook: OrderBook;
  updatedAt: string;
  message?: string;
};

export interface MarketDataProvider {
  getSnapshot(): Promise<MarketSnapshot>;
}
