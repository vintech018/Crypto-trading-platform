from typing import Any


class MarketAgent:
    def summarize_prices(self, prices: list[dict[str, Any]]) -> dict[str, Any]:
        tracked_symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
        selected = [p for p in prices if p.get("symbol") in tracked_symbols]

        return {
            "tracked": selected,
            "message": ", ".join(
                f"{item['symbol']}: ${item.get('price', 0):,.2f}" for item in selected if item.get("price")
            )
            or "No live prices available",
        }
