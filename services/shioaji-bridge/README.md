# Shioaji Bridge

This service is the local quote-only bridge between Shioaji and the Next.js
MarketPulse frontend.

It is intentionally limited to:

- `sj.Shioaji(simulation=True)`
- Stock tick subscriptions
- Stock bid/ask subscriptions
- Writing the latest market snapshot to a local JSON file

It intentionally does not:

- Activate CA certificates
- Place, modify, cancel, or simulate orders
- Read account balances, positions, P&L, or trading limits
- Expose API keys to browser code

## Setup

Install dependencies in a Python environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r services/shioaji-bridge/requirements.txt
```

Create `.env.local` in the repository root:

```bash
MARKET_DATA_PROVIDER=shioaji
SHIOAJI_API_KEY=your_server_side_key
SHIOAJI_SECRET_KEY=your_server_side_secret
SHIOAJI_FORCE_SIMULATION=true
SHIOAJI_SYMBOLS=2330,2317,2454,2412
SHIOAJI_SNAPSHOT_FILE=shioaji-snapshot.json
```

Run the bridge:

```bash
python services/shioaji-bridge/bridge.py
```

Run the Next.js app separately:

```bash
npm run dev
```

The frontend reads `/api/market`, which reads the snapshot file when
`MARKET_DATA_PROVIDER=shioaji`.
