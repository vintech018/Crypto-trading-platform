# 🚀 SOLIDUS Complete Run & Deploy Guide

Welcome! This is the **Ultimate Beginner's Guide** for running, verifying, and presenting the SOLIDUS Crypto Trading Platform. 

Whether you are preparing for a university Viva, a recruiter walkthrough, or preparing to deploy your code to production, this guide will walk you through *every single step* from opening the folder to explaining the code.

---

## 1. Project Structure Overview 📁

Before we type any commands, let's understand how the project is organized.

* **`/` (Root Folder)**: Contains the **Frontend** (Next.js, React, Tailwind). This is the code that controls what the user sees on the screen.
* **`/backend`**: Contains the **Backend** (Node.js, Express). This is the server that handles user logins, database interactions, and business logic.
* **`/backend/prisma`**: Contains the PostgreSQL database schema and migration files.
* **`/backend/tests`**: Contains all of our Jest automated testing suites.

> [!NOTE]
> The frontend and backend are two separate applications living in the same big folder. They must be run in **two separate terminal windows**.

---

## 2. Opening The Project 💻

To run any commands, you must use the **Terminal**.

1. Open **VS Code**.
2. Click **Terminal > New Terminal** in the top menu bar.
3. You will see a blinking cursor. Use the `cd` (Change Directory) command to move into your project folder.

If your terminal opens in your `Desktop` or `solidus` folder, you must navigate into the main project folder first:

```bash
cd Crypto-trading-platform
```

You can use the `ls` command (List) to see all the files in your current folder:
```bash
ls
```

You can use `pwd` (Print Working Directory) to see exactly which folder you are currently inside:
```bash
pwd
```

---

## 3. Installing Dependencies 📦

A "Dependency" is a piece of code written by someone else (like React or Jest) that our project needs to work. We must download them from the internet using `npm` (Node Package Manager).

**Step 1: Install Frontend Dependencies**
Make sure you are in the `Crypto-trading-platform` folder, then run:
```bash
npm install
```

**Step 2: Install Backend Dependencies**
Next, move into the backend folder and install its dependencies:
```bash
cd backend
npm install
```

---

## 4. Running the Frontend 🖥️

Open a **NEW** terminal tab in VS Code. Make sure you are inside the `Crypto-trading-platform` folder.

Run the frontend development server:
```bash
npm run dev
```

* **What should happen:** The terminal will say `Ready in X ms` and show a local URL like `http://localhost:3000`.
* **Action:** Open your web browser and go to `http://localhost:3000`. You should see the SOLIDUS homepage!
* **Common Error:** "Port 3000 is already in use." This means you already have a frontend running in another terminal. Find it and stop it by pressing `CTRL + C`.

---

## 5. Running the Backend ⚙️

Open a **SECOND NEW** terminal tab in VS Code. Navigate into the backend folder:
```bash
cd backend
```

Run the backend server:
```bash
npm run dev
```

* **Expected Terminal Logs:** You should see green checkmarks verifying the Database, Redis, and APIs have connected successfully. 
* **Successful Startup:** It should say `Server running on port 5050`.
* **Common Error:** "Cannot connect to MongoDB" or "Redis Connection Failed". This means you haven't set up your `.env` variables or your database servers are offline.

---

## 6. Running Redis / PostgreSQL / Prisma 🗄️

* **MongoDB:** Our primary database. Stores users and trades.
* **Redis:** Used for WebSockets (real-time charts) and BullMQ (background tasks). You need Redis running for the background queues to work.
* **PostgreSQL:** Our secondary analytics database.
* **Prisma:** The tool we use to talk to PostgreSQL.

If you make changes to your PostgreSQL database structure, you must update Prisma using the terminal (inside the `backend/` folder):

Generate the client (so your code understands the database):
```bash
npx prisma generate
```

Deploy your changes to the database (only during deployment):
```bash
npx prisma migrate deploy
```

---

## 7. Running Tests 🧪

We use **Jest** to run automated robots that test our code to make sure there are no bugs.

In your terminal, navigate to the `backend/` folder:
```bash
cd backend
```

**Run all tests:**
```bash
npm test
```
* **PASS**: The code works perfectly.
* **FAIL**: There is a bug. Read the red error message to see what broke.

**Check Test Coverage:**
```bash
npm run test:coverage
```
* **Coverage %**: This tells you what percentage of your code was tested by the robot. High coverage means fewer bugs in production!

---

## 8. Running Lint & Build Checks 🏗️

Before we deploy to the real internet, we must ensure our code is flawless. 

Open a terminal in the `Crypto-trading-platform` folder (the frontend):

**1. Check for messy code (Linting):**
```bash
npm run lint
```
* Verifies there are no unused variables or formatting errors.

**2. Check for TypeScript Errors:**
```bash
npx tsc --noEmit
```
* Verifies there are no strict type mismatches.

**3. Build the Production App:**
```bash
npm run build
```
* This squashes all your code into a tiny, ultra-fast bundle. If this command finishes with a green `✓ Compiled successfully`, your frontend is 100% ready for the internet!

---

## 9. Full Verification Flow (Checklist) ✅

Want to do a full system check before a demo? Follow this exact order:

1. `cd Crypto-trading-platform` -> run `npm install`
2. `cd backend` -> run `npm install`
3. `cd backend` -> run `npm run dev` (Keep this terminal open)
4. Open new terminal -> `cd Crypto-trading-platform` -> run `npm run dev` (Keep this open)
5. Open browser -> Go to `http://localhost:3000` -> Verify Login works.
6. Verify WebSockets work (charts should move in real-time).
7. Verify Avatar Uploads work.
8. Open new terminal -> `cd backend` -> run `npm test` (Verify all tests pass).
9. Run `npm run test:coverage` (Verify coverage report prints).
10. `cd ..` (Back to frontend) -> run `npm run lint`
11. Run `npm run build`

If all 11 steps pass, **your project is flawless.**

---

## 10. Viva / Interview Demonstration Section 🎤

If a teacher or recruiter asks you to explain the technical details, say these exact phrases:

* **On Automated Testing (Jest):** "I used Jest to write automated integration tests. This allows me to mathematically verify my core backend logic—like preventing naked short-sells and validating secure uploads—without manually clicking through the app."
* **On Real-Time Data (WebSockets):** "The trading charts are powered by Socket.io and Redis. This allows the server to push live price updates directly to the browser without the browser having to constantly refresh."
* **On Databases (Prisma/Mongo):** "I used a dual-database architecture. MongoDB handles the high-speed trading ledger, while PostgreSQL, managed via Prisma, acts as an isolated analytics warehouse so heavy queries don't slow down the main app."
* **On Background Tasks (BullMQ):** "Heavy tasks like calculating daily PNL are offloaded to background workers using BullMQ and Redis. This keeps the main API incredibly fast and responsive."
* **On Production Hardening:** "I hardened the platform for deployment by resolving all TypeScript compilation errors, strictly managing memory cleanup for WebSockets on the frontend, and enforcing strict ESLint rules."

---

## 11. Troubleshooting 🚑

Don't panic! Here are common errors and how to fix them:

* **Error:** `sh: next: command not found` or `Cannot find module`
  * **Fix:** You forgot to install dependencies! Run `npm install`.
* **Error:** `Port 3000 is already in use` or `EADDRINUSE: 5050`
  * **Fix:** You left a server running in a hidden terminal window. Find it and press `CTRL + C` to kill it, or restart VS Code.
* **Error:** `prisma.dailyPnL.create is not a function` (in tests)
  * **Fix:** The Prisma client wasn't generated. Run `npx prisma generate` in the backend folder.
* **Error:** WebSockets aren't connecting (Charts are frozen)
  * **Fix:** Ensure your `NEXT_PUBLIC_BACKEND_URL` is correctly set in your frontend `.env.local` file to point to your backend.
* **Error:** Tests fail with `Timeout`
  * **Fix:** Your local Redis or MongoDB server might be sleeping or turned off.

---

## 12. Deployment Preparation 🌍

When you are ready to put SOLIDUS on the internet (Railway & Vercel):

1. **Environment Variables:** Make sure you copy all your `.env` variables into the Railway and Vercel dashboards. The internet servers don't have access to your local `.env` file!
2. **Order of Deployment:** 
   * Deploy the **Backend to Railway** FIRST.
   * Wait for Railway to give you the live URL (e.g., `https://solidus-api.up.railway.app`).
   * Copy that URL and paste it as `NEXT_PUBLIC_BACKEND_URL` in Vercel.
   * Deploy the **Frontend to Vercel** SECOND.
3. **Database Migrations:** After deploying the backend to Railway, you MUST run `npx prisma migrate deploy` to create the SQL tables in the cloud.

You are now a full-stack master! Good luck with your Viva/Deployments! 🚀
