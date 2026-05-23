import { NextResponse } from "next/server";
import { Ollama } from "ollama";

const ollamaClient = new Ollama({ 
  host: process.env.OLLAMA_API_URL || "http://localhost:11434",
  headers: process.env.OLLAMA_API_KEY ? {
    "Authorization": `Bearer ${process.env.OLLAMA_API_KEY}`
  } : undefined
});

export async function GET() {
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
      return NextResponse.json({ error: "NEWS_API_KEY is not configured" }, { status: 500 });
    }

    // 1. Fetch real-time news
    const newsResponse = await fetch(`https://newsapi.org/v2/everything?q=cryptocurrency+OR+bitcoin+OR+ethereum&language=en&sortBy=publishedAt&pageSize=15&apiKey=${newsApiKey}`);
    if (!newsResponse.ok) {
        throw new Error(`NewsAPI error: ${newsResponse.statusText}`);
    }
    const newsData = await newsResponse.json();
    const articles = newsData.articles || [];

    // Compile titles and descriptions for context
    const newsContext = articles.slice(0, 10).map((a: any) => `- ${a.title}: ${a.description}`).join('\n');

    const prompt = `You are an elite quantitative analyst and financial advisor for a crypto trading platform.
Below is the latest news regarding the cryptocurrency market:

${newsContext}

Based on this news, generate a comprehensive "Market Digest" formatted EXACTLY as a JSON object with the following structure:
{
  "newsSummary": "A concise 2-3 sentence summary of the key themes driving the market right now based on the provided news.",
  "marketOutlook": [
    { "timeframe": "Short-term", "score": 4.90, "label": "Neutral", "text": "Explanation of short-term outlook..." },
    { "timeframe": "Mid-term", "score": 4.80, "label": "Neutral", "text": "Explanation of mid-term outlook..." },
    { "timeframe": "Long-term", "score": 6.40, "label": "Neutral", "text": "Explanation of long-term outlook..." }
  ],
  "strategies": [
    { "name": "Spot Grid", "description": "Near-term risk-off and choppy flows suit fixed-range trading..." },
    { "name": "Simple Earn", "description": "Park idle stablecoins in Simple Earn for yield..." },
    { "name": "Spot DCA", "description": "Choppy month ahead with selective accumulation suits Spot DCA..." }
  ]
}

CRITICAL INSTRUCTIONS:
1. The 'score' in marketOutlook must be a number between 0 and 10 (0=extremely bearish, 10=extremely bullish, 5=neutral).
2. The 'label' should be one of "Bearish", "Neutral", or "Bullish" based on the score.
3. Provide exactly 3 strategies relevant to the current market conditions.
4. Respond ONLY with the raw JSON object, without any markdown formatting or backticks.`;

    const textModel = process.env.OLLAMA_TEXT_MODEL || "llama3";

    // 2. Query Ollama with the news context
    const response = await ollamaClient.chat({
      model: textModel,
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: false,
    });

    // 3. Return the parsed JSON
    let digestData;
    try {
        let rawContent = response.message.content.trim();
        if (rawContent.startsWith('```json')) {
            rawContent = rawContent.slice(7);
        } else if (rawContent.startsWith('```')) {
            rawContent = rawContent.slice(3);
        }
        if (rawContent.endsWith('```')) {
            rawContent = rawContent.slice(0, -3);
        }
        digestData = JSON.parse(rawContent.trim());
    } catch (e) {
        console.error("Failed to parse JSON from Ollama", response.message.content);
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json(digestData);
  } catch (error: any) {
    console.error("Digest API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate market digest." }, { status: 500 });
  }
}
