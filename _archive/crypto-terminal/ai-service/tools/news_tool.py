from typing import Any

import httpx


class NewsTool:
    def __init__(self, backend_url: str):
        self.backend_url = backend_url.rstrip("/")

    async def get_latest_news(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{self.backend_url}/api/news/latest")
            response.raise_for_status()
            payload = response.json()
            return payload.get("data", [])
