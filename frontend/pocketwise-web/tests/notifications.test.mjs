import assert from "node:assert";
import { NotificationService } from "../src/lib/server/modules/notifications/notification.service.ts";
import { notificationStreamManager } from "../src/lib/server/modules/notifications/notification-stream.ts";
import { db } from "../src/lib/server/db/index.ts";
import { notifications } from "../src/lib/server/db/schema.ts";
import { eq, and } from "drizzle-orm";

async function runTests() {
  console.log("Starting Task 5.1 Notifications & SSE Integration Tests...");

  const userId = 1;

  // 1. Test SSE Stream Manager
  console.log("1. Testing NotificationStreamManager...");
  let receivedEvents = [];
  const mockController = {
    enqueue(chunk) {
      const text = new TextDecoder().decode(chunk);
      receivedEvents.push(text);
    },
  };

  notificationStreamManager.addClient(userId, mockController);

  // Send test heartbeat
  const hbRes = notificationStreamManager.sendHeartbeat(mockController);
  assert.strictEqual(hbRes, true);
  assert.ok(receivedEvents.some((e) => e.includes(": keep-alive")));
  console.log("  SSE Heartbeat passed!");

  // Send test broadcast
  notificationStreamManager.sendRefreshHint(userId, {
    entityType: "transaction",
    hint: "test-hint",
    timestamp: new Date().toISOString(),
  });
  assert.ok(receivedEvents.some((e) => e.includes("ReceiveRefreshHint")));
  assert.ok(receivedEvents.some((e) => e.includes("test-hint")));
  console.log("  SSE Broadcast passed!");

  notificationStreamManager.removeClient(userId, mockController);

  // 2. Test NotificationService.createAndSend
  console.log("2. Testing NotificationService.createAndSend...");
  const uniqueTitle = `Budget Alert ${Date.now()}`;
  const createdNotif = await NotificationService.createAndSend(userId, {
    title: uniqueTitle,
    message: "คุณใช้จ่ายเกิน 80% ของงบประมาณแล้ว",
    notificationType: "BUDGET_WARNING",
    channel: "inApp",
    relatedEntityType: "Budget",
    relatedEntityId: 999,
  });

  assert.ok(createdNotif.notificationId, "Notification ID should be generated");
  assert.strictEqual(createdNotif.title, uniqueTitle);
  assert.strictEqual(createdNotif.notificationType, "BUDGET_WARNING");
  assert.strictEqual(createdNotif.channel, "inApp");
  assert.strictEqual(createdNotif.status, "sent");
  assert.strictEqual(createdNotif.readAt, null);
  console.log("  Create and Send passed! ID:", createdNotif.notificationId);

  // 3. Test NotificationService.getNotifications
  console.log("3. Testing NotificationService.getNotifications...");
  const pagedRes = await NotificationService.getNotifications(userId, 1, 10, false);
  assert.ok(pagedRes.items.length > 0, "Items should contain notifications");
  const found = pagedRes.items.find((n) => n.notificationId === createdNotif.notificationId);
  assert.ok(found, "Created notification should be in paged list");
  console.log("  Get Notifications passed!");

  // 4. Test NotificationService.getUnreadCount
  console.log("4. Testing NotificationService.getUnreadCount...");
  const unreadRes = await NotificationService.getUnreadCount(userId);
  assert.ok(unreadRes.unreadCount >= 1, "Unread count should be at least 1");
  console.log("  Unread Count passed! Count:", unreadRes.unreadCount);

  // 5. Test NotificationService.markAsRead
  console.log("5. Testing NotificationService.markAsRead...");
  const readNotif = await NotificationService.markAsRead(userId, createdNotif.notificationId);
  assert.strictEqual(readNotif.status, "read");
  assert.ok(readNotif.readAt !== null, "ReadAt should be timestamped");
  console.log("  Mark As Read passed!");

  // 6. Test NotificationService.markAllAsRead
  console.log("6. Testing NotificationService.markAllAsRead...");
  // Create another unread notification
  await NotificationService.createAndSend(userId, {
    title: "Second Notice",
    message: "Test unread batch notice",
    notificationType: "TEST_NOTICE",
  });

  const batchReadRes = await NotificationService.markAllAsRead(userId);
  assert.ok(batchReadRes.count >= 1, "Batch read should update at least 1 record");

  const finalUnread = await NotificationService.getUnreadCount(userId);
  assert.strictEqual(finalUnread.unreadCount, 0, "Unread count should now be 0");
  console.log("  Mark All As Read passed! Remaining unread:", finalUnread.unreadCount);

  console.log("\nALL TESTS FOR TASK 5.1 PASSED SUCCESSFULLY! 🎉\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
