# Express Server Setup & Request Handling

This document extracts exactly how Express, routing, request parsing, and error handling are implemented in your Solidus Crypto Trading Platform backends.

The platform relies primarily on two Express server setups:
1. **The Crypto Terminal Backend** (`crypto-terminal/backend/server.js`) - _Fully Implemented_
2. **The Auth/Root Backend** (`backend/src/server.js`) - _Basic Setup_

---

## 1. Creating the Express App & Server
In both setups, we initialize Express and wrap it in HTTP servers if necessary.

**Crypto Terminal Backend:**
```javascript
const http = require("http");
const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3001);
const server = http.createServer(app); // Wrapped for WebSockets integration

server.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
```

**Auth/Root Backend:**
```javascript
import express from "express"; // Uses ES Modules

const app = express();
const PORT = process.env.PORT || 5050;

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
```

---

## 2. Request Handling & Parsing
Before requests hit your endpoints, they pass through a chain of robust middleware in the `crypto-terminal` backend.

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  })
);
// Security headers
app.use(helmet()); 
// Request Body Parsing: limits JSON payload size to prevent DOS attacks
app.use(express.json({ limit: "250kb" })); 
// Logging incoming requests
app.use(morgan("combined"));

// Rate limiting to prevent API abuse
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: 120, // max 120 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
  })
);
```
*(The Auth backend currently just implements simple `cors()` and `express.json()` without the limits or security headers).*

---

## 3. Creating API Endpoints & Routing
The application separates concerns by assigning different route files to specific URI prefixes.

```javascript
// Importing modular route handlers
const marketRoutes = require("./routes/marketRoutes");
const newsRoutes = require("./routes/newsRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const aiRoutes = require("./routes/aiRoutes");

// Defining base endpoints
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Attaching router modules to base paths
app.use("/api/market", marketRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/ai", aiRoutes);
```

---

## 4. Serving Static Files (File Handling)
Currently, **there is no direct serving of static files** (like images, CSS, or PDFs) via `express.static()` implemented in the backend codebases. 
The system relies entirely on the Next.js frontend to handle and serve its own static assets from the `public/` directory or relies on purely JSON-based REST APIs.

---

## 5. Exception Handling (Global Error Catching)
The `crypto-terminal` backend has a dedicated global error-handling middleware that catches synchronous exceptions, ZOD validation errors, and Axios/API failures automatically without crashing the server.

```javascript
// Placed AFTER all other routes so it catches unhandled errors
app.use((err, _req, res, _next) => {
  
  // 1. Zod Validation Errors (Schema validation)
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.errors });
  }

  // 2. HTTP / Network Exceptions
  const status = err?.response?.status || err.statusCode || 500;
  
  // 3. Graceful Error Message extraction
  const message =
    err?.response?.data?.detail || err?.response?.data?.error || err.message || "Internal server error";

  return res.status(status).json({ error: message });
});
```

### Process Exits & Graceful Shutdowns
In case of terminal failure, process interrupts, or deployment teardowns, the websocket streams are explicitly cleanly closed so there are no memory leaks.

```javascript
process.on("SIGINT", () => {
  stopBinanceStream();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  stopBinanceStream();
  server.close(() => process.exit(0));
});
```
