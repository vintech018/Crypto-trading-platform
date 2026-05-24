import request from "supertest";
import app from "../../src/app.js";
import { generateTestUser, generateTestToken } from "../helpers/authHelper.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import User from "../../src/models/User.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("🛡️ UPLOAD SECURITY TESTS", () => {
  let token;
  let testUser;
  let dummyImagePath;
  let exeFilePath;

  beforeAll(async () => {
    console.log("\n==================================================");
    console.log("[TEST] STARTING UPLOAD SECURITY & MIDDLEWARE SUITE");
    console.log("==================================================\n");

    testUser = await generateTestUser();
    token = generateTestToken(testUser._id);
    
    // Create temporary dummy files for testing
    dummyImagePath = path.join(__dirname, "test-image.png");
    exeFilePath = path.join(__dirname, "virus.exe");
    fs.writeFileSync(dummyImagePath, "fake image content");
    fs.writeFileSync(exeFilePath, "MZ fake executable content");
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(dummyImagePath)) fs.unlinkSync(dummyImagePath);
    if (fs.existsSync(exeFilePath)) fs.unlinkSync(exeFilePath);
  });

  describe("↳ Multer Validation Engine", () => {
    it("should successfully upload a valid image", async () => {
      console.log("[TEST] Uploading valid user avatar (.png) to mocked Cloudinary stream...");
      const res = await request(app)
        .post("/api/uploads/avatar")
        .set("Authorization", `Bearer ${token}`)
        .attach("avatar", dummyImagePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("profilePicture");
      expect(res.body.data.profilePicture).toContain("test-avatar.png"); // Matches our mock

      // Verify DB update
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.profilePicture).toBe(res.body.data.profilePicture);
      console.log(`[TEST] ✓ Avatar uploaded and MongoDB updated: ${res.body.data.profilePicture}`);
    });

    it("should reject executable files (.exe)", async () => {
      console.log("[TEST] Simulating malicious .exe upload attack...");
      const res = await request(app)
        .post("/api/uploads/avatar")
        .set("Authorization", `Bearer ${token}`)
        .attach("avatar", exeFilePath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/executable files are strictly prohibited/i);
      console.log(`[TEST] ✓ Threat neutralized. .exe rejected: ${res.body.message}`);
    });

    it("should reject missing files", async () => {
      console.log("[TEST] Verifying missing file handlers...");
      const res = await request(app)
        .post("/api/uploads/avatar")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no image file provided/i);
      console.log("[TEST] ✓ Missing file correctly identified.");
    });

    it("should reject incorrect MIME types for avatar", async () => {
      console.log("[TEST] Uploading disguised .txt file...");
      // Create a dummy txt file
      const txtPath = path.join(__dirname, "document.txt");
      fs.writeFileSync(txtPath, "text content");

      const res = await request(app)
        .post("/api/uploads/avatar")
        .set("Authorization", `Bearer ${token}`)
        .attach("avatar", txtPath);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid file type/i);
      console.log(`[TEST] ✓ MIME-type validation working: ${res.body.message}`);

      fs.unlinkSync(txtPath);
    });
  });
});
