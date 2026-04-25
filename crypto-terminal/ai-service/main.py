import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agents.research_agent import ResearchAgent

load_dotenv()

app = FastAPI(title="Crypto Terminal AI Service", version="1.0.0")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
research_agent = ResearchAgent(backend_url=BACKEND_URL)


class ResearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "backend_url": BACKEND_URL}


@app.post("/research")
async def research(payload: ResearchRequest) -> dict:
    try:
        return await research_agent.run(payload.query)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
