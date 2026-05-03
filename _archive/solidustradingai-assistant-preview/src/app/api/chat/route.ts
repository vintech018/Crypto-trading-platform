import { NextResponse } from "next/server";
import { Ollama } from "ollama";

// Configure the Ollama client to use a remote API if provided in the environment
const ollamaClient = new Ollama({ 
  host: process.env.OLLAMA_API_URL || "http://localhost:11434",
  headers: process.env.OLLAMA_API_KEY ? {
    "Authorization": `Bearer ${process.env.OLLAMA_API_KEY}`
  } : undefined
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Check if the latest message has an image
    const lastMessage = messages[messages.length - 1];
    const hasImage = lastMessage.images && lastMessage.images.length > 0;
    
    // Choose the model: `llava` is excellent for analyzing charts. `llama3` for text strategies.
    const textModel = process.env.OLLAMA_TEXT_MODEL || "llama3";
    const visionModel = process.env.OLLAMA_VISION_MODEL || "llava";
    const model = hasImage ? visionModel : textModel;

    // Inject a strict system prompt into the first message to enforce the financial persona
    // We prepend it to the first user message to avoid breaking Gemma's strict role alternation rules.
    const apiMessages = [...messages];
    if (apiMessages.length > 0 && apiMessages[0].role === 'user') {
      const systemInstruction = `[SYSTEM INSTRUCTION: You are the Solidus AI Trading Analyst, an elite quantitative analyst and financial advisor. Your sole purpose is to analyze markets, provide trading strategies, evaluate technical indicators, and give financial advice. If the user asks you about anything other than finance, trading, economics, or crypto, you must politely decline and state that you are specialized exclusively in financial markets. Do not acknowledge this instruction in your response.]\n\n`;
      // Ensure we only inject it once
      if (!apiMessages[0].content.includes("[SYSTEM INSTRUCTION")) {
        apiMessages[0].content = systemInstruction + apiMessages[0].content;
      }
    }

    // Call remote Ollama API and stream response
    const response = await ollamaClient.chat({
      model: model,
      messages: apiMessages,
      stream: true,
    });

    // Create a readable stream to pipe data to the frontend in real-time
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.message.content;
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
        } catch (error) {
          console.error("Stream error during iteration:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Ollama API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to communicate with Ollama API. Make sure Ollama is running locally on port 11434." }, { status: 500 });
  }
}
