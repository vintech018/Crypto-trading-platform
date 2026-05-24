import Alert from "../models/Alert.model.js";

export async function getAlerts(req, res, next) {
  try {
    const alerts = await Alert.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: { alerts },
    });
  } catch (err) {
    next(err);
  }
}

export async function createAlert(userId, message, type = "INFO") {
  try {
    await Alert.create({ userId, message, type });
  } catch (err) {
    console.error("Failed to create alert:", err);
  }
}
