import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀" });
});

export default app;
