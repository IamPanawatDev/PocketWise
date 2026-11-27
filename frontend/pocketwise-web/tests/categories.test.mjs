import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerCategoryRoutes } from "../src/lib/server/modules/categories/category.router";
import { CategoryService } from "../src/lib/server/modules/categories/category.service";

async function testCategories() {
  console.log("Verifying Categories & Category Rules (Task 2.1)...");

  // 1. Test Gateway Route Registration
  registerCategoryRoutes();

  const matchGetAll = gatewayRegistry.match("GET", ["categories"]);
  assert.ok(matchGetAll, "GET categories should match");

  const matchGetById = gatewayRegistry.match("GET", ["categories", "42"]);
  assert.ok(matchGetById, "GET categories/:id should match");
  assert.equal(matchGetById.params.id, "42");

  const matchPost = gatewayRegistry.match("POST", ["categories"]);
  assert.ok(matchPost, "POST categories should match");

  const matchReorder = gatewayRegistry.match("PUT", ["categories", "reorder"]);
  assert.ok(matchReorder, "PUT categories/reorder should match");

  const matchPut = gatewayRegistry.match("PUT", ["categories", "42"]);
  assert.ok(matchPut, "PUT categories/:id should match");

  const matchDelete = gatewayRegistry.match("DELETE", ["categories", "42"]);
  assert.ok(matchDelete, "DELETE categories/:id should match");

  const matchRulesGetAll = gatewayRegistry.match("GET", ["category-rules"]);
  assert.ok(matchRulesGetAll, "GET category-rules should match");

  const matchRulesSuggest = gatewayRegistry.match("GET", ["category-rules", "suggest"]);
  assert.ok(matchRulesSuggest, "GET category-rules/suggest should match");

  const matchRulesGetById = gatewayRegistry.match("GET", ["category-rules", "99"]);
  assert.ok(matchRulesGetById, "GET category-rules/:id should match");
  assert.equal(matchRulesGetById.params.id, "99");

  const matchRulesPost = gatewayRegistry.match("POST", ["category-rules"]);
  assert.ok(matchRulesPost, "POST category-rules should match");

  const matchRulesPut = gatewayRegistry.match("PUT", ["category-rules", "99"]);
  assert.ok(matchRulesPut, "PUT category-rules/:id should match");

  const matchRulesDelete = gatewayRegistry.match("DELETE", ["category-rules", "99"]);
  assert.ok(matchRulesDelete, "DELETE category-rules/:id should match");

  console.log("Gateway Route Registration verified!");

  // 2. Test Category Service DB operations with an existing test user ID
  const testUserId = 1; // Existing test user (famreplay@gmail.com)
  const testCategoryName = `AutoTestCat_${Date.now()}`;

  // 2.1 GetAll (should include system categories)
  const initialCategories = await CategoryService.getAll(testUserId);
  assert.ok(Array.isArray(initialCategories), "Categories should be an array");
  const systemCats = initialCategories.filter((c) => c.isSystem);
  assert.ok(systemCats.length > 0, "System categories should be present");

  // 2.2 Create Category
  const createdCategory = await CategoryService.create(testUserId, {
    categoryName: testCategoryName,
    categoryType: "expense",
    icon: "Utensils",
    color: "#ff5500",
  });

  assert.equal(createdCategory.categoryName, testCategoryName);
  assert.equal(createdCategory.categoryType, "expense");
  assert.equal(createdCategory.icon, "Utensils");
  assert.equal(createdCategory.color, "#ff5500");
  assert.equal(createdCategory.isSystem, false);
  console.log("Created category:", createdCategory.categoryId);

  // 2.3 Duplicate Name conflict check
  await assert.rejects(
    async () => {
      await CategoryService.create(testUserId, {
        categoryName: testCategoryName,
        categoryType: "expense",
      });
    },
    { code: "CONFLICT" },
    "Duplicate category name should throw CONFLICT"
  );

  // 2.4 Update Category
  const updatedCategory = await CategoryService.update(createdCategory.categoryId, testUserId, {
    categoryName: `${testCategoryName}_Updated`,
    categoryType: "both",
    icon: "Coffee",
    color: "#00aaff",
    isActive: true,
  });

  assert.ok(updatedCategory, "Updated category should not be null");
  assert.equal(updatedCategory.categoryName, `${testCategoryName}_Updated`);
  assert.equal(updatedCategory.categoryType, "both");
  assert.equal(updatedCategory.icon, "Coffee");

  // 2.5 Reorder Categories
  await CategoryService.reorder(testUserId, {
    items: [{ categoryId: createdCategory.categoryId, sortOrder: 1 }],
  });

  const afterReorder = await CategoryService.getAll(testUserId);
  const reorderedCat = afterReorder.find((c) => c.categoryId === createdCategory.categoryId);
  assert.ok(reorderedCat, "Reordered category should exist");

  // 3. Category Rules
  const testRuleName = `Rule_${Date.now()}`;
  const testPattern = `TestPattern_${Date.now()}`;

  // 3.1 Create Rule
  const createdRule = await CategoryService.createRule(testUserId, {
    ruleName: testRuleName,
    matchType: "description",
    matchPattern: testPattern,
    categoryId: createdCategory.categoryId,
    priority: 10,
  });

  assert.equal(createdRule.ruleName, testRuleName);
  assert.equal(createdRule.matchType, "description");
  assert.equal(createdRule.matchPattern, testPattern);
  assert.equal(createdRule.categoryId, createdCategory.categoryId);
  assert.equal(createdRule.priority, 10);
  assert.equal(createdRule.isGlobal, false);
  console.log("Created rule:", createdRule.categoryRuleId);

  // 3.2 Suggest Category
  const suggestion = await CategoryService.suggestCategory(
    testUserId,
    `Prefix text with ${testPattern} inside`
  );
  assert.ok(suggestion, "Suggestion should match");
  assert.equal(suggestion.categoryId, createdCategory.categoryId);
  assert.equal(suggestion.source, "category-rule");
  console.log("Category suggestion verified!");

  // 3.3 Update Rule
  const updatedRule = await CategoryService.updateRule(
    createdRule.categoryRuleId,
    testUserId,
    {
      ruleName: `${testRuleName}_Updated`,
      matchType: "merchantName",
      matchPattern: `${testPattern}_Updated`,
      categoryId: createdCategory.categoryId,
      priority: 5,
      isActive: true,
    }
  );
  assert.ok(updatedRule, "Updated rule should exist");
  assert.equal(updatedRule.ruleName, `${testRuleName}_Updated`);
  assert.equal(updatedRule.matchType, "merchantName");

  // 3.4 Delete Rule
  const ruleDeleted = await CategoryService.deleteRule(createdRule.categoryRuleId, testUserId);
  assert.equal(ruleDeleted, true);

  // 4. Delete Category
  const catDeleted = await CategoryService.delete(createdCategory.categoryId, testUserId);
  assert.equal(catDeleted, true);

  // 5. System Category Protection
  if (systemCats[0]) {
    await assert.rejects(
      async () => {
        await CategoryService.delete(systemCats[0].categoryId, testUserId);
      },
      { code: "FORBIDDEN" },
      "Deleting system category should throw FORBIDDEN"
    );

    await assert.rejects(
      async () => {
        await CategoryService.update(systemCats[0].categoryId, testUserId, {
          categoryName: "CannotRenameSystemCat",
          categoryType: "expense",
          isActive: true,
        });
      },
      { code: "FORBIDDEN" },
      "Updating system category should throw FORBIDDEN"
    );
  }

  console.log("All Categories & Category Rules tests passed 100%!");
  process.exit(0);
}

testCategories().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
