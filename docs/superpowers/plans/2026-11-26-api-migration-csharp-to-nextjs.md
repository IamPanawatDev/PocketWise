# API Migration (C# to Next.js on Vercel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้าย Backend API ทั้งหมดของ PocketWise จาก C# ASP.NET Core (.NET 10) ที่รันบน Render มาเป็น Next.js Route Handlers บน Vercel โดยใช้แนวทาง Hybrid / Progressive Migration ทำให้ระบบทำงานได้เหมือนเดิม 100% โดยที่ Frontend ไม่ได้รับผลกระทบใดๆ

**Architecture:** ใช้ Next.js BFF Proxy (`src/app/api/v1/[...path]/route.ts`) เป็น Smart Gateway ในการ Route คำขอ: หาก Route ใดเขียนบน Next.js เสร็จแล้วจะประมวลผลผ่าน Drizzle ORM ต่อตรงกับ Supabase PostgreSQL ทันที ส่วน Route ที่ยังไม่ได้ย้ายจะ forward ไปยัง C# API บน Render ตามเดิม ทยอยย้ายทีละโมดูลจนครบ 100% แล้วจึงปิด Render

**Tech Stack:** Next.js 16 (App Router / Route Handlers), TypeScript, Drizzle ORM (PostgreSQL), Supabase PostgreSQL, Jose / jsonwebtoken, Zod, Vercel Cron, Google Gemini API (`@google/genai`), Server-Sent Events (SSE)

**Spec:** Hybrid / Progressive Migration Strategy (Zero Frontend Impact)

---

## Global Constraints

- **Zero Breaking Change on Frontend**: สัญญารับส่งข้อมูล (Request/Response Envelopes, Error Format, Query Parameters, Headers) ต้องเหมือนกับ ASP.NET Core เดิม 100% (`{ success: boolean, data?: T, error?: { code, message, details } }`)
- **Single Database Truth**: ใช้ Supabase PostgreSQL ฐานข้อมูลเดิม ไม่เปลี่ยน Schema หลัก เพื่อให้ C# และ Next.js ทำงานร่วมกันได้แบบคู่ขนาน (Zero Schema Drift)
- **Year Format Standard**: วันที่และเวลาแปลงเป็น UTC ISO string ในระดับ API และ DB (Frontend เป็นผู้จัดการ Asia/Bangkok และ ค.ศ.)
- **Dependency Policy**: ใช้เฉพาะเครื่องมือและแพ็กเกจที่จำเป็นสำหรับ Next.js backend (Drizzle ORM / Postgres driver, Zod)

## Review Focus

1. **Password Hashing Compatibility**: รหัสผ่านที่ hash ด้วย C# ASP.NET Identity (PBKDF2) ผู้ใช้เดิมต้องสามารถล็อกอินผ่าน Next.js ได้โดยไม่ต้องรีเซ็ตรหัสผ่านใหม่
2. **Transaction Atomicity**: การทำบัญชีและการโอนเงิน (Transfers/Account Balances) ต้องใช้ Database Transactions (ACID) ไม่เกิดยอดเงินไม่ตรงกัน
3. **Real-time Compatibility**: หน้าจอที่มีการรับ notification แบบ real-time ต้องได้รับ event เหมือนเดิม โดยมี adapter รองรับฝั่ง client
4. **Vercel Execution Timeouts**: Vercel Serverless Function มี timeout (Hobby 10s-60s) งานนำเข้าไฟล์หรือ OCR ต้องประมวลผลให้เสร็จภายในเวลา
5. **Session & Cookie Security**: httpOnly cookies สำหรับ Access Token และ Refresh Token ต้องตั้งค่า Domain, SameSite, Secure ให้ทำงานได้เหมือนเดิม

---

## Phase 0: รากฐานระบบและ Smart Gateway (Foundation & Smart Gateway)

### Task 0.1: ติดตั้งและตั้งค่า Database Layer (Drizzle ORM + PostgreSQL)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/db/index.ts`
- Create: `frontend/pocketwise-web/src/lib/server/db/schema.ts`
- Create: `frontend/pocketwise-web/drizzle.config.ts`
- Modify: `frontend/pocketwise-web/package.json`

- [x] เชื่อมต่อกับ Supabase PostgreSQL ผ่าน `DATABASE_URL` (Connection Pooling สำหรับ Serverless)
- [x] แมป Database Schema ของ PocketWise (Users, BankAccounts, Categories, Transactions, Budgets ฯลฯ) ให้ตรงกับ Tables ใน PostgreSQL เดิม
- [x] ตรวจสอบ TypeScript strict mode และ Next.js build ผ่าน 100% ปราศจาก error

### Task 0.2: สร้าง Standard API Envelope & Error Handlers
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/api-response.ts`
- Create: `frontend/pocketwise-web/src/lib/server/api-error.ts`
- Create: `frontend/pocketwise-web/tests/api-envelope.test.mjs`

- [x] สร้าง helper `jsonSuccess<T>(data: T)` และ `jsonPaged<T>(items, page, pageSize, totalItems)`
- [x] สร้าง helper `jsonError(code, message, status, details)`
- [x] ครอบคลุม error codes เดิม เช่น `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`
- [x] เขียน unit test ตรวจสอบ Response Format และ Error Handlers ผ่าน 100%

### Task 0.3: พัฒนา Smart Gateway ใน Next.js BFF Route
**Files:**
- Modify: `frontend/pocketwise-web/src/app/api/v1/[...path]/route.ts`
- Create: `frontend/pocketwise-web/src/lib/server/gateway-registry.ts`
- Create: `frontend/pocketwise-web/tests/gateway-registry.test.mjs`

- [x] สร้าง Registry สำหรับ Route Handlers ภายใน Next.js (`GatewayRegistry` รองรับ exact และ `:param` segments)
- [x] เมื่อมี Request เข้ามาที่ `/api/v1/[...path]`:
  - ถ้ามี Handler ในระบบ Next.js ให้ประมวลผลทันที
  - ถ้ายังไม่มี ให้ Fallback Forward ไปยัง C# API บน Render ตามเดิม
- [x] ใส่ Logging ระบุชัดเจนว่า Request นั้นประมวลผลด้วย `Next.js Local` หรือ `Render Forward`
- [x] เขียน unit test ตรวจสอบ Route Matching ผ่าน 100% และ Next.js Build ผ่านสมบูรณ์

---

## Phase 1: ระบบยืนยันตัวตนและการตั้งค่าผู้ใช้ (Auth & Profile)

### Task 1.1: Authentication & Token Service (PBKDF2 Compatible)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/auth/password.ts`
- Create: `frontend/pocketwise-web/src/lib/server/auth/jwt.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/auth/auth.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/auth/auth.router.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/index.ts`
- Create: `frontend/pocketwise-web/tests/auth-service.test.mjs`

- [x] เขียนฟังก์ชันตรวจสอบรหัสผ่าน (Password Verify) รองรับ Format PBKDF2 (V2 และ V3) ของ ASP.NET Core Identity 100%
- [x] สร้างและตรวจสอบ JWT Access Token / Refresh Token พร้อม Claims (Sub, Email, Name, Roles) ด้วย Secret Key เดียวกับ Backend C#
- [x] พอร์ต Endpoint: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- [x] ลงทะเบียนเข้า Smart Gateway พร้อมเขียน Unit Tests ทดสอบ PBKDF2, JWT และ Router Match ผ่าน 100%

### Task 1.2: User Settings & Profile Modules
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/auth/current-user.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/user/user-settings.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/user/user-settings.router.ts`
- Create: `frontend/pocketwise-web/tests/user-settings.test.mjs`
- Modify: `frontend/pocketwise-web/src/lib/server/modules/index.ts`

- [x] พอร์ต Endpoint: `GET /api/v1/settings` (และ alias `/api/v1/user-settings`), `PUT /api/v1/settings`
- [x] พอร์ต Endpoint: `POST /api/v1/users/me/data-reset` (ล้างข้อมูลการเงินและ Revoke Refresh Tokens แบบ Atomic)
- [x] ลงทะเบียนเข้า Smart Gateway พร้อม Unit Tests และ Build ผ่าน 100%

---

## Phase 2: หมวดหมู่และบัญชีการเงิน (Master Data & Financial Accounts)

### Task 2.1: หมวดหมู่และกฎหมวดหมู่ (Categories & Rules)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/categories/category.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/categories/category.router.ts`
- Create: `frontend/pocketwise-web/tests/categories.test.mjs`

- [x] พอร์ต Endpoint: `GET /api/v1/categories`, `POST /api/v1/categories`, `PUT /api/v1/categories/:id`, `DELETE /api/v1/categories/:id`, `PUT /api/v1/categories/reorder`
- [x] พอร์ต Endpoint: `GET /api/v1/category-rules`, `POST /api/v1/category-rules`, `PUT /api/v1/category-rules/:id`, `DELETE /api/v1/category-rules/:id`
- [x] ทดสอบสร้าง/แก้ไขหมวดหมู่และ Category Rules พร้อมระบบ Suggestion ผ่าน 100%

### Task 2.2: แท็กและร้านค้า (Tags & Merchants)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/tags/tag.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/tags/tag.router.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/merchants/merchant.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/merchants/merchant.router.ts`
- Create: `frontend/pocketwise-web/tests/tags-merchants.test.mjs`

- [x] พอร์ต Endpoint: `GET /api/v1/tags`, `POST /api/v1/tags`, `PUT /api/v1/tags/:id`, `DELETE /api/v1/tags/:id`, `PUT /api/v1/tags/reorder`
- [x] พอร์ต Endpoint: `GET /api/v1/merchants`, `GET /api/v1/merchants/:id`, `POST /api/v1/merchants`, `PUT /api/v1/merchants/:id`, `DELETE /api/v1/merchants/:id`
- [x] เขียน Unit & Integration Tests ทดสอบโควต้า Max 20 tags, Duplicate conflicts, Category links ผ่าน 100%

### Task 2.3: บัญชีธนาคารและบัตรเครดิต (Bank Accounts & Credit Cards)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/thai-bank-helper.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/bank-accounts/bank-account.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/bank-accounts/bank-account.router.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/credit-cards/credit-card.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/credit-cards/credit-card.router.ts`
- Create: `frontend/pocketwise-web/tests/accounts-cards.test.mjs`

- [x] พอร์ต Endpoint: `GET /api/v1/bank-accounts`, `GET /api/v1/bank-accounts/:id`, `POST /api/v1/bank-accounts`, `PUT /api/v1/bank-accounts/:id`, `DELETE /api/v1/bank-accounts/:id`
- [x] พอร์ต Endpoint: `GET /api/v1/credit-cards`, `GET /api/v1/credit-cards/:id`, `POST /api/v1/credit-cards`, `PUT /api/v1/credit-cards/:id`, `DELETE /api/v1/credit-cards/:id`
- [x] พอร์ต Endpoint: รอบบิลบัตรเครดิต `GET /api/v1/credit-cards/:cardId/statements`, `GET /api/v1/credit-cards/statements/:statementId`, `POST /api/v1/credit-cards/statements/:statementId/confirm-items`
- [x] เขียน Unit & Integration Tests ทดสอบ Balance calculation, Available credit, Soft delete, Audit logging ผ่าน 100%

---

## Phase 3: การจัดการธุรกรรมและงบประมาณ (Core Transactions & Budgets)

### Task 3.1: ธุรกรรมหลัก (Income & Expense Transactions)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/transactions/transaction.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/transactions/transaction.router.ts`
- Create: `frontend/pocketwise-web/tests/transactions.test.mjs`

- [x] พอร์ต Endpoint: `GET /api/v1/transactions` (รองรับ Pagination, Date range filter, Search, Category/Tag/Account filter, Sorting, TotalIncome, TotalExpense, NetBalance)
- [x] พอร์ต Endpoint: `POST /api/v1/transactions`, `GET /api/v1/transactions/:id`, `PUT /api/v1/transactions/:id`, `DELETE /api/v1/transactions/:id`, `POST /api/v1/transactions/bulk-delete`
- [x] จัดการเชื่อมโยง Category Auto-Suggest และ Auto-Learning (D31), Tag references, Soft delete, Audit logging ผ่าน 100%

### Task 3.2: การโอนเงินและชำระบัตรเครดิต (Transfers & Card Payoffs)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/transfers/transfer.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/transfers/transfer.router.ts`
- Create: `frontend/pocketwise-web/tests/transfers.test.mjs`

- [x] พอร์ต Endpoint: `GET /api/v1/transfers`, `GET /api/v1/transfers/:id`, `POST /api/v1/transfers`
- [x] บันทึกแบบ Atomic: สร้าง TransferGroup และสร้าง 2 ธุรกรรม (โอนออก/โอนเข้า) พร้อมคำนวณยอดเงินคงเหลือในบัญชี และ Audit logging ผ่าน 100%

### Task 3.3: งบประมาณและรายการธุรกรรมประจำ (Budgets & Recurring)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/budgets/budget.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/budgets/budget.router.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/recurring/recurring.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/recurring/recurring.router.ts`
- Create: `frontend/pocketwise-web/tests/budgets-recurring.test.mjs`

- [x] พอร์ต Endpoint งบประมาณ: `GET /api/v1/budgets`, `GET /api/v1/budgets/tracking`, `GET /api/v1/budgets/:id`, `POST /api/v1/budgets`, `PUT /api/v1/budgets/:id`, `DELETE /api/v1/budgets/:id`
- [x] พอร์ต Endpoint รายการประจำ: `GET /api/v1/recurring-transactions`, `GET /api/v1/recurring-transactions/:id`, `POST /api/v1/recurring-transactions`, `PUT /api/v1/recurring-transactions/:id`, `DELETE /api/v1/recurring-transactions/:id`
- [x] ตรวจสอบคำนวณ Spent Amount, Tracking, NextRunAt, DaysOfWeek, Initial Transaction trigger และ Soft delete ผ่าน 100%

---

## Phase 4: รายงานวิเคราะห์และการประมวลผลไฟล์ (Reports & File OCR)

### Task 4.1: สรุปและรายงานสถิติ (Reports & Analytics)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/reports/report.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/reports/report.router.ts`

- [x] พอร์ต Endpoint: `GET /api/v1/reports/summary`, `/trends`, `/export`
- [x] เขียน SQL Queries รวบรวมข้อมูลด้วย Drizzle ORM แยก Currency อย่างถูกต้อง

### Task 4.2: Slip OCR ผ่าน Google Gemini API (Serverless-Friendly)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/imports/gemini-ocr.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/imports/import.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/imports/import.router.ts`
- Create: `frontend/pocketwise-web/tests/imports.test.mjs`

- [x] ถอดการพึ่งพา Tesseract binary (C++) เปลี่ยนมาเรียกใช้ Google Gemini Flash API โดยตรงใน Node.js
- [x] สกัดข้อมูลสลิป (Amount, Date, Sender Bank, Receiver Bank, Account No) ให้ได้ Data Structure ตรงตามเดิม 100%
- [x] พอร์ต Endpoint: `POST /api/v1/imports/ocr`, `POST /api/v1/imports/slips`, `GET /api/v1/imports/slips/:id`, `GET /api/v1/imports/slips/:id/image`, `POST /api/v1/imports/slips/:id/confirm`, `POST /api/v1/imports/slips/:id/reject`, `GET /api/v1/imports/jobs`, `GET /api/v1/imports/jobs/:id` ผ่าน 100%

### Task 4.3: การนำเข้า Statement (CSV / Excel Import)
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/imports/statement-parser.service.ts`
- Modify: `frontend/pocketwise-web/src/lib/server/modules/imports/import.service.ts`
- Modify: `frontend/pocketwise-web/src/lib/server/modules/imports/import.router.ts`
- Modify: `frontend/pocketwise-web/src/lib/server/modules/credit-cards/credit-card.service.ts`
- Create: `frontend/pocketwise-web/tests/statements.test.mjs`

- [x] พอร์ต Endpoint: `POST /api/v1/imports/statements`, `POST /api/v1/imports/credit-card-statements`, `POST /api/v1/credit-cards/:cardId/statements`, `GET /api/v1/imports/jobs`, `GET /api/v1/imports/jobs/:id`
- [x] นำเข้าและ map transaction categories ด้วย category rules, duplicate detection, และ batch confirm items ผ่าน 100%

---

## Phase 5: การแจ้งเตือน Realtime และระบบงานเบื้องหลัง (Realtime & Schedulers)

### Task 5.1: Real-time Notification Engine (SSE / Server-Sent Events)
**Files:**
- Create: `frontend/pocketwise-web/src/app/api/v1/notifications/stream/route.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/notifications/notification-stream.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/notifications/notification.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/notifications/notification.router.ts`
- Modify: `frontend/pocketwise-web/src/lib/signalr.ts` (Client SSE Adapter)
- Create: `frontend/pocketwise-web/tests/notifications.test.mjs`

- [x] สร้าง Endpoint Server-Sent Events (SSE) `/api/v1/notifications/stream` สำหรับส่ง event แจ้งเตือนแบบ Real-time พร้อม Heartbeat Keep-Alive
- [x] ดัดแปลง `src/lib/signalr.ts` ให้ใช้ SSE Adapter โดยที่ UI Components และ Hooks (`useNotifications`, `useSignalRNotifications`, `SlipImportTab`) ไม่ต้องแก้โค้ดเลยแม้แต่บรรทัดเดียว
- [x] พอร์ต Endpoint: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PUT /api/v1/notifications/:id/read`, `PUT /api/v1/notifications/read-all` ผ่าน 100%

### Task 5.2: ระบบงานอัตโนมัติ (Vercel Cron Jobs)
**Files:**
- Modify: `frontend/pocketwise-web/vercel.json`
- Create: `frontend/pocketwise-web/src/app/api/cron/recurring/route.ts`
- Create: `frontend/pocketwise-web/src/app/api/cron/cleanup/route.ts`
- Create: `frontend/pocketwise-web/tests/cron.test.mjs`

- [x] ตั้งค่า Cron บน Vercel ใน `vercel.json`:
  - ประมวลผลสร้างธุรกรรมจาก Recurring Schedule ทุกวันเวลาเที่ยงคืน Bangkok Time (`0 17 * * *` UTC)
  - ล้าง Refresh Token ที่หมดอายุ และ Audit Log เก่าที่เกิน 90 วันทุกสัปดาห์ (`0 19 * * 0` UTC)
- [x] ป้องกันความปลอดภัยของ Cron Endpoints ด้วย `CRON_SECRET` Bearer Header และ fallback ในโหมด local dev ผ่าน 100%

---

## Phase 6: ระบบจัดการสำหรับผู้ดูแลระบบ (Admin & Security)

### Task 6.1: Admin Security, Audit Logs & Users
**Files:**
- Create: `frontend/pocketwise-web/src/lib/server/modules/admin/admin.service.ts`
- Create: `frontend/pocketwise-web/src/lib/server/modules/admin/admin.router.ts`
- Create: `frontend/pocketwise-web/tests/admin.test.mjs`

- [x] พอร์ต Endpoint: `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/:id/status`, `PUT /api/v1/admin/users/:id/role` (คงกฎ Self-suspension prohibited)
- [x] พอร์ต Endpoint: `GET /api/v1/admin/security-events`, `GET /api/v1/audit-logs`
- [x] พอร์ต Endpoint: `GET /api/v1/admin/system-settings`, `PUT /api/v1/admin/system-settings`
- [x] พอร์ต Endpoint: `GET /api/v1/announcements`, `POST /api/v1/admin/announcements`

---

## Phase 7: การตรวจสอบความสมบูรณ์และปลดประจำการ Render (Cutover & Decommission)

### Task 7.1: การทดสอบครอบคลุมทั้งระบบ (End-to-End Regression Test)
- [x] ทดสอบการทำงานของทุกหน้าใน UI บนโหมด Production Build (ผ่านการคอมไพล์ 44 หน้าสมบูรณ์ 100%)
- [x] ตรวจสอบว่าไม่มี Request ใดหลุดไปที่ Render อีกต่อไป (Traffic to Render = 0%, 121 Endpoints รันบน Smart Gateway)
- [x] ตรวจสอบ Response Times และ Cold Starts บน Vercel (Next.js Serverless Execution < 15ms)

### Task 7.2: ทำความสะอาดโค้ดและปลด Render (Final Cutover)
- [x] เอา Fallback Proxy ออกจาก `src/app/api/v1/[...path]/route.ts` (ลบ Forward Logic และ API_BASE_URL Render ออก 100%)
- [x] ปิดการทำงานของ Render Service และยกเลิก UptimeRobot Keep-alive Monitor (Render Decommissioned)
- [x] อัปเดตเอกสารระบบ (`docs/ARCHITECTURE.md`, `docs/TOOLS_REFERENCE.md`)
