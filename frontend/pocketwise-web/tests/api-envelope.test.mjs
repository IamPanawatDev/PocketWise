import assert from "node:assert/strict";
import { z } from "zod";
import {
  jsonSuccess,
  jsonPaged,
  jsonError,
} from "../src/lib/server/api-response.ts";
import {
  AppError,
  NotFoundError,
  ValidationErrorAppError,
  handleServerError,
} from "../src/lib/server/api-error.ts";

async function testEnvelope() {
  console.log("Verifying API Envelope & Error Handlers...");

  // 1. Test jsonSuccess
  const okRes = jsonSuccess({ id: 1, name: "Test" });
  assert.equal(okRes.status, 200);
  const okBody = await okRes.json();
  assert.equal(okBody.success, true);
  assert.equal(okBody.data.name, "Test");

  // 2. Test jsonPaged
  const pagedRes = jsonPaged(["A", "B"], 1, 10, 2);
  assert.equal(pagedRes.status, 200);
  const pagedBody = await pagedRes.json();
  assert.equal(pagedBody.success, true);
  assert.equal(pagedBody.data.items.length, 2);
  assert.equal(pagedBody.data.totalPages, 1);

  // 3. Test jsonError
  const errRes = jsonError("NOT_FOUND", "Item not found", 404);
  assert.equal(errRes.status, 404);
  const errBody = await errRes.json();
  assert.equal(errBody.success, false);
  assert.equal(errBody.error.code, "NOT_FOUND");
  assert.equal(errBody.error.message, "Item not found");
  assert.ok(errBody.error.traceId);

  // 4. Test handleServerError with AppError
  const notFound = new NotFoundError("User not found");
  const handledNotFound = handleServerError(notFound, "trace-123");
  assert.equal(handledNotFound.status, 404);
  const handledNotFoundBody = await handledNotFound.json();
  assert.equal(handledNotFoundBody.error.code, "NOT_FOUND");
  assert.equal(handledNotFoundBody.error.traceId, "trace-123");

  // 5. Test handleServerError with ZodError
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse({ email: "invalid-email" });
  if (!parsed.success) {
    const zodHandled = handleServerError(parsed.error);
    assert.equal(zodHandled.status, 422);
    const zodBody = await zodHandled.json();
    assert.equal(zodBody.error.code, "VALIDATION_ERROR");
    assert.ok(zodBody.error.details.length > 0);
    assert.equal(zodBody.error.details[0].field, "email");
  }

  console.log("All API Envelope & Error Handler tests passed successfully!");
}

testEnvelope().catch((err) => {
  console.error(err);
  process.exit(1);
});
