import os
from typing import Any

from openai import OpenAI

from agents.market_agent import MarketAgent
from agents.news_agent import NewsAgent
from tools.news_tool import NewsTool
from tools.price_tool import PriceTool
from tools.sentiment_tool import SentimentTool


class LLMProvider:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def generate(self, prompt: str) -> str | None:
        if not self.client:
            return None

        response = self.client.responses.create(
            model=self.model,
            input=prompt,
            temperature=0.2,
        )
        return response.output_text


class ResearchAgent:
    def __init__(self, backend_url: str):
        self.price_tool = PriceTool(backend_url)
        self.news_tool = NewsTool(backend_url)
        self.sentiment_tool = SentimentTool()
        self.market_agent = MarketAgent()
        self.news_agent = NewsAgent()
        self.llm_provider = LLMProvider()

    async def run(self, query: str) -> dict[str, Any]:
        prices = await self.price_tool.get_latest_prices()
        news = await self.news_tool.get_latest_news()

        market_summary = self.market_agent.summarize_prices(prices)
        news_summary = self.news_agent.summarize_news(news)
        sentiment = self.sentiment_tool.score(news)

        whale_signals = [
            p for p in prices if p.get("quoteValue") is not None and float(p.get("quoteValue", 0)) > 1_000_000
        ]

        prompt = f"""
You are a crypto market research assistant.

User query: {query}

Market snapshot: {market_summary}
News snapshot: {news_summary}
Sentiment: {sentiment}
Whale signals: {whale_signals[:5]}

Return a concise institutional-style explanation of what is moving the market.
        """.strip()

        llm_summary = self.llm_provider.generate(prompt)

        if not llm_summary:
            llm_summary = (
                f"Market view: {market_summary['message']}. "
                f"News sentiment appears {sentiment['label']} ({sentiment['score']}). "
                "Recent headlines and large notional trades suggest monitoring momentum and liquidity."
            )

        confidence = 0.75 if self.llm_provider.client else 0.55

        return {
            "query": query,
            "analysis": {
                "summary": llm_summary,
                "confidence": confidence,
                "sentiment": sentiment,
                "market": market_summary,
                "news": news_summary,
                "whale_signals": whale_signals[:10],
            },
        }
