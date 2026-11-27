import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry.ts";

async function testGatewayRegistry() {
  console.log("Verifying GatewayRegistry routing...");

  gatewayRegistry.clear();

  // 1. Register routes
  gatewayRegistry.register("GET", "auth/me", async () => new Response("me"));
  gatewayRegistry.register("GET", "categories", async () => new Response("categories"));
  gatewayRegistry.register("GET", "categories/:id", async (ctx) => new Response(`category:${ctx.params.id}`));
  gatewayRegistry.register("PUT", "admin/users/:userId/status", async (ctx) => new Response(`status:${ctx.params.userId}`));

  // 2. Test exact match
  const matchMe = gatewayRegistry.match("GET", ["auth", "me"]);
  assert.ok(matchMe, "auth/me should match");
  assert.equal(matchMe.pattern, "auth/me");
  assert.deepEqual(matchMe.params, {});

  // 3. Test dynamic parameter match
  const matchCategory = gatewayRegistry.match("GET", ["categories", "42"]);
  assert.ok(matchCategory, "categories/:id should match");
  assert.equal(matchCategory.pattern, "categories/:id");
  assert.equal(matchCategory.params.id, "42");

  // 4. Test multi-segment dynamic parameter match
  const matchAdmin = gatewayRegistry.match("PUT", ["admin", "users", "101", "status"]);
  assert.ok(matchAdmin, "admin/users/:userId/status should match");
  assert.equal(matchAdmin.params.userId, "101");

  // 5. Test method mismatch
  const matchPost = gatewayRegistry.match("POST", ["categories"]);
  assert.equal(matchPost, null, "POST /categories should not match GET");

  // 6. Test unmatched route (fallback)
  const matchUnknown = gatewayRegistry.match("GET", ["unregistered", "path"]);
  assert.equal(matchUnknown, null, "unregistered route should return null (fallback to forward)");

  console.log("All GatewayRegistry routing tests passed successfully!");
}

testGatewayRegistry().catch((err) => {
  console.error(err);
  process.exit(1);
});
