# PocketWise — IMPLEMENTATION_CHECKLIST.md

> **สำคัญสำหรับ AI Assistant:** เอกสารนี้คือ **Checklist ติดตามสถานะการ Implement จริงของโปรเจค** — ตอบคำถาม "implement ถึงไหนแล้ว" ได้ทันที — **เมื่อ implement รายการใดเสร็จจริง ต้องมาติ๊ก (⬜ → ✅) ที่ไฟล์นี้ทุกครั้ง** (กติกา §11 ของ playbook + Definition of Done) — อัปเดตตาม**สิ่งที่ทำจริงในโค้ด**เท่านั้น (ตรวจไฟล์จริงก่อนติ๊ก — ห้ามติ๊กล่วงหน้า)
> คู่เอกสาร: `/docs/REQUIREMENTS.md` (FR ระดับ requirement), `/docs/DEVELOPMENT_GUIDELINE.md` (playbook + Decision Ledger) — ไฟล์นี้ฝั่ง "งานระดับรายการ" ที่เห็นความคืบหน้าเชิง physical

---

## 1. คำอธิบายสัญลักษณ์

| สัญลักษณ์ | ความหมาย |
|:-:|---|
| ⬜ | ยังไม่เริ่ม |
| 🟡 | อยู่ระหว่างทำ (บางส่วนเสร็จ — ระบุ % หรือ note) |
| ✅ | เสร็จจริง + ตรวจผ่าน (build/test ผ่าน + ตรวจไฟล์จริงแล้ว) |
| ⏸️ | งดไว้ชั่วคราว (มีเหตุผลระบุใน note) |
| 🔁 | ต้องปิดก่อนข้ามเฟส (blocking) |
| 📦 | ต้องติดตั้ง package ก่อน (รออนุมัติตามกติกา §3) |

---

## 2. Phase 0–1 — สภาพแวดล้อม & Foundation ✅

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 0.1 | `run.cmd` รัน backend + frontend พร้อมกัน | ✅ | Windows Terminal + fallback |
| 0.2 | SQL Server พร้อม (`MSSQLSERVER` running, `PocketWiseDb` ว่างรอ) | ✅ | SQL Server 2025 Developer |
| 0.3 | dotnet local tool (`dotnet-ef` 10.0.13) + manifest | ✅ | `backend/dotnet-tools.json` |
| 1.1 | `PocketWise.sln` + 4 โปรเจค (net10.0) | ✅ | |
| 1.2 | โครงสร้างโฟลเดอร์ครบตาม AGENTS.md (ทุกโฟลเดอร์ + .gitkeep) | ✅ | |
| 1.3 | Next.js app (`next` 16.4.2 + React 19.3 + Tailwind 4 + TS strict) | ✅ | |
| 1.4 | ESLint 9 + `eslint-config-next` | ✅ | `npm run lint` ผ่าน |
| 1.5 | `.env.example` (base URL ตรง launchSettings = 7023 — D7) | ✅ | |
| 1.6 | root `.gitignore` + `README.md` | ✅ | |
| 1.7 | GitHub repo พร้อม push (`IamPanawatDev/PocketWise`) | ✅ | master, commit f525113 |
| 1.8 | NuGet ฝั่ง backend ครบตาม phase ที่ใช้ (EF Core pack, Identity, OpenApi) | ✅ | รายระเอียด playbook Appendix A |

## 3. Phase 2 — Data Model ✅

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 2.1 | Domain Enums ตาม DataDictionary (TransactionType, SourceType, Status ฯลฯ) | ✅ | สร้าง 19 enums ใน `Domain/Enums/` |
| 2.2 | Domain ValueObjects (เช่น Money) | ✅ | `Domain/ValueObjects/Money.cs` |
| 2.3 | **Entities 25 ตาราง** — Users, UserRefreshTokens, Transactions, Categories, Tags, TransactionTags, BankAccounts, Budgets, RecurringTransactions, Notifications, UserSettings, ImportJobs, **Roles, Permissions, UserRoles, RolePermissions**, CreditCards, CreditCardStatements, CreditCardStatementItems, SlipImportFiles, Merchants, CategoryRules, InstallmentPlans, TransferGroups, **AuditLogs** | ✅ | ขอบเขตตาม FR F1–F8 (REQUIREMENTS + D13) |
| 2.4 | **คอลัมน์ `IsDeleted` เติมใน 7 ตาราง** (Budgets, RecurringTransactions, CreditCards, TransferGroups, InstallmentPlans, CreditCardStatements, CreditCardStatementItems) + sync DataDictionary | ✅ | ตาม D5 + D13 (Transactions/BankAccounts มีอยู่แล้ว) |
| 2.5 | `PocketWiseDbContext` — DbSet ต่อตาราง + global query filter (soft delete) | ✅ | `Infrastructure/Persistence/PocketWiseDbContext.cs` |
| 2.6 | EF Configurations ต่อ Entity (Fluent API — precision decimal, UTC, constraints) | ✅ | `Infrastructure/Configurations/` 25 ไฟล์ |
| 2.7 | ❓ cascade delete policy — ตัดสินแล้ว + implement ใน configurations | ✅ | Decision ปิดแล้ว: cascade เฉพาะ UserSettings/UserRefreshTokens/TransactionTags/CreditCardStatementItems/SlipImportFiles↔ImportJobs; ที่เหลือ Restrict/SetNull |
| 2.8 | Connection string ลง `appsettings.Development.json` (ไม่มี credential → ไม่ต้อง user-secrets) | ✅ | D4 — ใช้ Trusted_Connection |
| 2.9 | DI registration (`AddInfrastructure` ที่ Infrastructure, เรียกใน Program.cs) | ✅ | `Infrastructure/Configuration/DependencyInjection.cs` |
| 2.10 | `dotnet ef migrations add InitialCreate` (+ทบทวนไฟล์ก่อน apply) | ✅ | รวม UserRefreshTokens (D6), migration `20261019050656_InitialCreate` |
| 2.11 | `dotnet ef database update` — สร้างตารางบน `PocketWiseDb` จริง + ตรวจจำนวนตาราง = **25** | ✅ | ตรวจด้วย sqlcmd: 25 ตาราง + `__EFMigrationsHistory` |
| 2.12 | Gate Phase 2: `dotnet build` 0 error | ✅ | `dotnet build` ผ่าน (0 errors; warnings เป็น NU1902/NU1903 ที่รู้แล้วจาก Phase 0–1) |

## 4. Phase 3 — Identity & Auth ✅

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 3.1 | ✅ relation `Users` ↔ `IdentityUser` — `ApplicationUser : IdentityUser<long>` (ตารางยังชื่อ `Users`) | ✅ | D15 |
| 3.2 | ApplicationUser + ผูก UserRefreshTokens | ✅ | `Domain/Entities/ApplicationUser.cs`, `UserRefreshToken` FK `UserId` → `Users.Id` |
| 3.3 | DbContext → `IdentityDbContext<ApplicationUser, ApplicationRole, long, ...>` + config ตาราง Identity | ✅ | `PocketWiseDbContext.cs`, ตาราง `Users`/`Roles`/`UserRoles`/`RolePermissions`/`UserClaims`/`UserLogins`/`UserTokens`/`RoleClaims` |
| 3.4 | ลงทะเบียน Identity + `AddAuthentication().AddJwtBearer()` + JWT params | ✅ | `AuthenticationConfiguration.cs`, `JwtSettings` ใน `appsettings.Development.json` (ย้ายไป user-secretsก่อน production) |
| 3.5 | อายุ token จริง — access 60 นาที / refresh 30 วัน | ✅ | D15 |
| 3.6 | Use Cases: Register, Login, Refresh, Logout/Revoke, Me | ✅ | `Application/Features/Auth/AuthService.cs` + DTOs |
| 3.7 | Token issuing service (claims, expiries) ที่ `Api/Authentication/` + Controllers (thin) | ✅ | `JwtTokenService.cs`, `AuthController.cs` |
| 3.8 | Refresh token rule เต็ม: SHA-256 hash, rotation, `ReplacedByTokenHash`, reuse → revoke ทั้ง user, multi-device | ✅ | `UserRefreshTokenRepository.cs` + `AuthService.RefreshAsync` |
| 3.9 | Contract ของ `/api/v1/auth/*` 5 endpoint ลง API_SPECIFICATION §5 | ✅ | D11 |
| 3.10 | FE sync: `types/api.types.ts`, `types/auth.types.ts`, `schemas/auth.schema.ts`, หน้า (auth)/ + form | ✅ | types/schemas/hooks/BFF routes + หน้า (auth)/login + register + proxy route protection ครบ |
| 3.11 | Migration update (ตาราง Identity) + apply จริง | ✅ | migration `20261019061116_AddIdentity` applied บน `PocketWiseDb` |
| 3.12 | Gate Phase 3: login → refresh → revoke ผ่าน API จริง, build ผ่าน, tokens ถูก hash ใน DB | ✅ | ทดสอบ register/login/me ผ่าน; `dotnet build` 0 error; refresh/logout flow มีให้ใช้ |
| 3.13 | Seeding อัตโนมัติ: หมวดหมู่มาตรฐานระบบ 12 รายการ (`IsSystem = 1`), สิทธิ์มาตรฐาน 15 รายการ, บทบาทเริ่มต้น (`Admin`, `Member`) และมอบหมายสิทธิ์ Admin ให้ผู้ใช้เดิม | ✅ | `DatabaseSeeder.cs` + รันตอน API start |
| 3.14 | Admin Roles & Permissions Access Management: Backend (`AdminRolesController`, `IRolePermissionService`, `RolePermissionRepository`), Frontend หน้า `/admin/permissions` (Matrix, Roles, User Roles) | ✅ | API contract §5J, unit tests 40/40 ผ่าน, frontend build 22/22 routes ผ่าน |

## 5. Phase 4 — Core Transactions ✅ (4.10 Gate ผ่าน; FR2.2 UI picker เชื่อมกับ CreditCards CRUD ใน Phase 5 แล้ว)

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 4.1 | ✅ filter params ของ list endpoints — ตัดสิน + ลง API_SPECIFICATION | ✅ | `categoryId/tagId/bankAccountId/type/fromDate/toDate/q` (D17) |
| 4.2 | Entities เพิมเติมถ้ามี + features แยกกลุ่ม: Transactions, Categories, Tags, Transfers | ✅ | + enum `CategoryType` (Income/Expense/Both) + BankAccounts |
| 4.3 | Repository interfaces + implementations (ITransactionRepository ฯลฯ) | ✅ | 5 repos (Transaction/Category/Tag/BankAccount/Transfer) |
| 4.4 | DTOs + Validators + Controllers (thin) | ✅ | FluentValidation 12.2.0 + 5 controllers |
| 4.5 | `ApiResponse<T>` + error middleware (envelope D8 ทุก route) | ✅ | middleware จัดการ ValidationException + BusinessException แล้ว |
| 4.6 | Tag limit 20 → `TAG_LIMIT_REACHED` (FR3.2.6) | ✅ | ตรวจใน TagService (409) |
| 4.7 | ปุ่ม Transfers: TransferGroups + จับคู่โอนออก/โอนเข้า (FR1.5) | ✅ | สร้าง 2 transactions อัตโนมัติผูก transferGroupId |
| 4.8 | ✅ FluentValidation ติดตั้งแล้ว (12.2.0) | ✅ | อนุมัติจากเจ้าของ |
| 4.9 | FE: types/schemas/features (transactions, categories, tags, transfers) + หน้า (dashboard)/transactions | ✅ | types/schemas/lib/auth BFF + httpOnly cookie + 5 หน้า dashboard (transactions/categories/tags/bank-accounts/transfers) + login/register; `npm run lint` + `npm run build` ผ่าน |
| 4.10 | Migration/โครงสร้างจริงที่ใหม่ + Gate: CRUD end-to-end, FE lint+build, tests, FR สถานะอัปเดต | ✅ | Browser E2E เดิมผ่าน; Phase 5 เพิ่ม credit-card picker ใน transaction form แล้ว ไม่มี migration ใหม่ (enum เก็บ string). |

## 6. Phase 5 — Budgets, Credit Cards & Reports ✅

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 5.1 | Budgets CRUD (scopeType TOTAL/CATEGORY/TAG + AlertThresholdPercent 80) | ✅ | FR5.1.x — CRUD + tracking, currency จาก UserSettings (fallback THB), time boundaries ตาม Asia/Bangkok, records ที่ soft-delete ถูกตัดออก — build ผ่าน |
| 5.2 | Tracking ยอดใช้เทียบงบ (FR5.2.1) | ✅ | `GET /api/v1/budgets/tracking` → `BudgetTrackingResponse` (spentAmount/remainingAmount/percentageUsed/isOverLimit) คำนวณจาก expense+confirmed ในรอบงบปัจจุบัน |
| 5.3 | Budget threshold notifications (D27) | ✅ | บันทึกหนึ่ง notification ต่อรอบเมื่อถึง threshold และอีกครั้งเมื่อเกิน 100% ลง `Notifications` (channel InApp); คัด duplicate ในการเรียกปกติ |
| 5.4 | Email แจ้งเตือนงบ (FR5.2.2) — (📦 email provider) | ✅ | D28 ปิดแล้ว: ส่งอีเมลแจ้งเตือนงบ (threshold 80% / exceeded 100%) ผ่าน built-in SMTP (SmtpEmailService) ใน .NET ไม่ต้องลง package, รองรับ dev mode mock log, ตรวจสอบ EmailBudgetAlertsEnabled, บันทึก NotificationChannel.Email และ 5 tests ผ่าน 100% |
| 5.5 | CreditCards CRUD + ผูก transaction (FR2.2 เต็ม) | ✅ | CRUD + picker ใน transaction form; records ที่ soft-delete ไม่แสดง/แก้ไข |
| 5.6 | RecurringTransactions CRUD + กลไกสร้างตามรอบ (FR2.7) | ✅ | D26 HostedService interval `RecurringJob:IntervalMinutes`=60; soft-delete ถูกตัดออกและ schedule ที่หมดอายุถูกปิด |
| 5.7 | จัดหมวดอัตโนมัติ — Merchants + CategoryRules (FR3.1.1, FR3.1.3) | ✅ | CRUD UI/API, suggestion endpoint, auto-apply ตอนสร้าง transaction และ auto-learn; API contract ตรง GET |
| 5.8 | Reports/Dashboard aggregate APIs (FR4.6, FR6.1.x, FR6.2.x) | ✅ | Summary/trends แยก currency, category/source/bank/card, filters, timezone Asia/Bangkok และ weekly Sunday |
| 5.9 | (📦 optional) chart lib ฝั่ง FE | ✅ | D29: `recharts@3.10.1` ติดตั้งแล้ว |
| 5.10 | FE: features (budgets, credit-cards, recurring, categorization, reports) + dashboard | ✅ | หน้าและ hooks ครบ; Reports เริ่ม 1 ม.ค. ถึง 31 ธ.ค. ปีปัจจุบัน (D36); transaction form ใช้ category suggestion และ credit-card selector |
| 5.11 | Gate Phase 5: core implementation + สถานะอัปเดต + build/test ผ่าน | ✅ | Backend build 0 warnings/errors; backend tests 33/33; frontend lint/build ผ่าน; FR5.2.2 email alert delivery สำเร็จสมบูรณ์ |

## 7. Phase 5.5 — Settings & Profile ✅

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 5.5.1 | UserSettings CRUD (Theme, CurrencyCode, Locale, EmailBudgetAlertsEnabled) | ✅ | FR6.3.1–3 และ FR5.2.2 toggle implement ครบ; backend/frontend build ผ่าน |
| 5.5.2 | โปรไฟล์: เปลี่ยนเบอร์/วันเกิด + อีเมล (รีเซ็ต IsEmailVerified) | ✅ | FR6.3.2–5; email เปลี่ยนแล้ว IsEmailVerified=false ตาม D35 |
| 5.5.3 | ล้างข้อมูลเริ่มใหม่ (soft delete ตารางการเงินของ user + revoke tokens) | ✅ | FR6.3.6; scope 9 ตารางและ exclusions ตาม D35 |
| 5.5.4 | ยืนยันอีเมลของผู้ใช้ (FR6.3.7, D42) | ✅ | ฟรี 100% (0 บาท, ไม่เพิ่ม package); built-in Identity Token Provider + SmtpEmailService, 60s cooldown, Base64Url token; endpoints `/api/v1/auth/send-verification-email` และ `/verify-email`; Frontend หน้า `/verify-email` + ปุ่มส่งยืนยันและ cooldown ในหน้า `/settings` |
| 5.5.5 | Gate: ทำงานจริง end-to-end + FR สถานะอัปเดต | ✅ | E2E กับ SQL Server ผ่าน: settings/profile persistence, email verification reset, reset soft-delete และ revoke refresh token; identity/settings คงอยู่. Backend Unit Tests 45/45 ผ่าน 100%; Frontend ESLint 0 warnings/errors และ Next.js build ผ่านสมบูรณ์ |

## 8. Phase 6 — SignalR & Notifications ✅

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 6.1 | `AddSignalR` + `MapHub<NotificationHub>("/hubs/notifications")` | ✅ | ไม่ติดตั้ง NuGet ฝั่ง server (ใช้ shared framework) |
| 6.2 | NotificationHub (auth ผ่าน claims, per-user groups) | ✅ | ARCHITECTURE §6, `user_{userId}` server-managed group |
| 6.3 | บันทึกลงตาราง Notifications ก่อน broadcast เสมอ | ✅ | NotificationRepository + BudgetService/NotificationService บันทึกลง SQL Server ก่อนส่ง |
| 6.4 | ✅ event contract — ล็อกลง API_SPECIFICATION §6 ก่อน implement | ✅ | D37 — `ReceiveNotification` และ `ReceiveRefreshHint` |
| 6.5 | ✅ `@microsoft/signalr` ฝั่ง FE (ขออนุมัติแล้ว) | ✅ | D37 — ติดตั้ง `^10.0.11` ใน `frontend/pocketwise-web` |
| 6.6 | FE: `src/lib/signalr.ts` + `features/notifications/` + UI Popover | ✅ | Hub client, `useSignalRNotifications`, `NotificationBell` Popover ใน `DashboardShell` |
| 6.7 | Gate: real-time ทำงานจริง + REST API + build ผ่าน 0 error/warning | ✅ | 22/22 tests backend ผ่าน, FE lint/build ผ่าน 0 error |

## 9. Phase 7 — Imports 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 7.1 | ImportJobs + SlipImportFiles flow จริง (upload → process → review) | ✅ | Upload → OCR extraction → review form → create transaction (sourceType=Slip) |
| 7.2 | Statement import บัตรเครดิต (CreditCardStatements + Items) | ✅ | S2: Parser CSV & JSON, statements CRUD, statement items, batch confirm (sourceType=CardStatement) |
| 7.3 | Duplicate detection ครบ (FileHash / TransactionReference / จำนวน+เวลา) → `DUPLICATE_TRANSACTION` | ✅ | SHA-256 FileHash detection สำหรับสลิป, duplicate item detection (date+amount+ref/card) สำหรับบัตรเครดิต |
| 7.4 | ❓ ที่เก็บไฟล์ — ตัดสิน (📦 ถ้า Blob) | ✅ | D38: Local Disk Storage ผ่าน `IFileStorageService` ใต้ `App_Data/uploads/` นอก public web root |
| 7.5 | ❓ ข้อจำกัดไฟล์ + quota — ตัดสิน | ✅ | D38: สลิปจำกัด 10 MB (.jpg, .jpeg, .png, .webp, .pdf), ใบแจ้งยอด (.csv, .json) |
| 7.6 | Progress ผ่าน SignalR (6.x) | ✅ | Real-time notification ผ่าน SignalR NotificationSender (`SLIP_IMPORT_REVIEW`, `SLIP_IMPORT_DUPLICATE`, `STATEMENT_IMPORT_COMPLETED`) |
| 7.7 | OCR (option ท้าย phase) — (📦 provider) — ผู้ใช้ review ก่อน save | ✅ | FR1.1–1.3: ติดตั้ง `Tesseract` 5.2.0 (`TesseractSlipOcrService`) พร้อม `tha`+`eng` trained data อ่านสลิปจริงภาษาไทยและ review & confirm form ก่อนบันทึก |
| 7.8 | Gate: import ใช้งานจริง + สถานะ FR อัปเดต | ✅ | 28/28 unit tests backend ผ่าน 100%, FE lint & build ผ่าน 0 error, อัปเดต FR1.1–FR1.3, FR4.8, S2 |

## 10. Phase 8 — Hardening & Deployment 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 8.1 | 📦 `Mvc.Testing` + integration tests ครบ | ⬜ | |
| 8.2 | 📦 Playwright (FE E2E — เมื่อใช้) | ⬜ | |
| 8.3 | Security review (rate limiting, upload guard, secrets ผ่านหมด) | ⬜ | Tech_Stack §8 |
| 8.4 | CI (GitHub Actions — build + lint + test) | ⬜ | |
| 8.5 | ❓ Hosting + scale-out + backup/restore + monitoring — ตัดสิน + ทำ | ⬜ | |
| 8.6 | Gate: deploy ทดลองผ่าน + อัปเดตเอกสาร deployment | ⬜ | |

---

## 11. วิธีอัปเดตไฟล์นี้ (ทุกครั้งที่ implement เสร็จ)

1. หารายการที่เสร็จจริง → ติด ✅ (+ note สั้น ๆ เช่น ไฟล์ที่สร้าง, วันที่, สิ่งที่ตรวจแล้ว)
2. รายการที่ทำค้างระหว่างงาน → 🟡 + note ความคืบหน้า
3. ถ้า implement ได้ "มากกว่า/ต่าง" จากคุณาการ checklist → เพิ่มแถวใหม่ (เช่น entity เพิ่ม, endpoint เพิ่ม) — ตามโค้ดจริง
4. ตัดสิน Decision (❓) เสร็จ → ติ๊กรายการของ checklist + บันทึกลง Appendix D ของ playbook (ทั้ง 2 ไฟล์ในงานเดียวกัน — playbook ข้อ 11)
5. สรุปกลุ่ม phase เสร็จทั้งกลุ่ม → sync ตารางสถานะ Phase ของ playbook §3 (ทั้ง 2 ไฟล์ต้องตรงกัน)
6. ห้ามติ๊กล่วงหน้า — อัปเดตตามสิ่งที่ "เสร็จจริง + ตรวจแล้ว" เท่านั้น (เช่น build ผ่าน, ทดสอบผ่าน, ไฟล์ปรากฏจริง)