# Beginner's Guide to Automated Testing with Jest
**Project:** SOLIDUS Crypto Trading Platform

This guide will teach you exactly how to run and demonstrate the backend testing system for your viva or project presentation.

---

## 1. What is Jest?

**Jest** is a popular JavaScript testing framework maintained by the open-source community (originally built by Facebook). 

Think of it as a robot that automatically acts like a user: it logs in, clicks buttons, buys crypto, and checks if the system behaves correctly. If everything works, it gives a **PASS**. If something breaks, it gives a **FAIL** and tells you exactly where the bug is.

**Why companies use it:**
* **Safety:** Developers can write new code without fear of accidentally breaking old features.
* **Speed:** Instead of manually clicking through the app to test everything, Jest tests the entire backend in seconds.
* **Quality:** It ensures the platform handles edge cases (e.g., trying to buy crypto without enough balance) securely.

---

## 2. Opening the Project in Terminal

To run the tests, you need to open your terminal (Command Prompt on Windows, Terminal on Mac) and navigate to the `backend` folder where the tests live.

1. Open VS Code or your terminal.
2. Navigate to the backend directory:
   ```bash
   cd path/to/Crypto-trading-platform/backend
   ```
3. Make sure you have your dependencies installed before testing!

---

## 3. Exact Commands to Run

Here are the commands you will use. Type them into your terminal and press **Enter**:

### Install Dependencies
```bash
npm install
```

### Run All Tests Once
```bash
npm test
```

### Run Tests in "Watch Mode" (Live)
```bash
npm run test:watch
```

### Run Tests and Show Coverage Report
```bash
npm run test:coverage
```

---

## 4. What Each Command Does

* `npm install` — Downloads all the necessary tools and libraries (like Jest) from the internet to make your code work. You only need to run this once when you set up the project.
* `npm test` — Starts the Jest testing robot. It will go through every single test file, run the scenarios, and print out a final pass/fail report.
* `npm run test:watch` — Keeps Jest running in the background. If you edit a file and click "Save", Jest automatically re-runs only the tests related to that file. It’s perfect for active development.
* `npm run test:coverage` — Runs all tests and generates a "Report Card" (Coverage Report) showing exactly what percentage of your total code was actually tested by the robot.

---

## 5. Reading the Jest Output

When you run `npm test`, you'll see a lot of text scrolling by. Here is how to read it:

* ✅ **PASS**: The test succeeded! The feature works perfectly.
* ❌ **FAIL**: The test failed! There is a bug in the code or the test logic.
* **Suites**: A "Suite" is a single file containing multiple tests (e.g., `trade.test.js` is one suite).
* **Assertions**: An assertion is a specific check (e.g., "I assert that the user's balance went down by $10"). If the check is true, the test passes.

**Example Output:**
```text
PASS tests/integration/trade.test.js
  📈 TRADING ENGINE TESTS
    ✓ should execute BUY and deduct balance (103 ms)
    ✓ should reject BUY with insufficient balance (72 ms)
```

---

## 6. Understanding the Coverage Report

When you run `npm run test:coverage`, you get a table at the end. Here is what the columns mean:

* **Statements (`% Stmts`)**: What percentage of individual commands in your code were executed during the tests?
* **Branches (`% Branch`)**: Did the tests check every possible path? (e.g., did we test both the `if` condition AND the `else` condition?)
* **Functions (`% Funcs`)**: What percentage of your Javascript functions were called by the tests?
* **Lines (`% Lines`)**: Very similar to statements; the percentage of lines of code tested.

> [!TIP]
> A coverage of 70-80% is considered excellent in the industry. It means the core business logic is heavily protected.

---

## 7. How to Explain This in Your Viva

During your presentation, use these professional, punchy sentences:

* *"We use Jest as our automated testing framework to ensure backend validation and integrity."*
* *"By running these tests, we mathematically verify our core flows—like authentication, trade execution, and wallet ledger updates."*
* *"Our test coverage report proves that we handle edge cases, such as rejecting trades when a user has insufficient funds, ensuring the platform is secure for production deployment."*

---

## 8. Troubleshooting Common Issues

> [!WARNING]
> If a test fails during the demo, don't panic! Use it as a talking point.

* **"Cannot find module"**: You forgot to run `npm install`. Run it and try again.
* **"Port already in use"**: Another instance of your backend is running. Stop your local server (`CTRL + C`) before running the tests.
* **"Missing env variables"**: The tests require a `.env` file or environment variables to connect to mock databases. Ensure your config is loaded.
* **A Failing Test**: Say, *"Ah, a test failed. This is exactly why we use Jest—it catches bugs before our users do. The stack trace shows me exactly which file needs a fix."*

---

## 9. Recommended Demo Flow (Step-by-Step)

Here is exactly how you should structure your live demonstration:

1. **Open the Terminal**: Open your terminal inside the `backend/` folder and make sure it is visible on screen.
2. **Execute the Suite**: Type `npm test` and hit enter.
3. **Narrate while it runs**: *"I am now initializing the automated test suite using Jest. It spins up an isolated memory database so we don't corrupt real user data."*
4. **Point to the Results**: When the green `PASS` text appears, point out the specific scenarios tested (e.g., *"Notice how it automatically tested the buy/sell logic and caught an intentional naked short-sell attempt"*).
5. **Run Coverage**: Type `npm run test:coverage`.
6. **Explain the Table**: When the table prints, say *"This coverage report analyzes our codebase and confirms that our core trading and security middleware are thoroughly tested."*
7. **Conclude**: *"Because of this automated CI/CD pipeline, we can confidently deploy updates to production without fear of regressions."*
