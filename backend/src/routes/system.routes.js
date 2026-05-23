import express from "express";
import { getQueues, getRedisHealth, getWorkers } from "../controllers/system.controller.js";

const router = express.Router();

router.get("/queues", getQueues);
router.get("/redis-health", getRedisHealth);
router.get("/workers", getWorkers);

export default router;
