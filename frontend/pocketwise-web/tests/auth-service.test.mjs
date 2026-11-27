import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/server/auth/password";
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
} from "../src/lib/server/auth/jwt";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerAuthRoutes } from "../src/lib/server/modules/auth/auth.router";
import { authService } from "../src/lib/server/modules/auth/auth.service";

async function testAuth() {
  console.log("Verifying Auth & Token Services (Task 1.1)...");

  // 1. Test Password Hash & Verify (ASP.NET Core Identity V3 format)
  const plainPassword = "SuperSecretPassword123!";
  const hash = hashPassword(plainPassword);
  assert.ok(hash && typeof hash === "string", "hashPassword should return base64 string");

  const isValid = verifyPassword(plainPassword, hash);
  assert.equal(isValid, true, "verifyPassword should return true for correct password");

  const isInvalid = verifyPassword("WrongPassword!", hash);
  assert.equal(isInvalid, false, "verifyPassword should return false for incorrect password");

  // 2. Test JWT Access Token generation & verification
  const testUser = {
    id: 999,
    email: "testuser@pocketwise.local",
    displayName: "Test User",
  };
  const testRoles = ["Member", "Admin"];

  const { token, expiresAt } = await generateAccessToken(testUser, testRoles, 60);
  assert.ok(token, "token must exist");
  assert.ok(expiresAt instanceof Date, "expiresAt must be Date");

  const claims = await verifyAccessToken(token);
  assert.ok(claims, "claims should be decoded");
  assert.equal(claims.sub, "999");
  assert.equal(claims.email, "testuser@pocketwise.local");
  assert.equal(claims.name, "Test User");
  assert.deepEqual(claims.roles, ["Member", "Admin"]);

  // 3. Test Refresh Token generation & SHA256 hashing
  const { token: refreshToken, hash: refreshHash, expiresAt: refreshExpires } =
    generateRefreshToken(30);
  assert.ok(refreshToken, "refreshToken must be generated");
  assert.ok(refreshHash, "refreshHash must be generated");
  assert.equal(refreshHash, hashToken(refreshToken), "hashToken should match");
  assert.ok(refreshExpires instanceof Date, "refreshExpires must be Date");

  // 4. Test Gateway Registration of Auth Routes
  gatewayRegistry.clear();
  registerAuthRoutes();
  console.log("Registered routes count:", gatewayRegistry.getRegisteredRoutes().length);

  const matchLogin = gatewayRegistry.match("POST", ["auth", "login"]);
  assert.ok(matchLogin, "POST auth/login should be registered in Smart Gateway");

  const matchRegister = gatewayRegistry.match("POST", ["auth", "register"]);
  assert.ok(matchRegister, "POST auth/register should be registered in Smart Gateway");

  const matchRefresh = gatewayRegistry.match("POST", ["auth", "refresh"]);
  assert.ok(matchRefresh, "POST auth/refresh should be registered in Smart Gateway");

  const matchLogout = gatewayRegistry.match("POST", ["auth", "logout"]);
  assert.ok(matchLogout, "POST auth/logout should be registered in Smart Gateway");

  const matchMe = gatewayRegistry.match("GET", ["auth", "me"]);
  assert.ok(matchMe, "GET auth/me should be registered in Smart Gateway");

  // 5. Test Registering a New User (Verifying no Postgres NULL constraint violation)
  const uniqueEmail = `test_reg_${Date.now()}_${Math.floor(Math.random() * 1000)}@pocketwise.local`;
  const regResult = await authService.register(
    "Integration Test User",
    uniqueEmail,
    "P@ssword123!"
  );
  assert.ok(regResult, "Register result should not be null");
  assert.ok(regResult.user.id, "Registered user should have a valid ID");
  assert.equal(regResult.user.displayName, "Integration Test User");
  assert.deepEqual(regResult.user.roles, ["Member"], "New user should have Member role");
  assert.ok(regResult.accessToken, "Should generate access token");
  assert.ok(regResult.refreshToken, "Should generate refresh token");
  console.log(`Registered test user ID: ${regResult.user.id} (${regResult.user.email})`);

  console.log("All Auth & Token Service tests passed successfully!");
}

testAuth().catch((err) => {
  console.error(err);
  process.exit(1);
});
