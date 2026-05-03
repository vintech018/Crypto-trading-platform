/**
 * portfolio.controller.js — Portfolio HTTP handler
 */

import { getPortfolio } from "../services/portfolio.service.js";
import { sendSuccess }  from "../utils/helpers.js";

/**
 * GET /api/portfolio
 */
export async function portfolio(req, res, next) {
  try {
    const data = await getPortfolio(req.user.id);
    return sendSuccess(res, 200, "Portfolio fetched.", data);
  } catch (err) {
    next(err);
  }
}
