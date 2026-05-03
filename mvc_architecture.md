# Decoupled MVC Architecture in Solidus

The Solidus Crypto Trading Platform uses a **Decoupled (or API-driven) MVC Architecture**, which is the modern standard for full-stack JavaScript applications. 

Rather than the traditional MVC (where the backend generates HTML and sends it directly to the browser), your project strictly separates the frontend (View) from the backend (Model & Controller).

Here is a breakdown of exactly how MVC is structured in your project:

## 1. The Model (M) - Data & Business Logic
The Model is responsible for managing data, database connections, and business rules.
* **Location:** `backend/src/models/` and implicitly through ORM definitions (like Prisma or Mongoose schemas).
* **Implementations in Your Code:**
  * You have dedicated model files like `user.model.js`, `trade.model.js`, `wallet.model.js`, and `tax.model.js`.
  * These files define the shape of your data and handle direct interactions with the database.
  * The Model does not care about HTTP requests or how the frontend looks; it only cares about successfully fetching, formatting, inserting, or updating data.

## 2. The View (V) - User Interface
The View handles everything the user sees and interacts with. In modern apps like yours, the View is completely decoupled into its own Next.js/React application.
* **Locations:** `src/` (Main App) and `crypto-terminal/frontend/`
* **Implementations in Your Code:**
  * Your UI components (`AuthFlow.tsx`, `Dashboard.jsx`, `TradingChart.jsx`, etc.) act as the View.
  * Instead of the server rendering the view templates (like EJS or Pug), the frontend frameworks (Next.js/React) manage their own DOM and state.
  * The View requests data from the Controller using Fetch/Axios (e.g., `axios.get('/api/market/ticker')`), waits for a JSON response, and then re-renders the DOM dynamically to react to that data.

## 3. The Controller (C) - The Brain / Traffic Cop
The Controller sits between the View and the Model. It listens to HTTP requests from the View via the Express Router, grabs necessary data from the Model, and sends a JSON response back to the View.
* **Location:** `backend/src/controllers/`
* **Implementations in Your Code:**
  * You have robust controllers like `auth.controller.js`, `trade.controller.js`, and `wallet.controller.js`.
  * **How it works:** When the frontend submits a login request, the `AuthRouter` intercepts the `POST` request and routes it to `auth.controller.js`. The controller then:
    1. Extracts and validates the incoming email and password.
    2. Asks the `User Model` if that email exists and if the password hash matches.
    3. If yes, it signs a JWT (Token) and sends a `200 OK` JSON response back to the View.
    4. If no, it catches the error and sends a `401 Unauthorized` JSON response back.

---

## 4. The Service Layer Pattern (An Extension of MVC)
Your project takes MVC a step further by utilizing a **Service Layer**. 

In a standard MVC app, the Controller can get bloated with heavy business logic (like complex tax calculations, external API calls, or WebSocket broadcasting). Your project offloads this heavy lifting:
* **Location:** `backend/src/services/` and `crypto-terminal/backend/services/`
* **Separation of Concerns:**
  1. **Controller:** Handles the HTTP Request and Response (`req`, `res`). Extracts query parameters and formats the final status output.
  2. **Service:** Handles the actual heavy lifting, complex math, or external API calling (e.g., Binance mapping, OpenAI research handling).
  3. **Model:** Handles saving the result to the database.

---

## Summary of Request Flow Example
* **(View):** User clicks "Buy BTC" in `TradingChart.jsx`. React sends a `POST /trade` request to the backend.
* **(Router):** `Express` sees the request, runs middleware (auth check, rate limit), and passes it to `trade.controller.js`.
* **(Controller):** Validates the payload structure and passes the user ID and quantity to the Trade Service.
* **(Service):** The Service executes the math, verifies live pricing via API, and validates the user's available balance.
* **(Model):** The Service/Controller asks `trade.model.js` to save the transaction to the database.
* **(Controller):** Returns a `{ success: true }` JSON response to the frontend.
* **(View):** React updates the dashboard state to show the new portfolio balance.
