# SOLIDUS — Comprehensive Node.js Backend Study Guide

Welcome to the definitive backend study guide for the **SOLIDUS AI Crypto Trading Simulator**. This document is formulated as a complete textbook for university-level students and engineers preparing for exams, vivas, and deep technical interviews. 

It maps directly to your course syllabus (Lectures 1 through 24) and uses the actual code from your `crypto-terminal/backend` directory as the primary educational example. Every section provides a conceptual foundation, internal mechanics, code walkthroughs, real-world context, and common exam questions.

---

## Lectures 1–4: Client Server Architecture & Request Handling

### 1. Concept Explanation
The **Client-Server Architecture** is a distributed computing framework where workloads are partitioned between providers of a resource or service (servers) and service requesters (clients). 
*   **The Client**: Your Next.js React frontend running in a user’s web browser. It displays the UI and initiates HTTP requests.
*   **The Server**: Your Node.js/Express application. It constantly listens on a specific network port waiting for incoming requests from clients.
*   **HTTP Request/Response Model**: An application-layer protocol. The client sends a Request (e.g., "Give me the latest crypto prices"). The server processes it and returns a Response (e.g., "Here is a JSON payload of the prices").

### 2. How It Works Internally
When a browser sends an HTTP request, it travels over the network (TCP/IP) to the server's IP address and designated port. Node.js binds to this port using its native networking libraries. When TCP packets arrive, Node.js constructs an `IncomingMessage` object (the Request) and a `ServerResponse` object (the Response). The server application then executes specific logic based on the URL path and HTTP method before finalizing and sending the Response.

### 3. SOLIDUS Implementation
In SOLIDUS, the server setup and listening phase happen inside `crypto-terminal/backend/server.js`.

```text
Client (Next.js Frontend)
       ↓ (HTTP GET http://localhost:3001/api/market/prices)
Node.js Server (Listening on Port 3001)
       ↓ (Processes Request)
Response (JSON data) sent back to Client
```

### 4. Code Walkthrough
```javascript
// server.js
61: const port = Number(process.env.PORT || 3001);
62: const server = http.createServer(app);
// ...
67: server.listen(port, () => {
68:   console.log(`Backend listening on http://localhost:${port}`);
70: });
```
*   **Line 61**: Attempts to load a port from the environment variable (`.env` file). If missing, it defaults to `3001`. This is best practice for deployment flexibility.
*   **Line 62**: Uses Node's built-in `http` module to physically create an HTTP server. `app` (the Express app) is passed as the handler function that will run every time a request comes in.
*   **Line 67**: `server.listen` binds the Node process to TCP port `3001`. The callback function fires once the port is successfully bound, logging a message.

### 5. Real World Backend Engineering Perspective
In production, a server never listens directly to the public internet. Instead, an API Gateway or Reverse Proxy (like NGINX or AWS ALB) listens on ports 80 (HTTP) and 443 (HTTPS), terminates the SSL/TLS encryption, and forwards the raw request to the internal Node.js server running on a private port like 3001.

### 6. Common Mistakes Students Make
*   **Hardcoding Ports**: Hardcoding `const port = 3001` instead of using `process.env.PORT` causes crashes in cloud deployments (like Heroku or AWS), which dynamically assign environment ports.
*   **Forgetting to send a response**: If a route handler doesn't call `res.json()` or `res.send()`, the client's browser will hang infinitely until it times out.

### 7. Exam / Viva Questions
*   **Q: Explain the difference between a Client and a Server in the context of REST.**
    *   *A: A Client is the active entity that initiates communication by dispatching an HTTP request. The Server is the passive entity that listens continuously on a network port, processes the request, and returns an HTTP response containing the requested state or resource.*

---

## Lectures 5–8: Installing NodeJS, Environments & Dependencies

### 1. Concept Explanation
*   **Node.js** is an open-source, cross-platform JavaScript runtime environment built on Chrome's V8 JavaScript engine. It allows JS to run on servers, interacting with the file system and network.
*   **File Handling & Modules**: Node.js does not load all code globally. Every file is an isolated module. To share code, a file must explicitly `export` objects, and other files must `require` them (CommonJS pattern) or `import` them (ES Modules).

### 2. How It Works Internally
Node.js uses the CommonJS module system natively. When you call `require('./services/marketService')`, Node.js internally wraps the contents of `marketService.js` in an Immediately Invoked Function Expression (IIFE). This prevents variables declared in that file from leaking into the global memory space. 

### 3. SOLIDUS Implementation
SOLIDUS uses a highly organized folder structure separating concerns:
*   `routes/`: Maps URL endpoints to specific functions.
*   `services/`: Contains the heavy business logic and external API calls.
*   `server.js`: The central hub that wires everything together.

### 4. Code Walkthrough
```javascript
// crypto-terminal/backend/services/marketService.js
120: module.exports = {
121:   normalizeTradeMessage,
122:   updatePriceCache,
123:   getLatestPrices,
       // ...
127: };

// crypto-terminal/backend/routes/marketRoutes.js
8: const { getLatestPrices, fetchCandles } = require("../services/marketService");
```
*   **Line 120 (Service)**: `module.exports` exposes an object containing multiple functions. This is the file's public API. Internal variables like `latestPrices` (the Map) are NOT exported, making them safely encapsulated (private).
*   **Line 8 (Route)**: Using object destructuring, `require` fetches the exported object from the service file relative path (`../`), allowing the route file to use `getLatestPrices` directly.

### 5. Real World Backend Engineering Perspective
Large applications enforce strict boundary layers. Controllers (or routes) should never write database queries directly. They must delegate that to Service files. This makes testing easy; you can write a unit test for `marketService.js` without needing to start an HTTP server.

### 6. Common Mistakes Students Make
*   **Circular Dependencies**: File A requires File B, and File B requires File A. Node resolves this by returning a partially constructed object, which usually leads to `TypeError: undefined is not a function`.
*   **Mixing `import` and `require`**: Using CommonJS (`require()`) and ES Modules (`import/export`) in the same file without configuring `package.json` correctly (setting `"type": "module"`).

### 7. Exam / Viva Questions
*   **Q: What is the purpose of `module.exports` in Node.js?**
    *   *A: It defines what a module exposes to the outside world. By default, everything inside a Node.js file is private. `module.exports` makes specific objects, functions, or variables public so other files can `require()` them.*

---

## Lectures 9–12: Understanding Node.js Architecture (The Event Loop)

### 1. Concept Explanation
Node.js is famous for being **Asynchronous, Non-blocking, and Single-threaded**.
Unlike Java or PHP (where every new user request creates a new thread in RAM), Node.js uses a single main thread to handle all user requests. It achieves high concurrency using the **Event Loop** and offloading I/O tasks to the operating system.

### 2. How It Works Internally
When a request asks for a database read or a network call (like querying Binance), the Node.js main thread does NOT wait (block). It passes the task to `libuv` (a C++ library inside Node), registers a callback, and moves on to serve the next user's request. When the network call finishes, `libuv` pushes the callback into the Event Queue. The Event Loop picks it up and executes the remainder of the code on the main thread.

### 3. SOLIDUS Implementation
Your `fetchCandles` function communicating with Binance is a textbook example of non-blocking I/O.

### 4. Code Walkthrough
```javascript
// crypto-terminal/backend/services/marketService.js
87: async function fetchCandles({ symbol, interval, limit }) {
88:   const { data } = await binanceRestClient.get("/api/v3/klines", {
89:     params: { symbol, interval, limit },
90:   });
91: 
92:   return data.map((candle) => ({ /* ... */ }));
93: }
```
*   **Line 87 (`async`)**: Declares that this function handles asynchronous events and returns a Promise.
*   **Line 88 (`await`)**: The main thread hits `await` and instantly **pauses execution of this specific function**. The thread is freed up to handle other clients. The network request to Binance happens in the background. Once Binance replies with the HTTP response, the function resumes, assigns the payload to `data`, and executes the `data.map` logic.

### 5. Real World Backend Engineering Perspective
Because Node.js is single-threaded, if you wrote a massive blocking `for` loop (e.g., calculating the billionth Fibonacci number) on Line 91, the entire exact server would freeze. No other users could load prices until the loop finished. For heavy math, real backends use Worker Threads or a microservice written in Go or Rust.

### 6. Common Mistakes Students Make
*   **Forgetting `await`**: If you forget `await`, Node.js won't wait for the network request to finish. The function will immediately return a pending `Promise` instead of the actual data, causing frontend crashes.

### 7. Exam / Viva Questions
*   **Q: Explain how the Single-Threaded Event Loop handles 10,000 concurrent network requests.**
    *   *A: Node handles requests on a single main thread. When it encounters an I/O operation (like a network request), it delegates the wait time to the OS asynchronously and attaches a callback. The main thread continues processing other incoming requests. Once the I/O completes, the callback is queued and processed by the Event Loop, preventing the thread from ever blocking/waiting.*

---

## Lectures 13–16: Handling Requests, Modules & NPM

### 1. Concept Explanation
*   **NPM (Node Package Manager)**: The world's largest software registry. It allows developers to securely install, manage, and share code dependencies via the `package.json` file.
*   **Dependencies**: Code written by others that your project requires to function (e.g., `express`, `cors`, `zod`).

### 2. How It Works Internally
Running `npm install express` does three things:
1. Downloads the Express code into the `/node_modules` folder.
2. Creates an entry in `package.json` under `"dependencies"`.
3. Creates an exact version fingerprint in `package-lock.json` to ensure other developers install the exact same version, preventing "it works on my machine" bugs.

### 3. SOLIDUS Implementation
SOLIDUS relies on NPM for core server functionality and WebSocket communication.

### 4. Code Walkthrough
```javascript
// server.js
1: require("dotenv").config();
4: const express = require("express");
5: const cors = require("cors");
6: const helmet = require("helmet");
8: const rateLimit = require("express-rate-limit");
```
*   **Line 1**: Loads `dotenv`, an NPM package that reads the `.env` file and loads the variables into `process.env`.
*   **Line 4-8**: Instantiating various third-party NPM packages into memory to build the server architecture.

### 5. Real World Backend Engineering Perspective
In production CI/CD pipelines (like GitHub Actions), the `/node_modules` folder is never pushed to Git. Instead, the server downloads the raw code, runs `npm ci` (clean install), which strictly reads `package-lock.json` and reconstructs the precise dependency tree from scratch.

### 6. Common Mistakes Students Make
*   **Committing `node_modules` to Git**: This folder can easily exceed 200MB. It should always be excluded via `.gitignore`.
*   **Installing tools globally (`-g`)**: Installing a crucial project dependency globally means another developer won't have it locally when they clone the repo. Always install project dependencies locally.

### 7. Exam / Viva Questions
*   **Q: What is the purpose of `package.json` vs `package-lock.json`?**
    *   *A: `package.json` holds metadata and a general list of required dependencies (e.g., `express: ^4.17.1`, meaning any minor update is fine). `package-lock.json` locks the absolute exact versions of every dependency and sub-dependency downloaded, ensuring deterministic builds across different environments.*

---

## Lectures 17–20: Express.js Architecture & Middleware

### 1. Concept Explanation
Express.js is a minimalist web framework for Node.js. It abstracts the highly complex, low-level HTTP module into a simple routing and **Middleware** architecture.
**Middleware** are functions that have access to the request (`req`), response (`res`), and the `next` function in the application’s request-response cycle. They can execute code, modify the request, end the cycle, or pass control to the `next` middleware.

### 2. How It Works Internally
Express operates as a pipeline. When a request enters the server, it travels top-to-bottom through every `app.use()` statement until a route handler uses `res.send()` to terminate the lifecycle.

### 3. SOLIDUS Implementation
SOLIDUS heavily utilizes middleware for security, payloads, logging, and rate-limiting.

### 4. Code Walkthrough
```javascript
// server.js
21: app.use(
22:   cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000" })
25: );
26: app.use(helmet());
27: app.use(express.json({ limit: "250kb" }));

30: app.use(
31:   "/api",
32:   rateLimit({ windowMs: 60_000, max: 120 })
38: );
```
*   **Line 21 (`cors`)**: Cross-Origin Resource Sharing. Browsers block requests from `localhost:3000` to `localhost:3001` to prevent malicious scripts. This middleware adds specific HTTP headers to allow the Next.js frontend to communicate securely.
*   **Line 26 (`helmet`)**: Automatically attaches over a dozen security headers (e.g., preventing Clickjacking and XSS attacks).
*   **Line 27 (`express.json`)**: Intercepts requests. If they contain a JSON body, it parses the raw strings into a JavaScript object and attaches it to `req.body`. If the payload is larger than `250kb`, it rejects the request protecting the server from memory bloat.
*   **Line 30 (`rateLimit`)**: Before the request reaches `/api/market`, it stops here. If the user's IP address has made more than 120 requests in 1 minute, it blocks them with a `429 Too Many Requests` error.

### 5. Real World Backend Engineering Perspective
Middleware allows separation of concerns. Instead of writing authentication logic manually inside every single route, you write one auth middleware (`app.use(protect)`). Every request passes through it. If valid, it calls `next()`; if invalid, it terminates the request immediately.

### 6. Common Mistakes Students Make
*   **Incorrect Order**: Placing `app.use(express.json())` *after* the routes means the routes will see `req.body` as `undefined`. Middleware executes sequentially based on definition order.

### 7. Exam / Viva Questions
*   **Q: Define Express Middleware and give three examples.**
    *   *A: Middleware are functions executed sequentially in the Express request pipeline. They can alter request/response objects, run logic, or end the request. Examples: `cors` (headers), `express.json` (body parsing), `morgan` (logging).*

---

## Lectures 21–24: Routing, Parameters, Responses & Exceptions

### 1. Concept Explanation
*   **Routing Methods (GET, POST)**: GET is for fetching data. POST is for submitting data.
*   **Route Parameters**: Dynamic URL segments (e.g., `/user/:id` captures `id`).
*   **Global Error Handler**: A specialized Express middleware with exactly four arguments `(err, req, res, next)` that catches all application exceptions.

### 2. How It Works Internally
When you define `router.get("/ticker/:symbol")`, Express compiles this into a Regex pattern. When a request matches the pattern, it extracts the dynamic segment and populates the `req.params` object. If `next(err)` is ever called anywhere in the pipeline, Express skips all standard routes and jumps directly to the Error Middleware.

### 3. SOLIDUS Implementation
Inside `marketRoutes.js`, you implement clean routing, Zod validation, and error passing.

### 4. Code Walkthrough
```javascript
// crypto-terminal/backend/routes/marketRoutes.js
17: router.get("/candles", async (req, res, next) => {
18:   try {
19:     const schema = z.object({
20:       symbol: z.string().trim().min(6).max(12).toUpperCase(),
21:       interval: z.enum(DEFAULT_INTERVALS),
22:       limit: z.coerce.number().min(1).max(500).default(150),
23:     });
24: 
25:     const params = schema.parse(req.query);
26:     const data = await fetchCandles(params);
27:     res.json({ data });
28:   } catch (err) {
29:     next(err);
30:   }
31: });
```
*   **Line 17**: Defines a GET route endpoint for `/api/market/candles`. It accepts the `next` callback to handle errors.
*   **Line 19-25** (`zod` schema): The `zod` library intercepts `req.query` (e.g., `?symbol=btc&limit=100`). It strictly validates that `symbol` is a string (uppercase) and `limit` is a number max 500. If the user passes malicious data, `schema.parse` throws an error instantly.
*   **Line 26**: Makes the database/Binance call.
*   **Line 27**: Converts the resulting data into JSON and sends it over the network to the Client.
*   **Line 29 (`next(err)`)**: If Zod validation failed, or `fetchCandles` crashed due to a Binance outage, the exception lands in `catch`. `next(err)` forwards it to `server.js` (Line 49) where the global error handler safely serializes it into a `400` or `500` HTTP response, keeping the server alive.

### 5. Real World Backend Engineering Perspective
Validation libraries like Zod or Joi are mandatory in production. Never trust user input. Hardening the backend against bad query parameters prevents NoSQL injections, API crashes, and excessive server resource drains.

### 6. Common Mistakes Students Make
*   **Leaking Stack Traces**: Sending a raw error back to the client (`res.json(err)`) exposes the internal directory structure and exact line failures of the server, which is a massive security vulnerability.

### 7. Exam / Viva Questions
*   **Q: How does Express differentiate standard middleware from error-handling middleware?**
    *   *A: Express differentiates them strictly by arity (the number of arguments). Error-handling middleware must take exactly four arguments: `(err, req, res, next)`. Normal middleware takes three: `(req, res, next)`.*

---

## Static File Serving and File Streams in Node.js

### 1. Concept Explanation
**Static files** are files that clients download directly from the server without any modification or processing by backend logic. Examples include:
*   HTML files (`index.html`)
*   CSS stylesheets (`style.css`)
*   Client-side JavaScript files (`app.js`)
*   Images (`logo.png`)
*   Public assets (fonts, favicons, audio files)

Servers must serve static files because modern web applications cannot function without these fundamental building blocks. While dynamic data (like crypto prices) answers "What is happening?", static files provide the browser with instructions on "How to display it".

### 2. How Static Files Work Internally
When a browser requests `http://localhost:3000/index.html`, this isn't an API call. It's a request for a physical file. 
Internally, Node.js must:
1. Parse the URL `/index.html`.
2. Locate the physical file on the server's hard disk.
3. Read the binary data of the file.
4. Construct an HTTP Response.
5. Identify the **MIME type**. (MIME types tell the browser how to interpret the file. If Node.js reads an `.html` file, it attaches the header `Content-Type: text/html`. Without this, the browser might download the HTML file instead of rendering it as a webpage.)
6. Transmit the file bytes over the network to the browser.

### 3. Implementation Using Express Static Middleware
Writing custom FS (File System) code to match URLs to files and determine MIME types is tedious. Express provides built-in middleware to handle this entirely automatically:

```javascript
// Express will treat the "public" directory as the root for static assets
app.use(express.static("public"));
```

If your project structure looks like this:
```text
public/
  index.html
  style.css
  logo.png
```

When a client navigates to `http://localhost:3000/logo.png`, the `express.static` middleware instantly intercepts the request. It looks inside the `public/` directory, finds `logo.png`, attaches the correct MIME type (`image/png`), and serves the file. You don't need to write a `router.get('/logo.png')` endpoint!

### 4. File Streaming in Node.js
When a file is large (e.g., a 2GB video file), loading the entire file into the server's RAM using `fs.readFile()` will crash a server handling multiple users concurrently.
To solve this, Node.js uses **Streams**. Streams read data from the disk chunk-by-chunk and immediately send those chunks over the network.

```javascript
const fs = require("fs");

app.get("/video", (req, res) => {
  // 1. Create a readable stream from the local file
  const stream = fs.createReadStream("large_video.mp4");
  
  // 2. Pipe the continuous flow of data directly into the Response object
  stream.pipe(res);
});
```

*   **`createReadStream`**: Opens the file on the hard drive but only pulls a small buffer (typically 64KB) into RAM at a time.
*   **`pipe()`**: A Node.js command that connects a readable stream (the file) to a writable stream (the HTTP Response `res`). As soon as 64KB is read from the disk, it is flushed over the network, freeing the RAM for the next chunk.
*   **Memory vs. Streaming**: Loading full files is fast but RAM-intensive ($O(N)$ memory). Streaming is slightly slower but keeps memory footprint flat ($O(1)$ memory), ensuring high performance under load.

### 5. SOLIDUS Implementation Perspective
In the SOLIDUS architecture, the Node.js backend (`crypto-terminal/backend`) primarily serves dynamic API responses (JSON). Because you are using **Next.js** for the frontend, Next.js owns the static file delivery (compiling and serving the React UI from its own dev server).
However, if SOLIDUS required a downloadable PDF "Trading Rulebook" or a static promotional HTML landing page served directly by the backend, integrating `app.use(express.static('public'))` would effortlessly handle those assets without polluting the API routing logic.

### 6. Real World Backend Perspective
While Express can serve static files, in enterprise production architecture, **Node.js rarely serves static files directly**. Node's single thread is optimized for I/O API logic, not disk serving.
Large systems separate static delivery from backend logic:
*   **NGINX**: Used as a reverse proxy because it serves static files from disk exponentially faster than Node.js.
*   **Object Storage**: Assets (thousands of user profile pictures) are moved entirely off the server to **AWS S3**.
*   **CDN (Content Delivery Network)**: Cloudflare or AWS CloudFront caches static files in edge servers globally, so a user in Tokyo downloads `logo.png` from a Tokyo server, not your primary Node server in Virginia.

### 7. Common Mistakes Students Make
*   **Forgetting to define the static directory**: Expecting `http://localhost:3000/logo.png` to work without calling `app.use(express.static('public'))`.
*   **Incorrect File Paths**: Using relative paths in `express.static('./public')`. If the server is started from a different parent directory, it will fail to find the folder. Always use absolute paths: `express.static(path.join(__dirname, 'public'))`.
*   **Streaming Errors**: Trying to stream a file but forgetting to add `stream.on('error', ...)` handling. If the file doesn't exist, the stream crashes the Node application ungracefully.

### 8. Exam / Viva Questions
*   **Q: What are static files in web development?**
    *   *A: Static files are files sent to the client exactly as they are stored on the server disk (HTML, CSS, JS, Images), requiring no server-side compilation or database querying.*
*   **Q: How does Express serve static files?**
    *   *A: Express provides a built-in middleware function: `express.static(directory_path)`. It automatically routes incoming GET requests to files sitting inside the specified directory, attaching the correct MIME types.*
*   **Q: What is file streaming in Node.js?**
    *   *A: File streaming involves transmitting data, like a large file, piece-by-piece (in chunks) using `createReadStream()` over the network, rather than reading the entire file into RAM first.*
*   **Q: Why is streaming preferred for large files?**
    *   *A: Streaming strictly regulates RAM usage. Loading a 2GB file into memory for 10 concurrent requests requires 20GB of RAM, crashing the server. Streaming uses tiny buffers (e.g., 64KB per user), keeping memory consumption minimal and constant regardless of file size.*

---

## ADVANCED TOPICS FOR BACKEND EXCELLENCE

### Backend Request Flow in SOLIDUS
The complete data lifecycle when the UI requests chart data:

```text
User opens TradingView Chart UI
       ↓ 
Frontend (ChartPanel.tsx) fires fetch request: "GET /api/market/candles?symbol=BTCUSDT"
       ↓ 
Request travels over TCP, reaches Node.js port 3001
       ↓ 
Express intercepts. request passes CORS -> Helmet -> Rate Limiter -> Express.json
       ↓ 
Router matches "/api/market/candles"
       ↓ 
Zod validation succeeds, controller calls marketService.fetchCandles()
       ↓ 
Service pauses main thread, fires Axios HTTP request to stream.binance.com
       ↓ 
Binance returns K-line (candle) data payload. Main thread resumes.
       ↓ 
Service maps data into standardized object format, returns to Controller
       ↓ 
Controller executes res.json(), generating an HTTP response payload
       ↓ 
Data travels back to UI. React updates chart state.
```

### Security Considerations Built into SOLIDUS
1.  **Rate Limiting**: By applying `express-rate-limit`, the server protects itself against brute-force attacks and DDOS attempts.
2.  **Helmet**: Protects the app by hiding the `X-Powered-By` header (reducing visibility that this is an Express app) and blocking cross-site scripting (XSS).
3.  **Payload Throttling**: `express.json({ limit: "250kb" })` prevents assailants from crashing the RAM by sending immensely large JSON objects.
4.  **Zod Parsing**: Assures strict type safety, sanitizing string inputs against injection before processing logic.

### Backend Scalability & Microservices
*   **Current Architecture**: SOLIDUS runs as a **Monolith**. Your `marketService`, `portfolioRoutes`, and WebSockets all run within an identical isolated Node.js event loop.
*   **Scaling Up**: If SOLIDUS gained 1,000,000 users, Node.js running on 1 thread would cap its CPU limit.
*   **The Fix**: Deploy the code uniformly across 4 isolated servers. Place an **Nginx Load Balancer** in front of them. The load balancer receives the 1,000,000 requests and equally distributes 250,000 requests to each server.
*   **Microservices**: You would eventually break the code apart. Server A *only* handles WebSockets. Server B *only* handles `Auth` and `/portfolio`. If WebSockets crash, the authentication service remains untouched.

---
*End of Comprehensive Study Guide.*
