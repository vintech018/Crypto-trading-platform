from typing import Any


class NewsAgent:
    def summarize_news(self, news: list[dict[str, Any]]) -> dict[str, Any]:
        top = news[:5]
        headlines = [item.get("title", "") for item in top]
        return {
            "headlines": headlines,
            "sources": [item.get("source", "Unknown") for item in top],
        }
