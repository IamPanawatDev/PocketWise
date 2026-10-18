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

## 3. Phase 2 — Data Model 🔁 (พร้อมเริ่ม)

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 2.1 | Domain Enums ตาม DataDictionary (TransactionType, SourceType, Status ฯลฯ) | ⬜ | ผูกกับ D12 ที่ Entities |
| 2.2 | Domain ValueObjects (เช่น Money) | ⬜ | ตามที่ DataDictionary ระบุ |
| 2.3 | **Entities 20 ตาราง** — Users, UserRefreshTokens, Transactions, Categories, Tags, TransactionTags, BankAccounts, Budgets, RecurringTransactions, Notifications, UserSettings, ImportJobs, CreditCards, CreditCardStatements, CreditCardStatementItems, SlipImportFiles, Merchants, CategoryRules, InstallmentPlans, TransferGroups | ⬜ | ขอบเขตตาม FR (REQUIREMENTS + D12) |
| 2.4 | **คอลัมน์ `IsDeleted` เติมใน 7 ตาราง** (Budgets, RecurringTransactions, CreditCards, TransferGroups, InstallmentPlans, CreditCardStatements, CreditCardStatementItems) + sync DataDictionary | ⬜ | ตาม D5 + D12 (Transactions/BankAccounts มีอยู่แล้ว) |
| 2.5 | `PocketWiseDbContext` — DbSet ต่อตาราง + global query filter (soft delete) | ⬜ | `Infrastructure/Persistence/` |
| 2.6 | EF Configurations ต่อ Entity (Fluent API — precision decimal, UTC, constraints) | ⬜ | `Infrastructure/Configurations/` |
| 2.7 | ❓ cascade delete policy — ตัดสินแล้ว + implement ใน configurations | ⬜ | Decision ยังเปิด (playbook Phase 2) |
| 2.8 | Connection string ลง `appsettings.Development.json` (ไม่มี credential → ไม่ต้อง user-secrets) | ⬜ | D4 — ใช้ Trusted_Connection |
| 2.9 | DI registration (`AddInfrastructure` ที่ Infrastructure, เรียกใน Program.cs) | ⬜ | |
| 2.10 | `dotnet ef migrations add InitialCreate` (+ทบทวนไฟล์ก่อน apply) | ⬜ | รวม UserRefreshTokens (D6) |
| 2.11 | `dotnet ef database update` — สร้างตารางบน `PocketWiseDb` จริง + ตรวจจำนวนตาราง = 20 | ⬜ | ตรวจด้วย sqlcmd ได้ |
| 2.12 | Gate Phase 2: `dotnet build` 0 error | ⬜ | |

## 4. Phase 3 — Identity & Auth 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 3.1 | ❓ relation `Users` ↔ `IdentityUser` — ตัดสิน + ทำ per ข้อตกลง | ⬜ | ยังเปิด |
| 3.2 | ApplicationUser + ผูก UserRefreshTokens (ขอบเขตตาม 3.1) | ⬜ | |
| 3.3 | DbContext → `IdentityDbContext<ApplicationUser>` + config ตาราง Identity | ⬜ | |
| 3.4 | ลงทะเบียน Identity + `AddAuthentication().AddJwtBearer()` + JWT params (key → user-secrets) | ⬜ | |
| 3.5 | ❓ อายุ token จริง — ตัดสิน (แนวทาง 15–60 นาที / 7–30 วัน) | ⬜ | |
| 3.6 | Use Cases: Register, Login, Refresh, Logout/Revoke, Me | ⬜ | `Features/Auth/` + DTOs + Validators |
| 3.7 | Token issuing service (claims, expiries) ที่ `Api/Authentication/` + Controllers (thin) | ⬜ | |
| 3.8 | Refresh token rule เต็ม: SHA-256 hash, rotation, `ReplacedByTokenHash`, reuse → revoke ทั้ง user, multi-device | ⬜ | ตาม DataDictionary กฎ 46–50 + D1 |
| 3.9 | Contract ของ `/api/v1/auth/*` 5 endpoint ลง API_SPECIFICATION §5 ให้ตรงของจริง + Swagger ตรง | ⬜ | D11 |
| 3.10 | FE sync: `types/api.types.ts`, `types/auth.types.ts`, `schemas/auth.schema.ts`, หน้า (auth)/ + form | ⬜ | หลัง contract ล็อก |
| 3.11 | Migration update (ตาราง Identity) + apply จริง | ⬜ | |
| 3.12 | Gate Phase 3: login → refresh → revoke ผ่าน API จริง, build ผ่าน, tokens ถูก hash ใน DB, tests | ⬜ | |

## 5. Phase 4 — Core Transactions 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 4.1 | ❓ filter params ของ list endpoints — ตัดสิน + ลง API_SPECIFICATION | ⬜ | format ล็อกแล้ว (D11) |
| 4.2 | Entities เพิมเติมถ้ามี + features แยกกลุ่ม: Transactions, Categories, Tags, Transfers | ⬜ | |
| 4.3 | Repository interfaces + implementations (ITransactionRepository ฯลฯ) | ⬜ | |
| 4.4 | DTOs + Validators + Controllers (thin) | ⬜ | |
| 4.5 | `ApiResponse<T>` + error middleware (envelope D8 ทุก route) | ⬜ | เริ่มจาก controller แรก |
| 4.6 | Tag limit 20 → `TAG_LIMIT_REACHED` (FR3.2.6) | ⬜ | |
| 4.7 | ปุ่ม Transfers: TransferGroups + จับคู่โอนออก/โอนเข้า (FR1.5) | ⬜ | |
| 4.8 | (📦 optional) FluentValidation — หรือ manual validators | ⬜ | รอการตัดสิน |
| 4.9 | FE: types/schemas/features (transactions, categories, tags, transfers) + หน้า (dashboard)/transactions | ⬜ | หลัง contract ล็อก |
| 4.10 | Migration/โครงสร้างจริงที่ใหม่ + Gate: CRUD end-to-end, FE lint+build, tests, FR สถานะอัปเดต | ⬜ | |

## 6. Phase 5 — Budgets, Credit Cards & Reports 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 5.1 | Budgets CRUD (scopeType TOTAL/CATEGORY/TAG + AlertThresholdPercent 80) | ⬜ | FR5.1.x |
| 5.2 | Tracking ยอดใช้เทียบงบ (FR5.2.1) | ⬜ | |
| 5.3 | ❓ threshold semantics แจ้งเตือน — ตัดสิน | ⬜ | |
| 5.4 | Email แจ้งเตือนงบ (FR5.2.2) — (📦 email provider) | ⬜ | |
| 5.5 | CreditCards CRUD + ผูก transaction (FR2.2 เต็ม) | ⬜ | statement import = Phase 7 |
| 5.6 | RecurringTransactions CRUD + กลไกสร้างตามรอบ (❓ background job vs on-demand) (FR2.7) | ⬜ | |
| 5.7 | จัดหมวดอัตโนมัติ — Merchants + CategoryRules (FR3.1.1, FR3.1.3) | ⬜ | |
| 5.8 | Reports/Dashboard aggregate APIs (FR4.6, FR6.1.x, FR6.2.x) | ⬜ | |
| 5.9 | (📦 optional) chart lib ฝั่ง FE | ⬜ | รอการตัดสิน |
| 5.10 | FE: features (budgets, accounts, credit-cards, reports) + หน้า dashboard | ⬜ | |
| 5.11 | Gate Phase 5: FR ครบ + สถานะอัปเดต + build/test ผ่าน | ⬜ | |

## 7. Phase 5.5 — Settings & Profile 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 5.5.1 | UserSettings CRUD (Theme, CurrencyCode, Locale, EmailBudgetAlertsEnabled) | ⬜ | FR6.3.1–3, FR5.2.2 toggle |
| 5.5.2 | โปรไฟล์: เปลี่ยนเบอร์/วันเกิด + อีเมล (รีเซ็ต IsEmailVerified — ❓ ยืนยันใหม่ไหม) | ⬜ | FR6.3.4 |
| 5.5.3 | ล้างข้อมูลเริ่มใหม่ (soft delete ตารางการเงินของ user + revoke tokens — ❓ ขอบเขต) | ⬜ | FR6.3.6 |
| 5.5.4 | Gate: ทำงานจริง end-to-end + FR สถานะอัปเดต | ⬜ | |

## 8. Phase 6 — SignalR & Notifications 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 6.1 | `AddSignalR` + `MapHub<NotificationHub>("/hubs/notifications")` | ⬜ | ไม่ติดตั้ง NuGet ฝั่ง server |
| 6.2 | NotificationHub (auth ผ่าน claims, per-user groups) | ⬜ | ARCHITECTURE §6 |
| 6.3 | บันทึกลงตาราง Notifications ก่อน broadcast เสมอ | ⬜ | |
| 6.4 | ❓ event contract — ล็อกลง API_SPECIFICATION §6 ก่อน implement | ⬜ | D11-⑤ |
| 6.5 | 📦 `@microsoft/signalr` ฝั่ง FE (ขออนุมัติก่อน) | ⬜ | |
| 6.6 | FE: `src/lib/signalr.ts` + `features/notifications/` | ⬜ | |
| 6.7 | Gate: real-time ทำงานจริง (แจ้ง budget warning, import progress) + build ผ่าน | ⬜ | |

## 9. Phase 7 — Imports 🔁

| # | รายการ | สถานะ | Note |
|:-:|---|:-:|---|
| 7.1 | ImportJobs + SlipImportFiles flow จริง (upload → process → review) | ⬜ | |
| 7.2 | Statement import บัตรเครดิต (CreditCardStatements + Items) | ⬜ | S2 |
| 7.3 | Duplicate detection ครบ (FileHash / TransactionReference / จำนวน+เวลา) → `DUPLICATE_TRANSACTION` | ⬜ | |
| 7.4 | ❓ ที่เก็บไฟล์ — ตัดสิน (📦 ถ้า Blob) | ⬜ | |
| 7.5 | ❓ ข้อจำกัดไฟล์ + quota — ตัดสิน | ⬜ | |
| 7.6 | Progress ผ่าน SignalR (6.x) | ⬜ | |
| 7.7 | OCR (option ท้าย phase) — (📦 provider) — ผู้ใช้ review ก่อน save | ⬜ | FR1.1–1.3 |
| 7.8 | Gate: import ใช้งานจริง + สถานะ FR อัปเดต | ⬜ | |

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