/**
 * portfolio.controller.js — Portfolio HTTP handler
 */

import { getPortfolio } from "../services/portfolio.service.js";
import { sendSuccess }  from "../utils/helpers.js";

/**
 * GET /api/portfolio
 */
export async function portfolio(req, res, next) {
  console.log("\n[Debug] /api/user/portfolio route hit");
  console.log("User ID:", req.user.id);
  try {
    const data = await getPortfolio(req.user.id);
    console.log("[Debug] Portfolio data generated successfully");
    return sendSuccess(res, 200, "Portfolio fetched.", data);
  } catch (err) {
    next(err);
  }
}
