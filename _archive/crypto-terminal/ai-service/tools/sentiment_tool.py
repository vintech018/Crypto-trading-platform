from typing import Any


class SentimentTool:
    """Simple keyword-based sentiment fallback.

    Replace with social API integrations (X/Twitter, Reddit, etc.) in production.
    """

    POSITIVE = {"surge", "rally", "inflow", "bullish", "breakout", "gain", "buy"}
    NEGATIVE = {"selloff", "dump", "hack", "bearish", "outflow", "drop", "risk"}

    def score(self, headlines: list[dict[str, Any]]) -> dict[str, Any]:
        if not headlines:
            return {"label": "neutral", "score": 0.0}

        combined = " ".join(item.get("title", "").lower() for item in headlines)

        pos = sum(1 for keyword in self.POSITIVE if keyword in combined)
        neg = sum(1 for keyword in self.NEGATIVE if keyword in combined)

        raw_score = (pos - neg) / max(pos + neg, 1)

        if raw_score > 0.2:
            label = "bullish"
        elif raw_score < -0.2:
            label = "bearish"
        else:
            label = "neutral"

        return {"label": label, "score": round(raw_score, 3)}
