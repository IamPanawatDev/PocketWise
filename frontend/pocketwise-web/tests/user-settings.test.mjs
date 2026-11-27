import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerUserSettingsRoutes } from "../src/lib/server/modules/user/user-settings.router";
import { getAuthenticatedUser } from "../src/lib/server/auth/current-user";
import { generateAccessToken } from "../src/lib/server/auth/jwt";

async function testUserSettings() {
  console.log("Verifying User Settings & Profile Modules (Task 1.2)...");

  // 1. Test Route Registration in Gateway
  gatewayRegistry.clear();
  registerUserSettingsRoutes();

  const matchGetSettings = gatewayRegistry.match("GET", ["settings"]);
  assert.ok(matchGetSettings, "GET settings should match");

  const matchPutSettings = gatewayRegistry.match("PUT", ["settings"]);
  assert.ok(matchPutSettings, "PUT settings should match");

  const matchDataReset = gatewayRegistry.match("POST", ["users", "me", "data-reset"]);
  assert.ok(matchDataReset, "POST users/me/data-reset should match");

  // 2. Test getAuthenticatedUser with valid token
  const { token } = await generateAccessToken(
    { id: 123, email: "user@pocketwise.local", displayName: "Pocket User" },
    ["Member"],
    60,
  );

  const mockCtx = {
    token,
    req: {
      headers: new Headers(),
    },
  };

  const authenticated = await getAuthenticatedUser(mockCtx);
  assert.equal(authenticated.userId, 123);
  assert.equal(authenticated.email, "user@pocketwise.local");
  assert.deepEqual(authenticated.roles, ["Member"]);

  // 3. Test getAuthenticatedUser without token
  const unauthCtx = {
    token: null,
    req: {
      headers: new Headers(),
    },
  };

  await assert.rejects(
    async () => {
      await getAuthenticatedUser(unauthCtx);
    },
    { name: "AppError", code: "UNAUTHORIZED" },
    "Should throw UNAUTHORIZED when no token provided",
  );

  console.log("All User Settings tests passed successfully!");
}

testUserSettings().catch((err) => {
  console.error(err);
  process.exit(1);
});
