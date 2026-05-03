import { Router } from "express";
import { getAlerts } from "../controllers/alert.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getAlerts);

export default router;
