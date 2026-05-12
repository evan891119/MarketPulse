from __future__ import annotations

import json
import os
import signal
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from datetime import date, datetime, time as time_of_day, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


DEFAULT_SYMBOLS = ["2330", "2317", "2454", "2412"]
DEFAULT_SNAPSHOT_PATH = ".marketpulse/shioaji-snapshot.json"
ENV_FILE = ".env.local"
TAIPEI_TZ = ZoneInfo("Asia/Taipei")
TWSE_OPEN = time_of_day(9, 0)
TWSE_CLOSE = time_of_day(13, 30)


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


def require_env(name: str) -> str:
    value = os.environ.get(name)

    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")

    return value


def decimal_to_float(value: Any, fallback: float = 0) -> float:
    if value is None:
        return fallback

    if isinstance(value, Decimal):
        return float(value)

    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def int_value(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def iso_time(value: Any | None = None) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)

        return value.isoformat()

    return datetime.now(timezone.utc).isoformat()


def local_time_label(value: Any | None = None) -> str:
    if isinstance(value, datetime):
        return value.strftime("%H:%M:%S")

    return datetime.now().strftime("%H:%M:%S")


def kbar_time_label(value: Any | None = None) -> str:
    if isinstance(value, datetime):
        return value.astimezone(TAIPEI_TZ).strftime("%m/%d %H:%M")

    return datetime.now(TAIPEI_TZ).strftime("%m/%d %H:%M")


def shioaji_ts_to_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value

    try:
        timestamp = int(value)
    except (TypeError, ValueError):
        return None

    if timestamp > 10**17:
        seconds = timestamp / 1_000_000_000
    elif timestamp > 10**14:
        seconds = timestamp / 1_000_000
    elif timestamp > 10**11:
        seconds = timestamp / 1_000
    else:
        seconds = timestamp

    return datetime.fromtimestamp(seconds, tz=timezone.utc).replace(tzinfo=TAIPEI_TZ)


def recent_market_dates(days: int = 7) -> list[str]:
    today = date.today()
    return [
        (today - timedelta(days=offset)).isoformat()
        for offset in range(days)
        if (today - timedelta(days=offset)).weekday() < 5
    ]


def is_twse_regular_session(now: datetime | None = None) -> bool:
    current = now or datetime.now(TAIPEI_TZ)

    if current.weekday() >= 5:
        return False

    current_time = current.time()
    return TWSE_OPEN <= current_time <= TWSE_CLOSE


def recent_kbar_range(days: int = 10) -> tuple[str, str]:
    today = date.today()
    start = today - timedelta(days=days)
    return start.isoformat(), today.isoformat()


def symbol_names() -> dict[str, str]:
    return {
        "2330": "TSMC",
        "2317": "Hon Hai",
        "2454": "MediaTek",
        "2412": "Chunghwa Telecom",
    }


@dataclass
class QuoteState:
    symbol: str
    name: str
    venue: str = "TWSE"
    price: float = 0
    previous_close: float = 0
    change: float = 0
    change_percent: float = 0
    open: float = 0
    high: float = 0
    low: float = 0
    volume: int = 0
    turnover: float = 0
    bid_price: float | None = None
    bid_volume: int | None = None
    ask_price: float | None = None
    ask_volume: int | None = None
    updated_at: str = field(default_factory=iso_time)

    def to_json(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "name": self.name,
            "venue": self.venue,
            "price": self.price,
            "previousClose": self.previous_close,
            "change": self.change,
            "changePercent": self.change_percent,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "volume": self.volume,
            "turnover": self.turnover,
            "bidPrice": self.bid_price,
            "bidVolume": self.bid_volume,
            "askPrice": self.ask_price,
            "askVolume": self.ask_volume,
            "updatedAt": self.updated_at,
        }


class SnapshotStore:
    def __init__(self, symbols: list[str], snapshot_path: Path):
        names = symbol_names()
        self.symbols = symbols
        self.snapshot_path = snapshot_path
        self.lock = threading.Lock()
        self.quotes = {
            symbol: QuoteState(symbol=symbol, name=names.get(symbol, symbol))
            for symbol in symbols
        }
        self.chart: list[dict[str, Any]] = []
        self.trades: list[dict[str, Any]] = []
        self.order_book = {"asks": [], "bids": []}
        self.updated_at = iso_time()
        self.mode = "snapshot"

    def update_tick(self, tick: Any) -> None:
        symbol = str(getattr(tick, "code", ""))

        if symbol not in self.quotes:
            return

        tick_time = getattr(tick, "datetime", None)
        price = decimal_to_float(getattr(tick, "close", None))
        change = decimal_to_float(getattr(tick, "price_chg", None))
        change_percent = decimal_to_float(getattr(tick, "pct_chg", None))
        previous_close = price - change if price else 0

        with self.lock:
            quote = self.quotes[symbol]
            quote.price = price
            quote.change = change
            quote.change_percent = change_percent
            quote.previous_close = previous_close
            quote.open = decimal_to_float(getattr(tick, "open", None), quote.open)
            quote.high = decimal_to_float(getattr(tick, "high", None), quote.high)
            quote.low = decimal_to_float(getattr(tick, "low", None), quote.low)
            quote.volume = int_value(getattr(tick, "total_volume", None), quote.volume)
            quote.turnover = decimal_to_float(
                getattr(tick, "total_amount", None),
                quote.turnover,
            )
            quote.updated_at = iso_time(tick_time)
            self.updated_at = quote.updated_at

            if symbol == self.symbols[0] and price:
                self.chart.append({"time": local_time_label(tick_time), "value": price})
                self.chart = self.chart[-80:]

            self.trades.insert(
                0,
                {
                    "id": f"{symbol}-{time.time_ns()}",
                    "symbol": symbol,
                    "time": local_time_label(tick_time),
                    "price": price,
                    "size": int_value(getattr(tick, "volume", None)),
                    "side": self.tick_side(getattr(tick, "tick_type", None)),
                },
            )
            self.trades = self.trades[:40]
            self.mode = "live"

            self.write_snapshot_locked()

    def update_bidask(self, bidask: Any) -> None:
        symbol = str(getattr(bidask, "code", ""))

        if symbol not in self.quotes:
            return

        bid_prices = list(getattr(bidask, "bid_price", []) or [])
        bid_volumes = list(getattr(bidask, "bid_volume", []) or [])
        ask_prices = list(getattr(bidask, "ask_price", []) or [])
        ask_volumes = list(getattr(bidask, "ask_volume", []) or [])
        updated_at = iso_time(getattr(bidask, "datetime", None))

        with self.lock:
            quote = self.quotes[symbol]

            if bid_prices:
                quote.bid_price = decimal_to_float(bid_prices[0])
                quote.bid_volume = int_value(bid_volumes[0] if bid_volumes else None)

            if ask_prices:
                quote.ask_price = decimal_to_float(ask_prices[0])
                quote.ask_volume = int_value(ask_volumes[0] if ask_volumes else None)

            quote.updated_at = updated_at
            self.updated_at = updated_at

            if symbol == self.symbols[0]:
                self.order_book = {
                    "asks": [
                        {
                            "price": decimal_to_float(price),
                            "size": int_value(ask_volumes[index] if index < len(ask_volumes) else None),
                        }
                        for index, price in enumerate(ask_prices[:5])
                    ],
                    "bids": [
                        {
                            "price": decimal_to_float(price),
                            "size": int_value(bid_volumes[index] if index < len(bid_volumes) else None),
                        }
                        for index, price in enumerate(bid_prices[:5])
                    ],
                }

            self.mode = "live"
            self.write_snapshot_locked()

    def update_snapshot_quote(self, snapshot: Any) -> None:
        symbol = str(getattr(snapshot, "code", ""))

        if symbol not in self.quotes:
            return

        snapshot_time = shioaji_ts_to_datetime(getattr(snapshot, "ts", None))
        price = decimal_to_float(getattr(snapshot, "close", None))
        change = decimal_to_float(getattr(snapshot, "change_price", None))

        with self.lock:
            quote = self.quotes[symbol]
            quote.price = price
            quote.change = change
            quote.change_percent = decimal_to_float(
                getattr(snapshot, "change_rate", None),
                quote.change_percent,
            )
            quote.previous_close = price - change if price else quote.previous_close
            quote.open = decimal_to_float(getattr(snapshot, "open", None), quote.open)
            quote.high = decimal_to_float(getattr(snapshot, "high", None), quote.high)
            quote.low = decimal_to_float(getattr(snapshot, "low", None), quote.low)
            quote.volume = int_value(
                getattr(snapshot, "total_volume", None),
                quote.volume,
            )
            quote.turnover = decimal_to_float(
                getattr(snapshot, "total_amount", None),
                quote.turnover,
            )
            quote.bid_price = decimal_to_float(
                getattr(snapshot, "buy_price", None),
                quote.bid_price or 0,
            )
            quote.bid_volume = int_value(
                getattr(snapshot, "buy_volume", None),
                quote.bid_volume or 0,
            )
            quote.ask_price = decimal_to_float(
                getattr(snapshot, "sell_price", None),
                quote.ask_price or 0,
            )
            quote.ask_volume = int_value(
                getattr(snapshot, "sell_volume", None),
                quote.ask_volume or 0,
            )
            quote.updated_at = iso_time(snapshot_time)
            self.updated_at = quote.updated_at
            self.mode = "snapshot"

    def update_kbars(self, kbars: Any) -> None:
        timestamps = list(getattr(kbars, "ts", []) or [])
        closes = list(getattr(kbars, "Close", []) or [])

        if not timestamps or not closes:
            return

        opens = list(getattr(kbars, "Open", []) or [])
        highs = list(getattr(kbars, "High", []) or [])
        lows = list(getattr(kbars, "Low", []) or [])
        volumes = list(getattr(kbars, "Volume", []) or [])
        chart = []

        for index, close in enumerate(closes[-80:]):
            source_index = len(closes) - min(len(closes), 80) + index
            timestamp = (
                shioaji_ts_to_datetime(timestamps[source_index])
                if source_index < len(timestamps)
                else None
            )
            chart.append(
                {
                    "time": kbar_time_label(timestamp),
                    "value": decimal_to_float(close),
                },
            )

        last_index = len(closes) - 1
        first_index = max(0, len(closes) - min(len(closes), 80))
        last_time = (
            shioaji_ts_to_datetime(timestamps[last_index])
            if last_index < len(timestamps)
            else None
        )
        close = decimal_to_float(closes[last_index])
        open_price = decimal_to_float(opens[first_index]) if opens else close
        high = max(decimal_to_float(value) for value in highs[first_index:]) if highs else close
        low = min(decimal_to_float(value) for value in lows[first_index:]) if lows else close
        volume = sum(int_value(value) for value in volumes[first_index:]) if volumes else 0

        with self.lock:
            primary_quote = self.quotes[self.symbols[0]]
            primary_quote.price = close
            primary_quote.open = open_price
            primary_quote.high = high
            primary_quote.low = low
            primary_quote.volume = volume
            primary_quote.updated_at = iso_time(last_time)
            self.chart = chart
            self.updated_at = primary_quote.updated_at
            self.mode = "kbar"

    def update_historical_ticks(self, ticks: Any) -> None:
        timestamps = list(getattr(ticks, "ts", []) or [])
        closes = list(getattr(ticks, "close", []) or [])

        if not timestamps or not closes:
            return

        volumes = list(getattr(ticks, "volume", []) or [])
        tick_types = list(getattr(ticks, "tick_type", []) or [])
        recent_trades = []

        for index, close in enumerate(closes[-40:]):
            source_index = len(closes) - min(len(closes), 40) + index
            timestamp = (
                shioaji_ts_to_datetime(timestamps[source_index])
                if source_index < len(timestamps)
                else None
            )
            tick_type = tick_types[source_index] if source_index < len(tick_types) else 0
            volume = volumes[source_index] if source_index < len(volumes) else 0
            recent_trades.append(
                {
                    "id": f"historical-{self.symbols[0]}-{source_index}",
                    "symbol": self.symbols[0],
                    "time": local_time_label(timestamp),
                    "price": decimal_to_float(close),
                    "size": int_value(volume),
                    "side": self.tick_side(tick_type),
                },
            )

        with self.lock:
            self.trades = list(reversed(recent_trades))
            if self.mode != "live":
                self.mode = "kbar"

    def fill_order_book_from_primary_quote(self) -> None:
        with self.lock:
            has_levels = bool(self.order_book["asks"] or self.order_book["bids"])

            if has_levels:
                return

            primary_quote = self.quotes[self.symbols[0]]
            asks = []
            bids = []

            if primary_quote.ask_price and primary_quote.ask_volume:
                asks.append(
                    {
                        "price": primary_quote.ask_price,
                        "size": primary_quote.ask_volume,
                    },
                )

            if primary_quote.bid_price and primary_quote.bid_volume:
                bids.append(
                    {
                        "price": primary_quote.bid_price,
                        "size": primary_quote.bid_volume,
                    },
                )

            self.order_book = {"asks": asks, "bids": bids}

    def tick_side(self, tick_type: Any) -> str:
        value = int_value(tick_type, 0)

        if value == 1:
            return "buy"

        if value == 2:
            return "sell"

        return "unknown"

    def snapshot(self) -> dict[str, Any]:
        return {
            "source": "shioaji",
            "mode": self.mode,
            "status": "connected",
            "statusLabel": "Connected",
            "primarySymbol": self.symbols[0],
            "symbols": [self.quotes[symbol].to_json() for symbol in self.symbols],
            "chart": self.chart,
            "trades": self.trades,
            "orderBook": self.order_book,
            "updatedAt": self.updated_at,
            "message": "Shioaji quote bridge is running in simulation mode.",
        }

    def write_snapshot_locked(self) -> None:
        self.snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(self.snapshot(), ensure_ascii=False, indent=2)

        with tempfile.NamedTemporaryFile(
            "w",
            delete=False,
            dir=self.snapshot_path.parent,
            encoding="utf-8",
        ) as temp_file:
            temp_file.write(payload)
            temp_path = Path(temp_file.name)

        temp_path.replace(self.snapshot_path)

    def write_snapshot(self) -> None:
        with self.lock:
            self.write_snapshot_locked()


def parse_symbols() -> list[str]:
    symbols = os.environ.get("SHIOAJI_SYMBOLS", "")
    parsed = [symbol.strip() for symbol in symbols.split(",") if symbol.strip()]
    return parsed or DEFAULT_SYMBOLS


def main() -> int:
    load_env_file(Path(ENV_FILE))

    if os.environ.get("SHIOAJI_FORCE_SIMULATION") != "true":
        raise RuntimeError("SHIOAJI_FORCE_SIMULATION must be true.")

    api_key = require_env("SHIOAJI_API_KEY")
    secret_key = require_env("SHIOAJI_SECRET_KEY")
    symbols = parse_symbols()
    snapshot_file = os.environ.get("SHIOAJI_SNAPSHOT_FILE")
    snapshot_path = (
        Path(".marketpulse") / snapshot_file
        if snapshot_file
        else Path(os.environ.get("SHIOAJI_SNAPSHOT_PATH", DEFAULT_SNAPSHOT_PATH))
    )

    try:
        import shioaji as sj
    except ImportError as error:
        raise RuntimeError(
            "Shioaji is not installed. Run: pip install -r services/shioaji-bridge/requirements.txt",
        ) from error

    store = SnapshotStore(symbols=symbols, snapshot_path=snapshot_path)
    shutdown = threading.Event()

    def handle_shutdown(signum: int, frame: Any) -> None:
        shutdown.set()

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    api = sj.Shioaji(simulation=True)
    api.login(api_key=api_key, secret_key=secret_key)

    def on_tick(exchange: Any, tick: Any) -> None:
        store.update_tick(tick)

    def on_bidask(exchange: Any, bidask: Any) -> None:
        store.update_bidask(bidask)

    api.quote.set_on_tick_stk_v1_callback(on_tick)
    api.quote.set_on_bidask_stk_v1_callback(on_bidask)

    for symbol in symbols:
        contract = api.Contracts.Stocks[symbol]
        api.quote.subscribe(contract, quote_type=sj.constant.QuoteType.Tick)
        api.quote.subscribe(contract, quote_type=sj.constant.QuoteType.BidAsk)

    contracts = [api.Contracts.Stocks[symbol] for symbol in symbols]
    for snapshot in api.snapshots(contracts):
        store.update_snapshot_quote(snapshot)

    if not is_twse_regular_session():
        start, end = recent_kbar_range()
        primary_contract = api.Contracts.Stocks[symbols[0]]
        try:
            store.update_kbars(api.kbars(contract=primary_contract, start=start, end=end))
        except Exception as error:
            print(f"Warning: unable to load KBar fallback: {error}", file=sys.stderr)

        for market_date in recent_market_dates():
            try:
                ticks = api.ticks(
                    contract=primary_contract,
                    date=market_date,
                    query_type=sj.constant.TicksQueryType.LastCount,
                    last_cnt=40,
                )
                if list(getattr(ticks, "close", []) or []):
                    store.update_historical_ticks(ticks)
                    break
            except Exception as error:
                print(
                    f"Warning: unable to load historical ticks for {market_date}: {error}",
                    file=sys.stderr,
                )

    store.fill_order_book_from_primary_quote()

    store.write_snapshot()

    print(
        f"Shioaji quote bridge running in simulation mode for {', '.join(symbols)}.",
        flush=True,
    )
    print(f"Writing snapshot to {snapshot_path}.", flush=True)

    while not shutdown.is_set():
        store.write_snapshot()
        time.sleep(5)

    for symbol in symbols:
        contract = api.Contracts.Stocks[symbol]
        api.quote.unsubscribe(contract, quote_type=sj.constant.QuoteType.Tick)
        api.quote.unsubscribe(contract, quote_type=sj.constant.QuoteType.BidAsk)

    api.logout()
    print("Shioaji quote bridge stopped.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)
