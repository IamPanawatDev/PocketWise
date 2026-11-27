import { execSync } from "node:child_process";

const testFiles = [
  "gateway-registry.test.mjs",
  "api-envelope.test.mjs",
  "auth-service.test.mjs",
  "user-settings.test.mjs",
  "categories.test.mjs",
  "tags-merchants.test.mjs",
  "accounts-cards.test.mjs",
  "transactions.test.mjs",
  "transfers.test.mjs",
  "budgets-recurring.test.mjs",
  "reports.test.mjs",
  "imports.test.mjs",
  "statements.test.mjs",
  "notifications.test.mjs",
  "cron.test.mjs",
  "admin.test.mjs",
  "cutover-verification.test.mjs",
];

console.log(`=======================================================`);
console.log(`Running PocketWise Full-Stack Next.js Migration Test Suite`);
console.log(`Total test suites: ${testFiles.length}`);
console.log(`=======================================================\n`);

let passed = 0;
let failed = 0;

for (const file of testFiles) {
  process.stdout.write(`▶ Running ${file}... `);
  try {
    execSync(`npx tsx tests/${file}`, {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    console.log(`✅ PASSED`);
    passed++;
  } catch (err) {
    console.log(`❌ FAILED`);
    console.error(err.stdout?.toString());
    console.error(err.stderr?.toString());
    failed++;
  }
}

console.log(`\n=======================================================`);
console.log(`Test Results Summary:`);
console.log(`  Passed: ${passed} / ${testFiles.length}`);
console.log(`  Failed: ${failed} / ${testFiles.length}`);
console.log(`=======================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 100% OF ALL MIGRATION INTEGRATION TESTS PASSED!`);
  process.exit(0);
}
