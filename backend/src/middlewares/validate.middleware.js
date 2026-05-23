import { z } from "zod";
import { AppError } from "../utils/helpers.js";
import { SUPPORTED_COINS } from "../utils/constants.js";

const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const data = schema.parse(req[source]);
    req[source] = data; // replace with stripped/sanitized/normalized data
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.errors.map(e => e.message).join(" ");
      return next(new AppError(errors, 400));
    }
    next(err);
  }
};

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("A valid email is required."),
  password: z.string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number.")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character.")
}).strict(); // strict rejects unknown fields

const loginSchema = z.object({
  email: z.string().min(1, "Email is required."),
  password: z.string().min(1, "Password is required.")
}).strict();

const tradeSchema = z.object({
  coin: z.string().transform(v => v.toUpperCase()).refine(v => SUPPORTED_COINS.includes(v), {
    message: `Coin must be one of: ${SUPPORTED_COINS.join(", ")}.`
  }),
  quantity: z.preprocess((val) => parseFloat(String(val)), z.number().positive("Quantity must be a positive number.")),
  price: z.preprocess((val) => parseFloat(String(val)), z.number().positive("Price must be a positive number."))
}).strict();

const depositSchema = z.object({
  amount: z.preprocess((val) => parseFloat(String(val)), z.number().positive("Deposit amount must be a positive number."))
}).strict();

const orderSchema = tradeSchema.extend({
  type: z.string().transform(v => v.toUpperCase()).refine(v => ["BUY", "SELL"].includes(v), {
    message: "type must be BUY or SELL."
  })
}).strict();

const closeTradeSchema = z.object({
  coin: z.string().transform(v => v.toUpperCase()).refine(v => SUPPORTED_COINS.includes(v), {
    message: `coin must be one of: ${SUPPORTED_COINS.join(", ")}.`
  }),
  quantity: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return null;
    return parseFloat(String(val));
  }, z.number().positive("quantity must be a positive number (omit to close the full position).").nullable().optional())
}).strict();

const reportQuerySchema = z.object({
  startDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), "startDate is not a valid date."),
  endDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), "endDate is not a valid date."),
  asset: z.string().optional().transform(v => v ? v.toUpperCase() : v).refine(v => !v || SUPPORTED_COINS.includes(v), {
    message: `asset must be one of: ${SUPPORTED_COINS.join(", ")}.`
  }),
  limit: z.preprocess((val) => {
    if (val !== undefined) return Number(val);
  }, z.number().optional()),
  days: z.preprocess((val) => {
    if (val !== undefined) return Number(val);
  }, z.number().optional()),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, { message: "startDate must be before endDate.", path: ["startDate"] });

export const validateSignup = validate(signupSchema);
export const validateLogin = validate(loginSchema);
export const validateTrade = validate(tradeSchema);
export const validateDeposit = validate(depositSchema);
export const validateOrder = validate(orderSchema);
export const validateCloseTrade = validate(closeTradeSchema);
export const validateReportQuery = validate(reportQuerySchema, 'query');
