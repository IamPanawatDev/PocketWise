# PocketWise — Development Playbook & Phase Guideline

> **สำคัญสำหรับ AI Assistant:** เอกสารนี้คือ **Playbook เชิงปฏิบัติ** ประจำโปรเจค PocketWise — บอกว่าแต่ละ Phase ต้องทำอะไร ใช้คำสั่งใด วางไฟล์ที่ใด และจุดใด **ห้ามตัดสินใจเอง ต้องถามเจ้าของโปรเจคก่อน (Decision Points)** ต้องอ่านคู่กับ `/AGENTS.md` (root), `/backend/AGENTS.md`, `/frontend/AGENTS.md` และ `/docs/Tech_Stack.md` เสมอ

---

## 1. บทบาทของเอกสารนี้ และลำดับการอ่าน

เอกสารนี้**ไม่ซ้ำ**กับเอกสารอื่น — มันเพิ่มสิ่งที่ไม่มีที่ไหน: ขั้นตอนเชิงปฏิบัติต่อ Phase, คำสั่งที่รันได้จริง, สถานะความคืบหน้า และ Decision Points

### ลำดับที่ AI ต้องอ่านเมื่อได้รับงาน

1. `/AGENTS.md` (root) — กฎเหล็ก + สถาปัตยกรรมรวม
2. `/backend/AGENTS.md` หรือ `/frontend/AGENTS.md` — ตามขอบเขตงาน (แตะ schema ต้องอ่านทั้งคู่)
3. **เอกสารนี้** — Phase ที่งานสัมพันธ์ + Decision Points ของ Phase นั้น
3. `/docs/DEVELOPMENT_GUIDELINE.md` — **รายการ requirement (FR) + สถานะ + ขอบเขตนอก scope** — ถ้างานระบุ/ตั้งคำถามเรื่อง "ต้องทำอะไร"
4. `/docs/IMPLEMENTATION_CHECKLIST.md` — **สถานะ implement รายรายการ** (อัปเดตทุกครั้งที่ implement เสร็จ — กติกา §11) และดูว่างานถัดไปคืออะไร
5. `/docs/REQUIREMENTS.md` — **รายการ requirement (FR) + สถานะ + สิ่งที่นอก scope** — ถ้างานระบุ/ตั้งคำถามเรื่อง "ต้องทำอะไร"
6. `/docs/ARCHITECTURE.md` — **สถาปัตยกรรมล็อกแล้ว** (ผัง, dependency, lifecycle) — อ่านก่อนออกแบบโครงสร้างโค้ดใด ๆ
7. `/docs/DataDictionary.md` — **ถ้างานแตะ schema / Entity / API contract**
8. `/docs/API_SPECIFICATION.md` — **ถ้างานแตะ endpoint / DTO / error shape / SignalR events**
9. **`frontend/pocketwise-web/DESIGN.md` — ถ้างานแตะ UI / Component / หน้าจอ** (Design System, ห้ามเดาสี-font-spacing)
10. โค้ดจริงใน `/backend/src` และ `/frontend/pocketwise-web/src` — ตาม Pre-Implementation Protocol

### Source of Truth ของแต่ละเรื่อง

| เรื่อง | Source of Truth | ไฟล์ |
|---|---|---|
| กฎเหล็ก, การวางไฟล์ | AGENTS.md ประจำขอบเขต | `/AGENTS.md`, `/backend/AGENTS.md`, `/frontend/AGENTS.md` |
| **สถาปัตยกรรม, ทิศทาง dependency, request lifecycle** | **ARCHITECTURE** | `/docs/ARCHITECTURE.md` |
| **สัญญา REST/SignalR, endpoint, error envelope, pagination** | **API_SPECIFICATION** | `/docs/API_SPECIFICATION.md` |
| **Requirement, ขอบเขตระบบ (ทำอะไร/ไม่ทำอะไร)** | **REQUIREMENTS** | `/docs/REQUIREMENTS.md` |
| Schema ฐานข้อมูล, Business rules ข้อมูล | DataDictionary | `/docs/DataDictionary.md` — ปัจจุบัน **25 ตาราง** (D13); เป้าหมาย **28 ตาราง** หลัง F9/D51 |
| **Design tokens, UI components** | **DESIGN.md** | `/frontend/pocketwise-web/DESIGN.md` |
| Stack, Security baseline, Version policy | Tech_Stack | `/docs/Tech_Stack.md` |
| **ขั้นตอน/คำสั่ง/สถานะ/Decision Points** | **เอกสารนี้** | `/docs/DEVELOPMENT_GUIDELINE.md` |
| **สถานะ implement รายรายการต่อ phase** | **IMPLEMENTATION_CHECKLIST** | `/docs/IMPLEMENTATION_CHECKLIST.md` |

### สัญลักษณ์ที่ใช้ในเอกสารนี้

- ✅ = เสร็จแล้ว / ล็อกการตัดสินใจแล้ว
- 🟡 = ติดตั้งของครบแล้ว รอเริ่มเขียนโค้ด
- ⬜ = ยังไม่เริ่ม
- ❓ = **Decision Point** — ห้ามเขียนโค้ดก่อนได้คำตอบจากเจ้าของโปรเจค (Master Rule #2)
- 📦 = ต้องใช้ package ที่**ยังไม่ได้ติดตั้ง** — ต้องขออนุมัติก่อน (Master Rule #3)

---

## 2. กติกาการใช้ Playbook

1. **ตรวจ Phase ก่อนหน้าก่อนเริ่ม Phase ใหม่** — ดูตารางสถานะในข้อ 3 หาก Phase ก่อนหน้ายังไม่ปิด Gate ให้เดินหน้าตามลำดับ
2. **Decision Points ห้ามข้าม** — หากงานต้องตัดสินใจในเรื่องที่มี ❓ แต่ยังไม่มีคำตอบ ให้หยุดและถามทันที **ห้ามเดาแม้เพียงเรื่องเดียว**
3. **ติดตั้ง package ต้องผ่านอนุมัติ** — ขั้นตอนที่ต้องใช้ของใหม่จะมีเครื่องหมาย 📦 ให้ขออนุมัติพร้อมเหตุผลก่อนเสมอ
4. **เอกสารนี้เป็นไฟล์มีชีวิต** — เมื่อปิด Phase หรือได้คำตอบใหม่ ต้องอัปเดตตารางสถานะ (ข้อ 3) และ Appendix D (decision ที่ล็อกแล้ว) ทุกครั้ง
5. **แตะ schema = sync เอกสาร** — ถ้าเปลี่ยน Entity/DTO ต้องอัปเดต `DataDictionary.md` และ TypeScript types ฝั่ง frontend ให้ตรงกันในงานเดียวกัน
6. **GEMINI.md เป็นสำเนาของ `/AGENTS.md`** — แก้ `/AGENTS.md` แล้วต้อง sync `GEMINI.md` ทันที (ดู Appendix C)
7. **UI ต้องตาม DESIGN.md** — ทุกงาน UI ฝั่ง frontend ต้องอ่านและอ้าง token จาก `/frontend/pocketwise-web/DESIGN.md` ก่อน (ติดตั้งผ่าน `npx getdesign@latest add discord`, กฎการใช้ใน §4 ของ `/frontend/AGENTS.md`)
8. **งานต้องมี requirement รองรับ** — ฟีเจอร์ที่จะสร้างให้ระบุ FR id ใน `/docs/REQUIREMENTS.md` ได้ (หรือได้คำสั่งใหม่จากเจ้าของโปรเจค) และจบ feature แล้วอัปเดตสถานะ FR (⬜ → 🟡 → ✅) ในไฟล์เดียวกัน — **REQUIREMENTS.md คือขอบเขตระบบ (SoT ของ "ทำอะไร")**
9. **โครงสร้างโค้ดใหม่ต้องตรง ARCHITECTURE.md** — ทุก feature ใช้เลเยอร์เดียวกัน (orchestration ใน Application, EF ที่ Infrastructure ผ่าน interface, Controller เบา) เพื่อให้ระบบมีสถาปัตยกรรมเดียวกันทั้งโปรเจค
10. **API ใหม่/แก้ DTO ต้องไปตาม API_SPECIFICATION.md** — ก่อน implement endpoint ใหม่ ให้เพิ่ม/แก้สัญญาลงไฟล์นั้นก่อน แล้ว implement ตาม (และ Swagger ใน dev ต้องตรงกัน)
11. **implement จบ = อัปเดต `/docs/IMPLEMENTATION_CHECKLIST.md` ทุกครั้ง** — ติ๊กสถานะรายการที่เสร็จจริงในไฟล์ checklist (⬜ → 🟡/✅) ตามขั้นที่ทำจริง + ถ้าปิดทั้ง phase ให้ sync ตารางสถานะ §3 ของ playbook ด้วย — ตามขั้นตอน "วิธีอัปเดต" ท้ายไฟล์ checklist

---

## 3. สถานะ Phase ปัจจุบัน

| Phase | สถานะ | หมายเหตุ |
|:---:|:---:|---|
| 0 สภาพแวดล้อม | ✅ | `run.cmd`, local tool manifest พร้อม + **SQL Server 2025 ที่ localhost ตรวจแล้ว — `PocketWiseDb` พร้อม (ว่าง 0 ตาราง)** |
| 1 Foundation | ✅ | Solution 4 โปรเจค, Next.js app, ESLint, `.env.example` |
| 2 Data Model | ✅ | Entities/DbContext/Configurations/Migration ครบ 25 ตาราง; `InitialCreate` applied บน `PocketWiseDb`; build ผ่าน |
| 3 Identity & RBAC | ✅ | `ApplicationUser : IdentityUser<long>`, JWT + Refresh Token, Role-Based Access Control (Admin/Member, Permissions 15 รายการ 6 โมดูล, Role-Permission Matrix, Roles CRUD, User Roles Assignment หน้า /admin/permissions), DatabaseSeeder (หมวดหมู่มาตรฐาน 12 รายการ, สิทธิ์, บทบาทเริ่มต้น) |
| 4 Core Transactions | ✅ | 4.10 Gate ผ่านและ E2E ตรวจแล้ว; FR2.2 credit-card picker เชื่อมกับ CRUD ใน Phase 5 แล้ว |
| 5 Budgets, Credit Cards & Reports | ✅ | Core implementation, frontend, build และ tests ผ่าน; FR5.2.2 email delivery สำเร็จผ่าน built-in SMTP (SmtpEmailService) |
| 5.5 Settings & Profile | ✅ | Gate ผ่าน: settings/profile/data-reset E2E กับ SQL Server จริง; ตรวจ persistence, soft-delete, คง user/settings และ revoke refresh token; Backend Release build 0 warnings/errors, 13 unit tests + 1 integration test ผ่าน; frontend lint/build ผ่าน |
| 6 SignalR | ✅ | NotificationHub (/hubs/notifications), per-user claims group, InApp SignalR delivery, Notification REST APIs, NotificationBell popover, @microsoft/signalr ^10.0.11 ติดตั้งแล้ว |
| 7 Imports | ✅ | นำเข้าสลิปโอนเงิน (SHA-256 duplicate detection, local OCR parser, review & confirm), นำเข้าใบแจ้งยอดบัตรเครดิต CSV/JSON (duplicate detection, batch confirm), SignalR real-time notification, import jobs history; 27 unit tests + 3 integration tests ผ่าน, FE build & lint ผ่าน |
| 8 Hardening & Polish | 🟡 | Maintenance Background Jobs (AuditLogCleanup at 02:00, RefreshTokenCleanup at 03:00 Sunday), Motion animation system (`motion`), Unified Skeleton Loading (32 routes), Smooth Modal/BottomSheet transitions, Brand & Ambient background styling |
| 9 Admin Operations | ⬜ | F9/D51: users, sessions/security events, admin overview, failed imports, system settings, maintenance mode และ targeted announcements |

> กติกา: เมื่อแตะ Phase ไหน ให้ปรับสถานะในตารางนี้ (⬜ → 🟡 → ✅) ทันทีที่สถานะเปลี่ยนจริง

---

## 4. Phase Playbooks

### Phase 0 — สภาพแวดล้อม (Reference)

**คำสั่งรันโปรเจค:**

```text
run.cmd                          # เปิด backend + frontend พร้อมกัน (Windows Terminal ถ้ามี)
cd backend/src/PocketWise.Api && dotnet watch run     # backend เท่านั้น
cd frontend/pocketwise-web && npm run dev             # frontend เท่านั้น
```

**URL ใน dev (จากไฟล์จริง):**

- Backend: `https://localhost:7023` (http: `http://localhost:5268`) — จาก `launchSettings.json`
- Frontend: Next.js default (port 3000)
- ✅ `.env.example` แก้ให้ตรงแล้ว: `NEXT_PUBLIC_API_BASE_URL=https://localhost:7023` และ `NEXT_PUBLIC_SIGNALR_HUB_URL=https://localhost:7023/hubs/notifications` — หากเปลี่ยน port ต้อง sync ทั้งสองไฟล์เสมอ

**คำสั่งที่ต้องรันหลัง pull จาก git (ครั้งแรก):**

```bash
cd backend
dotnet tool restore        # restore dotnet-ef จาก dotnet-tools.json
dotnet build               # ตรวจ solution
cd ../frontend/pocketwise-web
npm install                # จาก package.json (+ package-lock.json)
```

---

### Phase 1 — Foundation (✅ เสร็จแล้วสิ้นเชิง)

สิ่งที่เป็นมาแล้ว (ไม่ทำซ้ำ): `PocketWise.sln` + 4 โปรเจค (net10.0), โครงสร้างโฟลเดอร์ครบตาม AGENTS.md, Next.js 16.4.2 + React 19.3 + Tailwind 4 + ESLint 9, `.env.example`, dotnet local tool manifest (`dotnet-ef`), root `.gitignore` + `README.md`, GitHub repo (`IamPanawatDev/PocketWise`)

งานเพิ่มเติมเฉพาะเมื่อจำเป็น: CI (GitHub Actions), `.editorconfig`, Prettier — ทำตอน Phase 8 หรือเมื่อเจ้าของโปรเจคสั่ง

---

### Phase 2 — Data Model (EF Core + Migrations)

**Prerequisite:** แพ็กเกจติดตั้งแล้ว: `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.0, `Microsoft.EntityFrameworkCore.Design` 10.0.13, `Microsoft.EntityFrameworkCore.Tools` 10.0.13 (ใน Infrastructure), `dotnet-ef` 10.0.13 (global tool)

**ขั้นตอน:**

1. **สร้าง Entities ตาม `DataDictionary.md` — ครบ 25 ตาราง (ขอบเขตตาม REQUIREMENTS.md + D13)** → `src/PocketWise.Domain/Entities/` ไฟล์ละ entity ชื่อเดียวกับตาราง + Enums → `Enums/`, ValueObjects → `ValueObjects/`
   - ขอบเขต: สร้าง Entities ให้ตรงกับรายการ FR ใน REQUIREMENTS.md (F1–F8 ครอบทั้ง 25 ตาราง) — รายชื่อตารางปัจจุบันดู D13 ใน Appendix D
   - ❓ หากความสัมพันธ์ (1–many / many–many), ชนิด field หรือ constraint ไม่ชัดใน DataDictionary → **ถามก่อนเขียน**
2. **สร้าง `PocketWiseDbContext`** → `src/PocketWise.Infrastructure/Persistence/`
   - DbSet ต่อตารางที่สร้าง, ตามกฎระบบ: เก็บเวลาเป็น UTC (`timestamptz`), soft delete (`IsDeleted` + global query filter) สำหรับข้อมูลการเงิน และ precision ของ `decimal` ที่เป็นจำนวนเงิน ตาม DataDictionary
   - **คอลัมน์ `IsDeleted` ต้องมีใน configuration ของตารางการเงิน 9 ตาราง (D5)** — ตารางที่ DataDictionary ยังไม่มีคอลัมน์นี้ (Budgets, RecurringTransactions, CreditCards, TransferGroups, InstallmentPlans) ให้**เพิ่มคอลัมน์เข้าไปตอนสร้าง entity** และ**ยื่นแก้ DataDictionary ในงานเดียวกัน** (กติกา §5)
   - ❓ cascade delete policy — ยืนยันจากเจ้าของก่อนเขียน configurations
3. **EF Configurations** → `src/PocketWise.Infrastructure/Configurations/<Entity>Configuration.cs` (แยกไฟล์ต่อ entity, Fluent API)
4. **ลงทะเบียน DbContext** ผ่าน Infrastructure (เช่น extension method `AddInfrastructure`) แล้วเรียกใน `Program.cs` — อย่ากระจาย EF-specific service registration ยุบอยู่ใน Api layer เพียงบางส่วน
5. **Connection string (✅ ล็อกแล้ว D50):** PostgreSQL ที่ localhost (`pocketwise-postgres` Docker) พอร์ต 5432 + database ชื่อ `pocketwise_db` — ใน `appsettings.Development.json`: `Host=localhost;Port=5432;Database=pocketwise_db;Username=postgres;Password=postgres` และรองรับ Supabase บน Production ด้วย credential ใน user-secrets / environment variables
6. **สร้าง Migration แรก — รวม `UserRefreshTokens` ด้วย (✅ ล็อกแล้ว D6):** phase นี้ต้องสร้าง Entity `UserRefreshToken` + configuration ครบตาม DataDictionary (SHA-256 `TokenHash`, rotation fields) แม้ flow auth จะเริ่มที่ Phase 3:

```bash
cd backend
dotnet tool restore
dotnet ef migrations add InitialPostgres \
  --project src/PocketWise.Infrastructure \
  --startup-project src/PocketWise.Api
```

7. **ทบทวนไฟล์ migration ที่สร้างขึ้นก่อน apply เสมอ** (EF แปลเอาเองได้ ไม่ครบทุก constraint ของ DataDictionary)
8. **Apply + ตรวจ:**

```bash
dotnet ef database update --project src/PocketWise.Infrastructure --startup-project src/PocketWise.Api
```

9. **Gate:** `dotnet build` ผ่าน, migration apply สำเร็จบน `localhost:5432/pocketwise_db` (Docker) / Supabase, ER ตรง DataDictionary

**Decision Points ของ Phase 2:**
- ❓ **cascade delete policy** — ข้อเดียวที่ยังเปิด (จะยื่นตอนเขียน configuration FK)
- ✅ ฐานข้อมูล: localhost + `PocketWiseDb` (D4) — ตรวจแล้วพร้อมจริง
- ✅ **ขอบเขต soft delete (D5 — ล็อกแล้ว):** ใช้ **ตารางกลุ่มการเงิน 9 ตาราง** — `Transactions`, `BankAccounts`, `CreditCards`, `Budgets`, `RecurringTransactions`, `InstallmentPlans`, `TransferGroups`, `CreditCardStatements`, `CreditCardStatementItems` (หลักคิด: ข้อมูลที่ถูกนำไปรวมในรายงาน/สรุปยอด ไม่ลบถาวร) — คอลัมน์ `IsDeleted` ที่ยังไม่มีใน DataDictionary ให้เพิ่มตอนสร้าง entity + sync DataDictionary (ถูกบันทึกไว้ที่ §3 NFR ของ REQUIREMENTS ด้วย)
- ✅ `UserRefreshTokens` รวมใน migration แรกเลย (D6)
- ✅ **สร้างครบ 25 ตาราง** (D13) — F7 (RBAC: Roles/Permissions/UserRoles/RolePermissions) และ F8 (AuditLogs) ถูกเพิ่มโดยเจ้าของโปรเจค ให้รวมใน migration แรกด้วย

---

### Phase 3 — Identity & Auth (JWT Bearer + Refresh Token)

**การตัดสินใจที่ล็อกแล้ว (✅):** ระบบใช้ **JWT Bearer + Refresh Token** (D1) — **สถาปัตยกรรม auth flow ฉบับเต็มอยู่ที่ [`/docs/ARCHITECTURE.md` §5](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) เท่านั้น** — กฎ refresh token (SHA-256 hash, rotation, reuse detection, multi-device) อยู่ใน DataDictionary กฎ 46–50 — phase นี้ทำ implementation ตามสองเอกสารนั้น ไม่ย้ำรายละเอียดซ้ำ

**Prerequisite:** `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 10.0.13 (ติดตั้งแล้วที่ `PocketWise.Domain`), `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.13 (ติดตั้งแล้วที่ `PocketWise.Api`)

**ขั้นตอน (สถานะปัจจุบัน = ✅ เสร็จ):**

1. ✅ **Decision Point D15 — relation `Users` ↔ `IdentityUser`:** ใช้ `ApplicationUser : IdentityUser<long>` ตารางยังชื่อ `Users`; `ApplicationRole : IdentityRole<long>` ตารางยังชื่อ `Roles`
2. ✅ แต่ง Entity ผู้ใช้ + `UserRefreshTokens` (ตาราง 25) ตาม D15
3. ✅ เปลี่ยน DbContext เป็น `IdentityDbContext<ApplicationUser, ApplicationRole, long, ...>` ที่ Infrastructure + configuration ตาราง Identity
4. ✅ ลงทะเบียน Identity services + `AddAuthentication().AddJwtBearer()` + JWT validation params — **key เก็บ user-secrets ก่อน production** (ปัจจุบันอยู่ใน `appsettings.Development.json`)
5. ✅ สร้าง Use Cases → `src/PocketWise.Application/Features/Auth/`: Register, Login, Refresh, Logout/Revoke, Me — พร้อม DTOs
6. ✅ **Decision Point D15 — อายุ token:** access 60 นาที / refresh 30 วัน
7. ✅ ชื่อ route ของ auth endpoints — ล็อกจาก D11: `/api/v1/auth/{register,login,refresh,logout,me}`
8. ✅ **Frontend sync:** `src/types/api.types.ts`, `src/types/auth.types.ts`, `src/schemas/auth.schema.ts`, หน้า `(auth)/login` + `(auth)/register`, BFF auth routes, และ proxy route guard ครบถ้วน
9. ✅ Gate: register/login/me ผ่าน API จริง; build ผ่าน 0 error; tokens ถูก hash ใน DB
10. ✅ **Role-Based Access Control (RBAC) & Seeding (D41):**
   - DatabaseSeeder: รันอัตโนมัติเมื่อ API start เพื่อ seed หมวดหมู่มาตรฐานระบบ 12 หมวดหมู่ (IsSystem = 1), สิทธิ์มาตรฐาน 15 รายการ 6 โมดูล, บทบาทเริ่มต้น (Admin, Member) และมอบหมายสิทธิ์ Admin ให้บัญชีผู้ใช้เดิม
   - Backend RBAC: IRolePermissionRepository, RolePermissionRepository, IRolePermissionService, RolePermissionService, AdminRolesController (/api/v1/admin/*) พร้อม ClaimTypes.Role ใน JWT และ unit tests ผ่าน 100% (40/40 tests)
   - Frontend Admin UI: หน้า /admin/permissions พร้อม 3 แท็บ (Permission Matrix, Role Management CRUD, User Roles Assignment) เมนูบน DashboardShell และ route protection ใน proxy.ts

---

### Phase 4 — Core Transactions (CRUD + Categories + Tags + Transfers)

**requirements ที่รองรับ (ตาม REQUIREMENTS.md — ทำให้ครบใน phase นี้):** FR2.1–FR2.6, FR3.1.2–FR3.1.4 (ช่วง สร้าง/เปลี่ยน/เรียงหมวด — auto-categorize ไปที่ Phase 5), FR3.2.1–FR3.2.6 (แท็กครบ รวมลิมิต 20), FR4.1–FR4.5, FR4.7, FR4.9, **FR1.4–FR1.5 (แยกดูตามธนาคาร + โอนระหว่างบัญชี — TransferGroups)**

**ขั้นตอน:**

1. Features ที่ `Application/Features/` — แยกตามกลุ่ม: Transactions, Categories, Tags, Transfers — แยก Command / Query
2. Repository interface → `Application/Interfaces/` — implementation → `Infrastructure/Repositories/`
3. DTOs + Validators + Controller (thin) — ครบตาม backend/AGENTS.md §3; นำสัญญาที่เขียนเตรียมไว้ใน `API_SPECIFICATION.md` §5.2 เป็น template
4. ✅ pagination/ผังมาตรฐานล็อกแล้ว (D11): `page/pageSize` + `{ items, page, pageSize, totalItems, totalPages }` + `sortBy/sortDesc` — **❓ เหลือเฉพาะรายชื่อ filter params ของ endpoint list** — ยืนยันก่อน implement
5. 📦 `FluentValidation` ยังไม่ถูกติดตั้ง — หากยืนยันใช้ ขออนุมัติก่อน หรือเขียน manual validation ใน Validators/ ชั่วคราว
6. **API response envelope (✅ ล็อกแล้ว D8):** ใช้ **แบบ Wrapped** ทุก endpoint — สเปกฉบับเต็ม (shape, error codes, ตัวอย่าง) อยู่ที่ [`/docs/API_SPECIFICATION.md`](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) — งาน phase นี้คือสร้างประเภท `ApiResponse<T>` ที่ Application + middleware/exception handler ครอบ error ให้ครบทุก route ตั้งแต่ controller แรก (ไม่เขียน spec ใหม่ที่นี่)
7. **Business rule ที่ต้องเขียนร่วมใน phase นี้ (จาก REQUIREMENTS §3):** tag limit 20 (FR3.2.6 → `TAG_LIMIT_REACHED`), duplicate detection เตรียม field ตาม DataDictionary (FR4.x transfer + สลิปยังไม่มาใน phase นี้)
8. **Frontend:** `src/types/transaction.types.ts`, `src/schemas/transaction.schema.ts`, `src/features/transactions/` (components, hooks), หน้า `src/app/(dashboard)/transactions/page.tsx` — สร้างหลัง contract ล็อก
9. **มาตรฐาน Data Table ฝั่ง Frontend:** ใช้ shadcn/ui ที่ปรับ theme ตาม `frontend/pocketwise-web/DESIGN.md` และ TanStack Table เป็น engine; รวมรูปแบบไว้ใน reusable component กลางเมื่อใช้ซ้ำได้ แทนการสร้าง table implementation ต่อ feature โดยไม่จำเป็น. TanStack Table ยังไม่ติดตั้ง — ต้องขออนุมัติก่อนเพิ่ม dependency และบันทึกสถานะ/วิธีใช้ตาม Master Rule #4
10. ตารางต้องแยก Loading, Empty และ Error state อย่างชัดเจน; รองรับ responsive ด้วย mobile card/list หรือ horizontal scroll ที่ควบคุมได้; จัดแนวจำนวนเงินสม่ำเสมอและใช้ `Intl.NumberFormat` ตาม currency code จาก data contract โดยไม่ hardcode สกุลเงินใน component; controls ต้องใช้ keyboard ได้และแสดง sort direction ให้ assistive technology เช่น `aria-sort`
11. เมื่อ API เป็นเจ้าของ query หรือข้อมูลมีจำนวนมาก ให้ใช้ server-side pagination/filtering/sorting โดยอิง contract ใน `API_SPECIFICATION.md` และตั้ง TanStack Table เป็น manual mode ให้สอดคล้อง; ใช้ client-side operations เฉพาะเมื่อโหลดข้อมูลครบและมีปริมาณเหมาะสม. Transactions ใช้ `page`/`pageSize`, filters และ `sortBy`/`sortDesc` ตาม API Specification §4/§5A
12. **Gate:** CRUD ทำงานจริง end-to-end, FE lint + build ผ่าน, tests ที่เกี่ยวข้อง — และ**ทุก FR ที่หัวข้อระบุ ต้องมีสถานะ 🟡/✅ ใน REQUIREMENTS.md**

---

### Phase 5 — Budgets, Credit Cards & Reports

**requirements ที่รองรับ:** FR5.1.1–FR5.1.4, FR5.2.1–FR5.2.4 (บันทึก budget notifications; email/in-app delivery ตาม D28/Phase 6), FR2.7 (รายการประจำ RecurringTransactions), FR3.1.1+FR3.1.3 (จัดหมวดอัตโนมัติ — Merchants+CategoryRules), FR4.6 (สรุปแยกหมวด), FR6.1.1–FR6.1.4, FR6.2.1–FR6.2.7 (dashboard + reports), FR2.2 เต็ม (บัตรเครดิตพื้นฐาน; statement import ไปที่ Phase 7 ตาม S2)

**ขั้นตอน:**

1. Budgets: scopeType TOTAL/CATEGORY/TAG + `AlertThresholdPercent` (default 80 ตาม DataDictionary); แจ้งหนึ่งครั้งต่อรอบเมื่อถึง threshold และอีกครั้งเมื่อเกิน 100% (D27)
2. **CreditCards พื้นฐาน** — entity มีแล้วจาก Phase 2; phase นี้เพิ่ม CRUD + ผูก transaction
3. RecurringTransactions — CRUD + HostedService สร้างรายการตามรอบ (D26)
4. จัดหมวดอัตโนมัติ: Merchants (DefaultCategoryId) + CategoryRules (MatchType/MatchPattern/Priority)
5. Reports: aggregate query ใน Application (logic อยู่ฝั่งโค้ดตาม ARCHITECTURE §4 — DB เก็บข้อมูลเท่านั้น); ใช้ Recharts ฝั่ง FE (D29)
6. Export (CSV/XLSX/PDF) — ยังไม่อยู่ใน REQUIREMENTS (ผู้พัฒนาจะเพิ่ม FR เมื่อต้องการใช้)
7. แจ้งเตือนงบ: บันทึก notification ลง Notifications; in-app broadcast ผ่าน SignalR และ email delivery ผ่าน built-in SMTP (`SmtpEmailService`) ตาม FR5.2.2 (D28 ปิดแล้ว)
8. **Gate:** core implementation ใน Phase 5 ครบ + build/test ผ่าน + สถานะใน REQUIREMENTS อัปเดต; FR5.2.2 email delivery เสร็จสมบูรณ์ ✅

---

### Phase 6 — SignalR & Notifications (✅ เสร็จแล้ว)

**สิ่งที่ทำเสร็จแล้ว:**
1. ✅ `builder.Services.AddSignalR();` + `app.MapHub<NotificationHub>("/hubs/notifications");` ใน Program.cs (ใช้ shared framework)
2. ✅ Hub `src/PocketWise.Api/Hubs/NotificationHub.cs` พร้อม per-user group `$"user_{userId}"` และเชื่อมต่อ JWT query string `access_token`
3. ✅ บันทึกข้อมูลลง SQL Server ตาราง `Notifications` ผ่าน `NotificationRepository` ก่อน broadcast เสมอ
4. ✅ สัญญา Event `ReceiveNotification` และ `ReceiveRefreshHint` ล็อกใน `/docs/API_SPECIFICATION.md` §6 (D37)
5. ✅ REST APIs: `GET /notifications`, `GET /notifications/unread-count`, `PUT /notifications/{id}/read`, `PUT /notifications/read-all`
6. ✅ ติดตั้ง `@microsoft/signalr` (`^10.0.11`) ใน `frontend/pocketwise-web/` (ได้รับอนุมัติ D37)
7. ✅ FE Client `src/lib/signalr.ts` + feature `src/features/notifications/` (`useNotifications`, `useSignalRNotifications`, `NotificationBell` Popover ใน `DashboardShell`)
8. ✅ Gate: Unit tests 22/22 ผ่าน, frontend build & lint ผ่าน 0 errors/warnings

---

### Phase 5.5 — Settings & Profile (FR6.3)

**requirements ที่รองรับ:** FR6.3.1–FR6.3.7 (ตั้งค่าแอป + โปรไฟล์ + ล้างข้อมูล + ยืนยันอีเมล) — วางไว้หลัง Phase 5 เพราะ UserSettings พึ่งงบ/แท็ก/สกุลเงินที่ตั้งค่าได้

1. UserSettings CRUD (Theme, CurrencyCode, Locale, EmailBudgetAlertsEnabled) — ผูก FR5.2.2 (email toggle)
2. โปรไฟล์: เปลี่ยนเบอร์/อีเมล/วันเกิด (เปลี่ยนอีเมลต้องตั้ง `IsEmailVerified=false`)
3. **ยืนยันอีเมล (FR6.3.7, D42):** รองรับการส่งลิงก์ยืนยันทางอีเมลด้วย built-in Identity token + SmtpEmailService (0 บาท ฟรี 100%), 60s cooldown, Base64Url token, หน้า `/verify-email` และปุ่มส่งซ้ำในหน้า `/settings`
4. **ล้างข้อมูลเริ่มใหม่ (FR6.3.6):** soft-delete เฉพาะ 9 finance tables ตาม D5, คง identity/settings และข้อมูลตาม D35, revoke refresh tokens ทุก session
5. **Gate:** settings/profile/reset/email-verification ผ่าน E2E และ Unit Tests (45/45 tests ผ่าน 100%)

---

### Phase 7 — Imports (สลิป + ใบแจ้งยอดบัตร, OCR ย่อยท้าย phase)

**requirements ที่รองรับ:** FR1.1–FR1.3 (สลิป/OCR), FR4.8 (จัดการรายการที่นำเข้า), ส่วนของ S2 — นำเข้าใบแจ้งยอดบัตรเครดิต (CreditCardStatements + Items, ImportType=CARD_STATEMENT)

**ขั้นตอน:**

1. ImportJobs (ตาราง 11) + SlipImportFiles (ตาราง 19) ตาม DataDictionary
2. **Duplicate detection** ตามกฎระบบ: `FileHash` / `TransactionReference` / จำนวนเงิน+เวลา — ต้อง implement ให้ครบทุกงาน import (ตอบ `DUPLICATE_TRANSACTION` ตาม API_SPECIFICATION)
3. ❓ ที่เก็บไฟล์ (local disk / Azure Blob — Tech_Stack เสนอ Blob เป็น optional 📦)
4. ❓ ข้อจำกัดไฟล์ (ขนาด/ชนิด) + quota
5. Progress/completion แจ้งผ่าน SignalR (ต้องเสร็จ Phase 6 ก่อน)
6. OCR (sub-ขั้นท้าย phase): 📦 Azure AI Document Intelligence หรือรายอื่น — **ต้องผ่านการประเมิน cost/privacy/ความแม่นภาษาไทย และผู้ใช้ยืนยันเสมอ ก่อน** เก็บผลไว้ review โดยผู้ใช้ก่อน save ตาม Tech_Stack §7

---

### Phase 8 — Hardening & Deployment

1. Integration tests: 📦 `Microsoft.AspNetCore.Mvc.Testing` (WebApplicationFactory) ยังไม่ถูกติดตั้ง → ขออนุมัติ; Playwright ฝั่ง FE (📦 เมื่อใช้)
2. Security review ตาม Tech_Stack §8 (HTTPS, rate limiting, upload guard, CSRF, audit logs, backup policy)
3. ❓ Hosting + SignalR scale-out + backup/restore drill + monitoring (Sentry ❓)
4. CI (GitHub Actions) — build + lint + test ทุก PR
5. ❓ production secrets management (User Secrets → env/secret manager)

---

### Phase 9 — Admin Operations (⬜ รอ implement)

1. **Schema/migration:** เพิ่ม fields การระงับบัญชีใน `Users`; เพิ่ม `SecurityEvents`, `Announcements`, `AnnouncementTargets`; ขยาย `ImportJobs` ด้วย retry/cancel fields และ `Cancelled` status ตาม DataDictionary/D51
2. **Authorization:** seed permissions ตาม API_SPECIFICATION §5N; backend ตรวจราย permission ไม่ใช้ role Admin เป็นเงื่อนไขอย่างเดียว; ทุก state-changing action ต้อง Audit Log
3. **Users & sessions:** สร้าง endpoints/UI `/admin/users` สำหรับค้นหา, suspension, ส่ง verification/reset link และ revoke sessions; suspension มีผลตอน refresh/login เท่านั้น
4. **Security operations:** เก็บ security event ที่ sanitize แล้ว, admin ดูแบบ pagination/filter; สร้าง cleanup job ค่า default 90 วันจาก `SecurityEvents:RetentionDays` ใน `appsettings.json`
5. **Import operations:** เพิ่ม `/admin/import-jobs` สำหรับงานทุกผู้ใช้; retry `Failed` ได้สูงสุด 5 ครั้ง, cancel เฉพาะ `Pending`/`Processing`; ห้าม admin เปิดไฟล์สลิป และ cleanup ไฟล์ใช้ `ImportFiles:RetentionDays` (default 90)
6. **System operations:** `/admin/overview` แสดง operational metrics; `/admin/system-settings` แก้ได้เฉพาะ allowlisted settings/feature flags; `appsettings.json` ยังคงเป็นแหล่ง config ของ retention, secrets และ allowlist
7. **Maintenance & announcements:** maintenance ตอบ `503` ทั้งระบบ ยกเว้น health endpoints และ `MaintenanceMode:AllowedAdminUserIds`; announcements รองรับ target แบบ union (`All`, `Role`, `User`, `UnverifiedEmail`) และช่วงเวลาแสดง
8. **Frontend & verification:** ใช้ DESIGN.md/shared UI; เพิ่ม routes, feature hooks/types/schemas และ navigation ที่ filter ตาม permission; เพิ่ม unit/integration tests สำหรับ permission, state transitions, masking, retention และ maintenance allowlist; build/lint/test ก่อนปิด phase

---

## 5. Definition of Done — ทุกงานทุก Phase

งานไม่ "เสร็จ" จนกว่าครบทั้งหมด:

- [ ] `dotnet build` ผ่าน **0 error** (backend) — และทบทวน warnings ใหม่ที่เกิดจากงานนี้
- [ ] `npm run lint` + `npm run build` ผ่าน (frontend ทุกครั้งที่แตะ FE)
- [ ] Tests ที่เกี่ยวข้องรันผ่าน (`dotnet test` / vitest เมื่อ setup)
- [ ] FE types/schemas ตรงกับ DTOs ล่าสุด (Sync with Frontend rule)
- [ ] **สถานะ FR ใน `/docs/REQUIREMENTS.md` อัปเดตแล้ว** (feature ใหม่/เปลี่ยนขอบเขต)
- [ ] **`/docs/IMPLEMENTATION_CHECKLIST.md` อัปเดตแล้ว** — ติ๊กรายการที่ implement เสร็จจริงของ phase นั้น (กติกา §11)
- [ ] เอกสาร sync: DataDictionary (ถ้า schema เปลี่ยน), API_SPECIFICATION (ถ้า endpoint/DTO เปลี่ยน), ARCHITECTURE (ถ้าเพิ่มการเชื่อมต่อเลเยอร์ใหม่), ตารางสถานะในเอกสารนี้, Appendix D (ถ้ามี decision ปิดใหม่)
- [ ] ไม่มี secret/คีย์จริง เหลือใน repo
- [ ] Decision Points ที่พบระหว่างทาง — **แก้ด้วยการถาม ไม่ใช่การเดา**

---

## Appendix A — สถานะแพ็กเกจปัจจุบัน (as of Phase 2–3 setup)

**Backend (เวอร์ชันร่วมกัน 10.0.13 ยกเว้น OpenApi):**

- `PocketWise.Api`: `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.13, `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 10.0.13, `Microsoft.AspNetCore.OpenApi` 10.0.8, `Microsoft.EntityFrameworkCore.Design` 10.0.13 (PrivateAssets)
- `PocketWise.Domain`: `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 10.0.13
- `PocketWise.Infrastructure`: `Microsoft.EntityFrameworkCore.SqlServer` 10.0.13, `Microsoft.EntityFrameworkCore.Design` 10.0.13 (PrivateAssets), `Microsoft.EntityFrameworkCore.Tools` 10.0.13 (PrivateAssets)
- tests ทั้งสอง: `xunit` 2.9.3, `xunit.runner.visualstudio` 3.1.4, `Microsoft.NET.Test.Sdk` 17.14.1, `coverlet.collector` 6.0.4
- Local tool: `dotnet-ef` 10.0.13 (`backend/dotnet-tools.json`)
- ⚠️ NU1902/NU1903 warnings ณ ตอนติดตั้ง (dependency ทางอ้อม: `Microsoft.OpenApi` 2.0.0, `System.Security.Cryptography.Pkcs` 9.0.11) — ทบทวนก่อน Phase 8

**Frontend (`frontend/pocketwise-web/package.json`):**

- `next` 16.4.2, `react`/`react-dom` 19.3.0, `typescript` ^5, `tailwindcss` ^4 + `@tailwindcss/postcss` 4.3.3 (configured in `postcss.config.mjs`), `eslint` ^9 (+ `eslint-config-next` 16.4.2)
- เพิ่มแล้ว (Phase 4 FE, อนุมัติแล้ว): `zod`, `react-hook-form`, `@tanstack/react-query`, `lucide-react`, `sonner`, `@radix-ui/react-alert-dialog`
- เพิ่มแล้ว (Phase 5, D29 อนุมัติ): `recharts` ^3.10.1 (runtime dependency สำหรับ responsive report charts; แสดงยอดแยกตาม currency)
- เพิ่มแล้ว (UI components): `shadcn` CLI ^4.22.1 (devDependency), `radix-ui` ^1.8.1, `class-variance-authority` ^0.7.1, `tw-animate-css` ^1.4.0; ใช้ source components ที่ `src/components/ui/` และ config ที่ `components.json`
- shadcn primitives ที่มี: Input, Select, Button, AlertDialog; ใช้ `npx shadcn add <component>` จาก `frontend/pocketwise-web/` เพื่อเพิ่ม source primitive แล้วปรับ theme ให้ตรง `DESIGN.md` ก่อนใช้
- `cn` package ที่ shadcn preset เคยเพิ่มถูกถอดออก เพราะโปรเจกต์ใช้ local helper `cn` จาก `src/lib/utils.ts`; ยังไม่มี `@microsoft/signalr` และต้องขออนุมัติก่อนติดตั้ง

---

**Database & Developer Tools (อนุมัติแล้ว):**
- `Devart MCP Server for SQL Server` 1.1.0 — ใช้งานผ่าน stdio transport (`Connection: PocketWise`, `DSN: PocketWiseDb`) โดยตั้งค่าใน `~/.gemini/config/mcp_config.json` สำหรับตรวจสอบ schema, ข้อมูล และทดสอบ query

---

## Appendix B — คำสั่งที่ใช้บ่อย

```bash
# Backend
dotnet build backend/PocketWise.sln                       # Gate หลัก
dotnet test backend/PocketWise.sln                        # tests
cd backend && dotnet tool restore                         # restore dotnet-ef

# EF Core (จาก backend/)
dotnet ef migrations add <Name> --project src/PocketWise.Infrastructure --startup-project src/PocketWise.Api --output-dir Migrations
dotnet ef database update --project src/PocketWise.Infrastructure --startup-project src/PocketWise.Api
dotnet ef migrations script --project src/PocketWise.Infrastructure --startup-project src/PocketWise.Api   # สร้าง SQL script (ตรวจก่อนใช้ deploy)

# Frontend (จาก frontend/pocketwise-web/)
npm run dev          # dev server
npm run lint         # ESLint
npm run build        # Next build (มี type-check ด้วย)

# shadcn/ui (จาก frontend/pocketwise-web/)
npx shadcn add <component>  # เพิ่ม source primitive; ตรวจ theme/aliases ก่อน commit

# Secrets (จาก backend/ — แนะนำเก็บ connection string ที่มี password ที่นี่)
dotnet user-secrets init --project src/PocketWise.Api
dotnet user-secrets set "ConnectionStrings:Default" "..." --project src/PocketWise.Api
```

---

## Appendix C — ความไม่สอดคล้อง/ข้อควรระวังที่พบใน repo (ยังไม่แก้ — แจ้งผู้ใช้ก่อนเป็นดี)

1. ~~**URL ไม่ตรงกัน:** `.env.example` (FE) ชี้ API ที่ `https://localhost:7000` แต่ backend `launchSettings.json` รันที่ `https://localhost:7023`~~ → **แก้แล้ว ✅** `.env.example` ตรงกับ launchSettings ที่ `7023` แล้ว — เปลี่ยน port อนาคตให้ sync ทั้งสองไฟล์เสมอ
2. **`GEMINI.md` (root) คือสำเนาของ `/AGENTS.md`** — ทุกครั้งที่แก้ root AGENTS.md ต้องสำเนาไปทับ ไม่งั้น AI tool ที่อ่าน GEMINI.md จะทำงานตามกฎเก่า
3. ~~**Auth strategy ขัดกันระหว่างเอกสาร** (Tech_Stack §11 vs DataDictionary)~~ → **ปิดแล้ว ✅: ใช้ JWT Bearer + Refresh Token (D1)** — Tech_Stack §11 ถูกแทนด้วย pointer ไปที่ Decision Ledger แล้ว (ผลของการยุบซ้ำ — ดู Appendix C ของ playbook นี้เอง)
4. **Version policy:** EF Core ใช้ 10.0.13 คู่ .NET 10 — ก่อน upgrade .NET SDK ให้ re-check EF Core/ASP.NET compatibility ทุกครั้ง (ไม่ผสม major ที่ไม่ fit)
5. **SignalR:** server มาในแพ็กเกจแล้ว — อย่าเผลอติดตั้งซ้ำฝั่ง backend; ปัญหาเกิดที่ FE (`@microsoft/signalr`) ซึ่งต้องขออนุมัติก่อนติดตั้ง

---

## Appendix D — Decision Ledger (ถาม → ตอบ → ล็อก)

> ทุกการตัดสินใจที่ผู้ใช้ยืนยัน ให้บันทึกไว้ที่นี่เพื่อป้องกันถามซ้ำ และ AI ตัวถัดไปไม่ต้องตัดสินใหม่

| # | Decision | คำตอบ | ยืนยันโดย | สถานะ |
|:-:|---|---|---|:---:|
| D1 | Auth strategy (Tech_Stack §11) | JWT Bearer + Refresh Token (hash SHA-256, rotation, multi-device) ตาม DataDictionary กฎ 46–50 | เจ้าของโปรเจค | ✅ ล็อก |
| D2 | ชื่อไฟล์ playbook + ภาษา | `docs/DEVELOPMENT_GUIDELINE.md`, ภาษาไทย + identifiers อังกฤษ | เจ้าของโปรเจค | ✅ ล็อก |
| D3 | ขอบเขตของ playbook | Playbook ต่อ Phase (เชิงปฏิบัติ) — มาตรฐานที่ยังไม่ได้กำหนดอยู่ที่ Decision Points ต่าง ๆ | เจ้าของโปรเจค | ✅ ล็อก |
| D4 | SQL Server + database | รันที่ localhost, database ชื่อ `PocketWiseDb` (credential จริงถ้ามี → user-secrets) | เจ้าของโปรเจค | ✅ ล็อก |
| D5 | ขอบเขต soft delete | **เฉพาะตารางกลุ่มการเงิน**: Transactions, BankAccounts, CreditCards, Budgets, RecurringTransactions, InstallmentPlans, TransferGroups, CreditCardStatements, CreditCardStatementItems → `IsDeleted` + global query filter / ตารางอื่น hard delete ปกติ | เจ้าของโปรเจค | ✅ ล็อก |
| D6 | `UserRefreshTokens` ใน migration แรก | รวมใน migration `InitialCreate` เลย — Phase 2 ต้องสร้าง entity + config ของตารางนี้ควบคู่ตารางอื่น | เจ้าของโปรเจค | ✅ ล็อก |
| D7 | `.env.example` API base URL | ใช้ `https://localhost:7023` ตาม launchSettings (แก้แล้ว) | เจ้าของโปรเจค | ✅ ล็อก |
| D8 | API response envelope | **แบบ Wrapped ทุก endpoint**: success `{ success: true, data }` — error `{ success: false, error: { code, message, traceId } }` — มี middleware ครอบ error ตั้งแต่ controller แรก | เจ้าของโปรเจค | ✅ ล็อก |
| D9 | Requirement source นอกชีต | Requirement เริ่มต้น = Google Sheets "ระบบบันทึกรายรับรายจ่าย" (2 แผ่น) → แปลงเป็น `/docs/REQUIREMENTS.md` (structured FR + status) — ชีตต้นทางคือ **requirement source**, ไฟล์ REQUIREMENTS.md คือ **structured record + status tracking**; เพิ่ม/แก้ FR หลังนี้ต้องมาจากเจ้าของโปรเจคเสมอ | เจ้าของโปรเจค | ✅ ล็อก |
| D10 | เอกสารสถาปัตยกรรม/สัญญา API | สร้าง `/docs/ARCHITECTURE.md` (architecture of record — กันสร้าง architecture คนละแบบ) และ `/docs/API_SPECIFICATION.md` (สัญญา FE↔BE ก่อนพัฒนา) — REST ใช้ **Swagger/OpenAPI เป็น spec หลัก** (ไฟล์ md สรุป + ชี้ OpenAPI), SignalR จัดรายละเอียดแยกในลำดับถัดไป | เจ้าของโปรเจค | ✅ ล็อก |
| D11 | API spec decisions (5 ข้อ) | ① versioning = **path segment** `/api/v1/...` ② pagination = **`page/pageSize`** + data `{ items, page, pageSize, totalItems, totalPages }` ③ error codes = **ชุด 12 UPPER_SNAKE** (VALIDATION_ERROR, UNAUTHORIZED, TOKEN_EXPIRED, INVALID_REFRESH_TOKEN, INVALID_CREDENTIALS, FORBIDDEN, NOT_FOUND, CONFLICT, DUPLICATE_TRANSACTION, TAG_LIMIT_REACHED, RATE_LIMITED, INTERNAL_ERROR) ④ status = **เข้ม REST-style** (200/201/204/401/403/404/409/422/429/500) + envelope ประกอบ ⑤ SignalR = **section เปิด ล็อกตอน Phase 6 เริ่ม** | เจ้าของโปรเจค | ✅ ล็อก |
| D12 | Schema scope ต่อ FR (audit 12/2026) | ~~เดิมล็อก "สร้างเฉพาะ 20/25 ตาราง, ยกเว้น RBAC 5 ตาราง + AuditLogs"~~ → **ถูกยกเลิกและแทนที่ด้วย D13** (เจ้าของโปรเจคสั่งเพิ่ม FR7/F8 แล้วสร้างครบ 25 ตาราง) | เจ้าของโปรเจค | ⛔ ยกเลิก (ใช้ D13) |
| D13 | ขยายขอบเขตครบ 25 ตาราง | เจ้าของโปรเจคเพิ่ม **F7 (RBAC: Roles/Permissions/UserRoles/RolePermissions)** + **F8 (AuditLogs)** ใน REQUIREMENTS.md → Phase 2 สร้าง Entities **ครบ 25 ตาราง** รวมทั้ง 5 ตารางนั้น (เดิม D12 ยกเว้น) — ขอบเขต entity ตาม FR F1–F8 (REQUIREMENTS.md เป็นหลัก) | เจ้าของโปรเจค | ✅ ล็อก |
| D14 | Phase 2 cascade delete policy | Cascade ใช้เฉพาะ: `UserSettings`/`UserRefreshTokens`/`Notifications`/`TransactionTags`/`CreditCardStatementItems`/`SlipImportFiles`↔`ImportJobs`; financial entities + `Users` ใช้ Restrict/SetNull; ไม่ cascade ลบข้อมูลการเงินเมื่อลบ user | เจ้าของโปรเจค | ✅ ล็อก |
| D15 | Phase 3 Identity strategy | `ApplicationUser : IdentityUser<long>` + `ApplicationRole : IdentityRole<long>`; ตารางยังชื่อ `Users`/`Roles`; access token 60 นาที / refresh token 30 วัน | เจ้าของโปรเจค | ✅ ล็อก |
| D16 | Phase 3 JWT secret storage | ย้าย JWT secret จาก `appsettings.Development.json` ไป user-secrets ก่อน production (ยังไม่ทำ — ทำก่อน Phase 8) | เจ้าของโปรเจค | 🟡 รอ Phase 8 |
| D17 | Phase 4 filter params | list transactions ใช้ `categoryId`/`tagId`/`bankAccountId`/`type`/`fromDate`/`toDate`/`q` | เจ้าของโปรเจค | ✅ ล็อก |
| D18 | Phase 4 CategoryType | เพิ่ม enum `CategoryType` (Income/Expense/Both) ตาม DataDictionary แทน `TransactionType` | เจ้าของโปรเจค | ✅ ล็อก |
| D19 | Phase 4 transfer flow | สร้าง TransferGroup → auto สร้าง 2 transactions (โอนออก/โอนเข้า) ผูก `transferGroupId` | เจ้าของโปรเจค | ✅ ล็อก |
| D20 | Phase 4 credit card scope | Transaction create/update รับ `creditCardId` (nullable) ได้เลย (CreditCard CRUD ยังเป็น Phase 5) | เจ้าของโปรเจค | ✅ ล็อก |
| D21 | FE CORS | backend เพิ่ม `AddCors` (AllowCredentials + origin `http://localhost:3000`) | เจ้าของโปรเจค | ✅ ล็อก |
| D22 | FE token storage | ใช้ **httpOnly cookie** ผ่าน Next.js API route (BFF) — access/refresh เก็บ cookie ฝั่ง server, FE ไม่แตะ token โดยตรง | เจ้าของโปรเจค | ✅ ล็อก |
| D23 | FE packages | ติดตั้ง `zod` + `react-hook-form` + `@tanstack/react-query` + `lucide-react` (ชุดเต็ม) | เจ้าของโปรเจค | ✅ ล็อก |
| D24 | FE feedback pattern | Toast (`sonner`) = แจ้งผลเท่านั้น; AlertDialog (`@radix-ui/react-alert-dialog`) = ยืนยันการกระทำสำคัญ/กลับไม่ได้ — ห้าม `alert()`/`confirm()`/`window.location.reload()` | เจ้าของโปรเจค | ✅ ล็อก |
| D25 | FE data table standard | ใช้ shadcn/ui ที่ยึด `DESIGN.md` + TanStack Table เป็น engine และ reusable table กลาง; รองรับ states/responsive/a11y, ใช้ server-side operations เมื่อ API จัดการ query หรือข้อมูลมีจำนวนมาก; TanStack Table ยังไม่ติดตั้งและต้องขออนุมัติก่อนเพิ่ม dependency | เจ้าของโปรเจค | ✅ ล็อก |
| D26 | Phase 5 recurring กลไกสร้างรายการ | ใช้ **Background job แบบ HostedService (built-in ASP.NET Core `BackgroundService` — ไม่ติดตั้ง package)** วนตรวจและสร้างรายการที่ถึงกำหนด | เจ้าของโปรเจค | ✅ ล็อก |
| D27 | Phase 5 budget threshold semantics | แจ้งเตือน**ครั้งเดียวต่อรอบ**ตอนข้าม `AlertThresholdPercent` (80%) และอีกครั้งตอนเกิน 100% — บันทึกลงตาราง `Notifications` (channel `InApp`) | เจ้าของโปรเจค | ✅ ล็อก |
| D28 | Phase 5 email แจ้งเตือนงบ | **ส่งอีเมลแจ้งเตือนงบ (FR5.2.2)** ผ่าน built-in `System.Net.Mail` SMTP (`SmtpEmailService`) ไม่ต้องติดตั้ง external NuGet package; มี dev mock logger mode เมื่อ host ว่าง, เคารพ `EmailBudgetAlertsEnabled` ของ UserSettings, ป้องกัน duplicate ต่อรอบ, และบันทึก `NotificationChannel.Email` | เจ้าของโปรเจค | ✅ ล็อก |
| D29 | Phase 5 chart lib ฝั่ง FE | ติดตั้ง `recharts` ฝั่ง frontend (อนุมัติแล้ว) — ใช้ทำกราฟ reports | เจ้าของโปรเจค | ✅ ล็อก |
| D30 | Phase 5 วิธีการส่งมอบ | **แบ่งเป็นชุดย่อยตรวจเป็นระยะ** (Budgets → CreditCards → Recurring → จัดหมวดอัตโนมัติ → Reports) แทน backend ทั้งหมดแล้วค่อย FE | เจ้าของโปรเจค | ✅ ล็อก |
| D31 | Phase 5 CategoryRules ที่มา | **ทั้งสองแบบ**: ผู้ใช้ตั้งกฎเอง (CategoryRules CRUD) + ระบบ auto-learn จากประวัติ (เมื่อผู้ใช้เลือกหมวดให้รายการที่มี description → บันทึกกฎ Description→Category ให้อัตโนมัติ) | เจ้าของโปรเจค | ✅ ล็อก |
| D32 | Phase 5 Merchants ข้อมูล | **มี CRUD ให้เพิ่มเองได้ตอนนี้ แต่ไม่ seed ข้อมูล** — เหลือตารางว่าง รอ Phase 7 import/OCR มาเติม | เจ้าของโปรเจค | ✅ ล็อก |
| D33 | Phase 5 จังหวะจัดหมวดอัตโนมัติ | **ทั้ง auto-apply ตอนสร้าง transaction (เฉพาะเมื่อ user ไม่ได้เลือก category) + endpoint แยก** สำหรับ query หมวดที่แนะนำ | เจ้าของโปรเจค | ✅ ล็อก |
| D34 | Phase 5 Reports calendar | Weekly period เริ่มวันอาทิตย์; calendar dates ใช้ Asia/Bangkok และ API รับ UTC boundaries | เจ้าของโปรเจค | ✅ ล็อก |
| D35 | Phase 5.5 profile, settings และ reset | Settings API จัดการ Theme/CurrencyCode/Locale/EmailBudgetAlertsEnabled; เปลี่ยนอีเมลตั้ง `IsEmailVerified=false` โดยยังไม่มี verification flow; reset soft-delete เฉพาะ 9 finance tables ตาม D5, คง identity/settings/categories/tags/rules/notifications/import history/audit logs และ revoke refresh tokens ทุก session | เจ้าของโปรเจค | ✅ ล็อก |
| D36 | Reports default date range | หน้า Reports ตั้งค่าเริ่มต้นตั้งแต่วันที่ 1 มกราคมถึง 31 ธันวาคมของปีปัจจุบัน (Asia/Bangkok) | เจ้าของโปรเจค | ✅ ล็อก |
| D37 | Phase 6 SignalR & Notifications contract & package | ติดตั้ง `@microsoft/signalr` (^10.0.11) ฝั่ง FE (อนุมัติแล้ว); สัญญา Event กลาง `ReceiveNotification` (Payload `NotificationResponse`) + `ReceiveRefreshHint`; Auth query `?access_token=...` ผ่าน BFF `/api/auth/token`; จัดการ per-user group `$"user_{userId}"` ฝั่ง server; REST endpoints 4 endpoints + NotificationBell popover บน DashboardShell | เจ้าของโปรเจค | ✅ ล็อก |
| D39 | Database Inspection via Devart MCP Server | ใช้ Devart MCP Server for SQL Server (v1.1.0, Connection: PocketWise, DSN: PocketWiseDb, Stdio transport) สำหรับการตรวจสอบ Schema, Seed Data, และ Query ผลลัพธ์ใน SQL Server แทนการเขียนคำสั่งเฉพาะกิจ โดยห้ามรันคำสั่ง DDL นอกเหนือจาก EF Core Migrations | เจ้าของโปรเจค | ✅ ล็อก |
| D38 | Phase 7 File Storage, Limits, Formats & Slip OCR | ที่เก็บไฟล์: Local Disk Storage ผ่าน `IFileStorageService` (`App_Data/uploads/`) นอก public web root; ข้อจำกัด: สลิปไม่เกิน 10 MB (.jpg, .jpeg, .png, .webp, .pdf), ใบแจ้งยอดรองรับทั้ง CSV และ JSON; Slip OCR: Local Offline OCR ผ่าน `Tesseract` 5.2.0 (`TesseractSlipOcrService`) พร้อมโมเดลภาษา `tessdata/{tha,eng}.traineddata` อ่านยอดเงิน/วันที่ (แปลง พ.ศ.->ค.ศ.)/รหัสอ้างอิง/ผู้รับ/ผู้โอน/ธนาคาร และมี UI Review & Confirm ก่อนบันทึก | เจ้าของโปรเจค | ✅ ล็อก |
| D40 | Email Verification Feature (FR6.3.7) Planning | วางแผน FR6.3.7 และสัญญา API ใน REQUIREMENTS.md และ API_SPECIFICATION.md | เจ้าของโปรเจค | ✅ ล็อก |
| D41 | System Categories Seeding & Admin Role & Permission Management | Seeding อัตโนมัติเมื่อ API สตาร์ท (`DatabaseSeeder.cs`): หมวดหมู่มาตรฐานระบบ 12 หมวดหมู่ (`IsSystem = 1`), สิทธิ์มาตรฐาน 15 รายการ (6 โมดูล), บทบาทเริ่มต้น (`Admin`, `Member`), และมอบหมาย `Admin` ให้กับบัญชีผู้ใช้เดิมทั้งหมด; พัฒนา Backend Admin Management endpoints (`/api/v1/admin/roles`, `/permissions`, `/users`) พร้อม Frontend หน้า `/admin/permissions` รองรับ 3 แท็บ: Permission Matrix, Role Management (CRUD), User Role Assignment; ป้องกัน route ใน `proxy.ts` และแสดงเมนูใน `DashboardShell` เฉพาะผู้ใช้ที่มีสิทธิ์ Admin | เจ้าของโปรเจค | ✅ ล็อก |
| D42 | Free Zero-Cost Built-in Email Verification Implementation (FR6.3.7) | พัฒนาระบบยืนยันอีเมลตามเงื่อนไขฟรี 100% (0 บาท, ไม่มีค่าบริการเสริม, ไม่เพิ่ม package ใหม่): ใช้ built-in ASP.NET Core Identity Token Provider (`GenerateEmailConfirmationTokenAsync` / `ConfirmEmailAsync`), ส่งอีเมลผ่าน `SmtpEmailService` (Gmail SMTP ฟรี หรือ Development Console logging), เข้ารหัส token ด้วย Base64Url ปลอดภัยสำหรับ URL, ป้องกัน spam ด้วย cooldown 60 วินาทีต่อผู้ใช้, พัฒนา Frontend หน้า `/verify-email` พร้อม fallback Suspense และเชื่อมโยงปุ่มส่งลิงก์ยืนยันในหน้า `/settings` พร้อมตัวนับ cooldown และ unit tests ครบ 100% (45/45 tests ผ่าน) | เจ้าของโปรเจค | ✅ ล็อก |
| D43 | Slip vs. Credit Card Expense Overview (FR6.1.2) | สรุปภาพรวมรายจ่ายสลิปและบัตรเครดิต: เพิ่ม `TotalSlipExpense` และ `TotalCreditCardExpense` ใน `ReportCurrencySummary`, เพิ่ม `TransactionCount` ใน breakdown; ขยาย filter params `creditCardId` และ `sourceType` ใน `TransactionFilter` และ `TransactionRepository`; พัฒนา Frontend `ReportsView` เพิ่มการเปรียบเทียบสัดส่วน %, สถิติจำนวนรายการ, breakdown รายบัตรเครดิต และปุ่ม navigation ไปยังหน้ารายการที่กรองแหล่งที่มาหรือหน้าบัตรเครดิต | เจ้าของโปรเจค | ✅ ล็อก |
| D44 | Forgot Password & Password Reset via Email Flow (FR6.3.8) | พัฒนาระบบขอรีเซ็ตรหัสผ่านทางอีเมล: ฟรี 100% ผ่าน ASP.NET Core Identity Token Provider + `SmtpEmailService`, Base64Url token, 60s cooldown, Anti-Email Enumeration, Session Revocation (`RevokeAllForUserAsync`) และ Audit Log บันทึกเหตุการณ์; Frontend หน้า `/forgot-password`, `/reset-password` | เจ้าของโปรเจค | ✅ ล็อก |
| D45 | Automated Maintenance Background Jobs & Admin Setup (FR8.3, F8) | ระบบบำรุงรักษาและล้างข้อมูลเก่าอัตโนมัติ: `AuditLogCleanupService` รันทุกวันเวลา 02:00 UTC (ลบข้อมูลเก่าตาม retention วันที่กำหนดใน SystemSettings หรือ default 365 วัน), `RefreshTokenCleanupService` รันทุกวันอาทิตย์เวลา 03:00 UTC (ล้าง token ที่หมดอายุ/ถูกยกเลิก), หน้าต่าง Admin Setup `AuditLogSettingsModal` พร้อมตาราง `SystemSettings` | เจ้าของโปรเจค | ✅ ล็อก |
| D46 | UI Motion & Animation Integration | ติดตั้งและใช้งาน library `motion` (`motion/react` v14.5.0) ฝั่ง Frontend สร้าง components: `AnimatedList` (staggered entry), `AnimatedNumber` (spring counter), `PageTransition` (route change transition), Button micro-interactions (`hover:scale-102 active:scale-98`), Card micro-interactions (`hover:-translate-y-0.5 hover:shadow-md`) ทั่วทั้ง 15+ views | เจ้าของโปรเจค | ✅ ล็อก |
| D47 | Standardized Unified Loading & Skeleton System | สร้างมาตรฐาน Skeleton Shimmer แทนที่การแสดง `<p>กำลังโหลด...</p>` และ lone spinners: สร้าง primitive `src/components/ui/skeleton.tsx` และ reusable presets ใน `src/components/shared/Skeletons.tsx` (`ListRowsSkeleton`, `CardGridSkeleton`, `TransactionCardsSkeleton`, `TransactionPageSkeleton`, `ReportPageSkeleton`, `TableSkeleton`, `NotificationSkeleton`) พร้อม `@keyframes pw-shimmer` ใน `globals.css` ครอบคลุมทั้ง Light และ Dark Mode ทั้ง 32 routes | เจ้าของโปรเจค | ✅ ล็อก |
| D48 | Smooth Modal & BottomSheet Transitions | แก้ไขปัญหาจังหวะปิด Modal/BottomSheet สะดุดหรือค้าง (hanging glitch): กำหนด keyframes `pw-fade-in`, `pw-fade-out`, `pw-sheet-slide-in`, `pw-sheet-slide-out`, `pw-modal-in`, `pw-modal-out` โดยทั้ง Overlay และ Content ใช้เวลาปิด 180ms ซิงค์กันพอดี พร้อม `pointer-events: none` ในจังหวะ closed ป้องกันคลิกซ้ำ | เจ้าของโปรเจค | ✅ ล็อก |
| D49 | Ambient Background & BottomSheet Responsive Button Layout | เพิ่มภาพพื้นหลัง Ambient (`/bg-dark.jpg` opacity 0.15 + radial blur, `/bg-light.jpg` opacity 0.75); จัดระเบียบปุ่มใน BottomSheet บน Mobile ให้ปุ่มยืนยันอยู่ด้านบนและปุ่มยกเลิกอยู่ด้านล่าง ตรงตามมาตรฐานหน้ารายการธุรกรรม | เจ้าของโปรเจค | ✅ ล็อก |
| D50 | Database Provider Migration: MS SQL Server -> PostgreSQL | ย้ายฐานข้อมูลจาก MS SQL Server ไปยัง PostgreSQL เพื่อรองรับการ Deploy บนบริการฟรี (Supabase) สำหรับใช้งานกับเพื่อนไม่เกิน 10 คน: เปลี่ยน provider เป็น `Npgsql.EntityFrameworkCore.PostgreSQL` (10.0.0), ปรับ DbContext/EntityConfigurations ใช้ types ที่เข้ากันได้ (`timestamptz`, `smallint`, `text`, `NOW()`), รองรับ Local Docker container `pocketwise-postgres` (`postgres:16-alpine`, port 5432) และ Migration แรก `InitialPostgres` ผ่านการสร้างตารางและ Seed ข้อมูลครบ 100% | เจ้าของโปรเจค | ✅ ล็อก |
| D51 | Admin Operations scope, policy & schema | เพิ่ม F9/Phase 9: (1) suspension ตรวจตอน refresh/login ไม่ revoke access token, (2) admin ส่งได้เฉพาะ password-reset link, (3) SecurityEvents retention 90 วันผ่าน `SecurityEvents:RetentionDays`, (4) import retry สูงสุด 5, cancel เฉพาะ Pending/Processing, file retention 90 วันผ่าน `ImportFiles:RetentionDays` และไฟล์สลิปดูได้เฉพาะเจ้าของ, (5) maintenance ล็อกระบบ ยกเว้น allowlisted admin ใน `MaintenanceMode:AllowedAdminUserIds`, (6) announcements กำหนด target แบบ union: User/Role/All/UnverifiedEmail + schedule, (7) schema เพิ่ม Users suspension fields, SecurityEvents, Announcements, AnnouncementTargets และ ImportJobs retry/cancel fields | เจ้าของโปรเจค | ✅ ล็อก |

**คำถาม open รวมที่ต้องรอการตัดสินใจ (ตาม Phase):**

- Phase 3: ~~relation ของ `Users` กับ `IdentityUser`, อายุ token จริง~~ ✅ ล็อกเป็น D15 (ชื่อ auth routes + envelope + versioning ✓ D11 — ดู API_SPECIFICATION §5)
- Phase 4: ~~filter params ของ list endpoints~~ ✅ ล็อกเป็น D17; FE query/filter/sort และ E2E ตรวจแล้ว
- Phase 5: ~~threshold semantics~~ ✅ D27, ~~chart lib~~ ✅ D29 (recharts), ~~recurring กลไก~~ ✅ D26 (HostedService), ~~email provider~~ ✅ D28 (เลื่อนไปทีหลัง), ~~จัดหมวดอัตโนมัติ~~ ✅ D31–D33, ~~Reports calendar~~ ✅ D34, ~~default date range~~ ✅ D36
- Phase 5.5: ~~ขอบเขตล้างข้อมูลเริ่มใหม่ (FR6.3.6), เปลี่ยนอีเมลต้องยืนยันใหม่ไหม~~ ✅ D35
- Phase 6: ~~hub event contract, package, rest endpoints~~ ✅ D37; scale-out (เลื่อน Phase 8)
- Phase 7: ~~file storage, ข้อจำกัดไฟล์, OCR provider~~ ✅ ล็อกเป็น D38
- Phase 8: hosting, backup policy, CI แบบไหน, monitoring
- Phase 9: ✅ ขอบเขตและ policy ของ Admin Operations ล็อกแล้วเป็น D51; รอ implement ตาม FR9/API §5N/DataDictionary
- Schema เพิ่มในอนาคต — เริ่มจาก **เพิ่ม FR ใน REQUIREMENTS.md** ก่อน แล้วขยาย DataDictionary + Entities ตาม (กระบวนการเดียวกับกติกา §8)

---

*เอกสารนี้ควบคุมโดยเจ้าของโปรเจค สถานะ Phase และ Decision Ledger ต้องเป็นความจริงปัจจุบันเสมอ ห้ามให้ AI แก้สถานะโดยไม่มีงานจริงหรือคำตอบจริงรองรับ*
