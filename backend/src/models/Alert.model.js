import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["INFO", "SUCCESS", "WARNING", "ERROR"],
      default: "INFO",
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

alertSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Alert", alertSchema);
