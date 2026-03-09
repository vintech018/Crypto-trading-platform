const express = require("express");
const axios = require("axios");
const { z } = require("zod");

const router = express.Router();

router.post("/research", async (req, res, next) => {
  try {
    const schema = z.object({
      query: z.string().trim().min(3).max(500),
    });

    const payload = schema.parse(req.body);

    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const response = await axios.post(`${aiUrl}/research`, payload, {
      timeout: 20_000,
    });

    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
