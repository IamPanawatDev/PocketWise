import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerTagRoutes } from "../src/lib/server/modules/tags/tag.router";
import { registerMerchantRoutes } from "../src/lib/server/modules/merchants/merchant.router";
import { TagService } from "../src/lib/server/modules/tags/tag.service";
import { MerchantService } from "../src/lib/server/modules/merchants/merchant.service";
import { CategoryService } from "../src/lib/server/modules/categories/category.service";

async function testTagsAndMerchants() {
  console.log("Verifying Tags & Merchants Modules (Task 2.2)...");

  // 1. Gateway Registration
  registerTagRoutes();
  registerMerchantRoutes();

  const matchTagsGet = gatewayRegistry.match("GET", ["tags"]);
  assert.ok(matchTagsGet, "GET tags should match");

  const matchTagsGetById = gatewayRegistry.match("GET", ["tags", "12"]);
  assert.ok(matchTagsGetById, "GET tags/:id should match");

  const matchTagsPost = gatewayRegistry.match("POST", ["tags"]);
  assert.ok(matchTagsPost, "POST tags should match");

  const matchTagsReorder = gatewayRegistry.match("PUT", ["tags", "reorder"]);
  assert.ok(matchTagsReorder, "PUT tags/reorder should match");

  const matchTagsPut = gatewayRegistry.match("PUT", ["tags", "12"]);
  assert.ok(matchTagsPut, "PUT tags/:id should match");

  const matchTagsDelete = gatewayRegistry.match("DELETE", ["tags", "12"]);
  assert.ok(matchTagsDelete, "DELETE tags/:id should match");

  const matchMerchantsGet = gatewayRegistry.match("GET", ["merchants"]);
  assert.ok(matchMerchantsGet, "GET merchants should match");

  const matchMerchantsGetById = gatewayRegistry.match("GET", ["merchants", "55"]);
  assert.ok(matchMerchantsGetById, "GET merchants/:id should match");

  const matchMerchantsPost = gatewayRegistry.match("POST", ["merchants"]);
  assert.ok(matchMerchantsPost, "POST merchants should match");

  const matchMerchantsPut = gatewayRegistry.match("PUT", ["merchants", "55"]);
  assert.ok(matchMerchantsPut, "PUT merchants/:id should match");

  const matchMerchantsDelete = gatewayRegistry.match("DELETE", ["merchants", "55"]);
  assert.ok(matchMerchantsDelete, "DELETE merchants/:id should match");

  console.log("Gateway Route Registration verified!");

  // 2. Tag Service Verification
  const testUserId = 1; // existing test user (famreplay@gmail.com)
  const testTagName = `Tag_${Date.now()}`;

  // 2.1 Create Tag
  const createdTag = await TagService.create(testUserId, {
    tagName: testTagName,
    color: "#ff0077",
  });

  assert.equal(createdTag.tagName, testTagName);
  assert.equal(createdTag.color, "#ff0077");
  assert.equal(createdTag.sortOrder, 0);
  console.log("Created Tag ID:", createdTag.tagId);

  // 2.2 Duplicate Tag Conflict
  await assert.rejects(
    async () => {
      await TagService.create(testUserId, {
        tagName: testTagName,
      });
    },
    { code: "CONFLICT" },
    "Duplicate tag name should throw CONFLICT"
  );

  // 2.3 GetAll Tags
  const allTags = await TagService.getAll(testUserId);
  const found = allTags.find((t) => t.tagId === createdTag.tagId);
  assert.ok(found, "Created tag should be in getAll");

  // 2.4 Update Tag
  const updatedTag = await TagService.update(createdTag.tagId, testUserId, {
    tagName: `${testTagName}_Upd`,
    color: "#00eeff",
  });
  assert.ok(updatedTag);
  assert.equal(updatedTag.tagName, `${testTagName}_Upd`);
  assert.equal(updatedTag.color, "#00eeff");

  // 2.5 Reorder Tags
  await TagService.reorder(testUserId, {
    items: [{ tagId: createdTag.tagId, sortOrder: 99 }],
  });
  const afterReorder = await TagService.getById(createdTag.tagId, testUserId);
  assert.equal(afterReorder?.sortOrder, 99);

  // 2.6 Delete Tag
  const tagDeleted = await TagService.delete(createdTag.tagId, testUserId);
  assert.equal(tagDeleted, true);

  console.log("Tag Service verification passed!");

  // 3. Merchant Service Verification
  const categoriesList = await CategoryService.getAll(testUserId);
  const defaultCategory = categoriesList[0];

  const testMerchantName = `Merchant_${Date.now()}`;

  // 3.1 Create Merchant
  const createdMerchant = await MerchantService.create(testUserId, {
    merchantName: testMerchantName,
    defaultCategoryId: defaultCategory?.categoryId ?? null,
    bankOrProvider: "KBANK",
  });

  assert.equal(createdMerchant.merchantName, testMerchantName);
  assert.equal(createdMerchant.defaultCategoryId, defaultCategory?.categoryId ?? null);
  assert.equal(createdMerchant.bankOrProvider, "KBANK");
  assert.equal(createdMerchant.isVerified, false);
  console.log("Created Merchant ID:", createdMerchant.merchantId);

  // 3.2 Duplicate Merchant Conflict
  await assert.rejects(
    async () => {
      await MerchantService.create(testUserId, {
        merchantName: testMerchantName,
      });
    },
    { code: "CONFLICT" },
    "Duplicate merchant name should throw CONFLICT"
  );

  // 3.3 GetById Merchant
  const fetchedMerchant = await MerchantService.getById(createdMerchant.merchantId);
  assert.ok(fetchedMerchant);
  assert.equal(fetchedMerchant.merchantName, testMerchantName);

  // 3.4 Update Merchant
  const updatedMerchant = await MerchantService.update(
    createdMerchant.merchantId,
    testUserId,
    {
      merchantName: `${testMerchantName}_Upd`,
      defaultCategoryId: defaultCategory?.categoryId ?? null,
      bankOrProvider: "SCB",
      isVerified: true,
    }
  );
  assert.ok(updatedMerchant);
  assert.equal(updatedMerchant.merchantName, `${testMerchantName}_Upd`);
  assert.equal(updatedMerchant.bankOrProvider, "SCB");
  assert.equal(updatedMerchant.isVerified, true);

  // 3.5 Delete Merchant
  const merchantDeleted = await MerchantService.delete(createdMerchant.merchantId, testUserId);
  assert.equal(merchantDeleted, true);

  console.log("Merchant Service verification passed!");
  console.log("All Tags & Merchants tests passed 100%!");
  process.exit(0);
}

testTagsAndMerchants().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
