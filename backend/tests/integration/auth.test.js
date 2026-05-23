import request from "supertest";
import app from "../../src/app.js";
import User from "../../src/models/User.model.js";

describe("🔑 AUTH TESTS", () => {
  const validSignupPayload = {
    name: "Demo User",
    email: "demo@solidus.dev",
    password: "Password123!"
  };

  beforeAll(() => {
    console.log("\n==================================================");
    console.log("[TEST] STARTING AUTHENTICATION INTEGRATION SUITE");
    console.log("==================================================\n");
  });

  describe("↳ Registration Engine", () => {
    it("should register a new user successfully", async () => {
      console.log("[TEST] Executing signup payload for demo@solidus.dev...");
      const res = await request(app)
        .post("/api/auth/signup")
        .send(validSignupPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data.user.email).toBe(validSignupPayload.email);

      // Verify DB insertion
      const user = await User.findOne({ email: validSignupPayload.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(validSignupPayload.name);
      console.log("[TEST] ✓ User created successfully. JWT generated.");
    });

    it("should fail when duplicate email is used", async () => {
      console.log("[TEST] Attempting duplicate registration...");
      // First registration
      await request(app).post("/api/auth/signup").send(validSignupPayload);
      
      // Second registration
      const res = await request(app)
        .post("/api/auth/signup")
        .send(validSignupPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered/i);
      console.log(`[TEST] ✓ Duplicate rejected: ${res.body.message}`);
    });
  });

  describe("↳ Login Engine", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/signup").send(validSignupPayload);
    });

    it("should login successfully with valid credentials", async () => {
      console.log("[TEST] Authenticating valid user credentials...");
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: validSignupPayload.email,
          password: validSignupPayload.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("accessToken");
      console.log("[TEST] ✓ Login successful. Token dispensed.");
    });

    it("should fail with invalid password", async () => {
      console.log("[TEST] Attempting login with incorrect password...");
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: validSignupPayload.email,
          password: "WrongPassword1!"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
      console.log(`[TEST] ✓ Authentication rejected correctly: ${res.body.message}`);
    });
  });

  describe("↳ Protected Routes", () => {
    it("should reject access without token", async () => {
      console.log("[TEST] Simulating unauthorized route access...");
      const res = await request(app).get("/api/me");
      expect(res.status).toBe(401);
      console.log("[TEST] ✓ Access denied with 401 Unauthorized.");
    });

    it("should allow access with valid token", async () => {
      console.log("[TEST] Verifying valid JWT token access...");
      const loginRes = await request(app)
        .post("/api/auth/signup")
        .send(validSignupPayload);
      
      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get("/api/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(validSignupPayload.email);
      console.log("[TEST] ✓ JWT validated successfully.");
    });
  });
});
