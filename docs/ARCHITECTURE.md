# PocketWise — ARCHITECTURE.md (สถาปัตยกรรมระบบและการเชื่อมต่อแต่ละส่วน)

> **สำคัญสำหรับ AI Assistant:** เอกสารนี้คือ **สถาปัตยกรรมที่ล็อกแล้ว (Architecture of Record)** ของ PocketWise — เมื่อสร้างโค้ดใหม่ทุก Feature ต้องวางตามแผนผังและกฎเลเยอร์ที่นี่ **เพื่อกันสร้าง Architecture คนละแบบในแต่ละ Feature** หากงานที่ได้รับมอบต้องใช้เลเยอร์หรือการเชื่อมต่อที่ไม่มีในเอกสารนี้ — **ห้ามประดิษฐ์ ให้ถามเจ้าของโปรเจคก่อน (Master Rule #2)**
> ต้องอ่านคู่กับ `/AGENTS.md` (กฎเหล็ก), `/docs/DEVELOPMENT_GUIDELINE.md` (Playbook + Decision Ledger), `/docs/DataDictionary.md` (Schema)

---

## 1. ภาพรวมระบบ (System Overview)

```text
                        ┌──────────────────────────────┐
                        │           Browser            │
                        │  Next.js App (frontend/      │
                        │  pocketwise-web)             │
                        │  React 19 + Tailwind 4       │
                        └──────────┬───────────────────┘
                 REST + JSON (HTTPS)│          SignalR over WebSocket
                                    │         (แจ้งเตือน/สถานะ import)
                    ┌───────────────▼──────────────────────────────┐
                    │  ASP.NET Core Web API                        │
                    │  [backend/src/PocketWise.Api]                │
                    │  ─ Controllers (thin)                        │
                    │  ─ Hubs (NotificationHub -Phase 6)           │
                    │  ─ Middleware (envelope/error - D8)          │
                    │  ─ Authentication/ (JWT validate, D1)        │
                    │  ─ Configuration/ (DI wiring)                │
                    └───────────────┬──────────────────────────────┘
                                    │ (เรียก Use cases / สร้างโดเมนกรรม)
                    ┌───────────────▼──────────────────────────────┐
                    │  PocketWise.Application                      │
                    │  ─ Features/<feature>/ (Commands/Queries)    │
                    │  ─ DTOs / Validators / Interfaces            │
                    └───────────────┬──────────────────────────────┘
                                    │ (อ้างถึงโดยไม่มี dependency กลับ)
                    ┌───────────────▼──────────────────────────────┐
                    │  PocketWise.Domain (แกนกลาง — ไม่มี dep ภายนอก)│
                    │  ─ Entities / ValueObjects / Enums / Rules   │
                    └──────────────────────────────────────────────┘
                                    ▲
                    ┌───────────────┴──────────────────────────────┐
                    │  PocketWise.Infrastructure                   │
                    │  ─ Persistence (PocketWiseDbContext)         │
                    │  ─ Configurations (EF Fluent API)            │
                    │  ─ Migrations / Repositories / Services      │
                    └───────────────┬──────────────────────────────┘
                                    │ EF Core (Npgsql provider)
                        ┌───────────▼───────────────────┐
                        │  PostgreSQL (Local Docker /   │
                        │  database: pocketwise_db)     │
                        │  Production: Supabase (D50)   │
                        └───────────────────────────────┘
```

**หลักที่ล็อกแล้ว (จาก AGENTS.md / decisions):**

- Frontend **ห้าม**ติดต่อ PostgreSQL โดยตรง — ทุก data access ผ่าน Web API เสมอ
- SignalR มีไว้**เฉพาะ server-pushed events** — ห้ามใช้แทน REST หรือฐานข้อมูล
- Backend เป็น Single Source of Truth ของ business logic, validation และ data contracts
- Requirement ของฟีเจอร์ทุกชิ้นต้องมาจาก `/docs/REQUIREMENTS.md` (มี FR id รองรับ)

---

## 2. Dependency Direction (ทิศทางการอ้างอิง — ห้ามละเมิด)

```text
PocketWise.Api ──► PocketWise.Application ──► PocketWise.Domain
       │                                              ▲
       └──► PocketWise.Infrastructure ────────────────┘
             (Application → Domain เท่านั้น; Infrastructure → Application + Domain;
              ไม่มีเลเยอร์ใดชี้กลับ Domain → ทุก flow ห้าม import จากเลเยอร์สูงกว่า)
```

**กฎตาก (จาก csproj จริง + backend/AGENTS.md):**

| Project | อ้างอิงได้ (ProjectReference) | ห้ามอ้างอิง | เหตุผล |
|---|---|---|---|
| `PocketWise.Domain` | — (ไม่มี dep) | ทุกอย่าง | แกนกลาง — ต้องสร้างได้โดยไม่มี EF/HTTP/SignalR |
| `PocketWise.Application` | Domain | Infrastructure, Api | Use cases ไม่รู้ว่า persistence ทำอย่างไร — รู้แค่ interface |
| `PocketWise.Infrastructure` | Application, Domain | Api | ตามรูปแบบ Clean Architecture; อย่าให้ Infrastructure wire กับ Controllers |
| `PocketWise.Api` | Application, Infrastructure | — | Composition root — ลงทะเบียน DI ทุกอย่างแล้ว map endpoint |

**ในเชิงโค้ด (เพราะ csproj ใช้ ProjectReference ตรงตามนี้):**

- สร้าง Entity / Enum / VO / Rule ใหม่ → `Domain`
- เขียน Use case, DTO, Validator, Repository interface → `Application`
- Implements EF / Repository / external services → `Infrastructure`
- เพิ่ม Endpoint / Hub / Middleware / token validation → `Api` — **Controllers ต้องเบา (thin), orchestration อยู่ใน Application เสมอ**

---

## 3. เส้นทาง Request (Request Lifecycle) — end-to-end flow

```text
Browser
   │ 1. HTTP request (JSON) + Authorization: Bearer <access-token>
   ▼
PocketWise.Api
   │ 2. Middleware pipeline: (envelope/error handling - D8) → Authentication (JWT validate)
   │ 3. Authorization: [Authorize] + per-user ownership check ที่ repository/query
   ▼
Controller (thin) ──► Application service / Command-Query (Features/<feature>/)
   │ 4. Use case: validation (Validators) → โดเมนกรรม (Domain) ผ่าน interfaces
   │ 5. Persistence: ผ่าน I<TransactionRepository> / DbContext ที่ Infrastructure implement
   ▼
SQL Server (PocketWiseDb)
   │ 6. ข้อมูลที่เก็บ: entity mapping ตาม DataDictionary (UTC, decimal precision, soft-delete กลุ่มการเงิน D5)
   │ 7. ถ้า event ต้อง push (ในอนาคต): Infrastructure บันทึกฐานข้อมูลเรียบร้อยก่อน
   │    Application/Api เรียก IHubContext<NotificationHub> ไป SignalR (Phase 6)
   ▼
Response: wrapped envelope ทุก endpoint (D8)
   สำเร็จ: 200/201 + { success: true, data: ... }
   ล้มเหลว: 4xx/5xx + { success: false, error: { code, message, traceId } }
```

- ขั้นตอน 3 สำคัญมาก: บันทึกลง SQL Server **ก่อน broadcast** — SignalR ไม่ durable
- `traceId` ใน error envelope มาจาก logging correlation — เชื่อมกับ log ฝั่ง backend เพื่อดีบัก

---

## 4. SQL Server & EF Core

- **Database engine:** PostgreSQL (Local Docker `postgres:16-alpine` บน `localhost:5432`, DB: **`pocketwise_db`**, Production: Supabase — D50)
- **ORM:** EF Core 10.0 + provider `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.0 (`PocketWise.Infrastructure` เท่านั้น)
- **ที่จัดเก็บโค้ด:** `Persistence/` (DbContext), `Configurations/` (Fluent API ต่อ entity), `Migrations/` (สร้างผ่าน `dotnet ef` จาก `backend/`)
- **กฎการ map (จาก DataDictionary):** เก็บเวลาเป็น UTC (`timestamptz`), จำนวนเงินเป็น `decimal` + precision/currency ตามตาราง, soft delete (`IsDeleted` + global query filter) **เฉพาะตารางกลุ่มการเงิน 9 ตาราง** (D5)
- **Connection string:** dev ใช้ Trusted_Connection; เมื่อมี credential จริง → `.NET user-secrets` (ห้าม commit) เสมอ
- **Repository pattern:** interface อยู่ `Application/Interfaces/`, implementation อยู่ `Infrastructure/Repositories/` — Application สั่งงานผ่าน interface เท่านั้น
- ห้ามเขียน ADO.NET ตรง ๆ / stored proc ที่มี business logic เก็บใน DB — ทุก business rule อยู่ใน Domain/Application

---

## 5. Authentication & Authorization (แผนที่ล็อกแล้ว — D1)

**รูปแบบ: JWT Bearer + Refresh Token (ตามกฎ 46–50 ของ DataDictionary)**

```text
Login/Register
   │ POST /api/v1/auth/* → Controller → Features/Auth/ use case
   ▼
Application
   │ ตรวจ credentials (Identity hash) → ออก token pair:
   │  - Access Token (JWT, อายุสั้น) ─┐
   │  - Refresh Token (อายุยาว)      ─┴─ บันทึกในตาราง UserRefreshTokens
   ▼
UserRefreshTokens (PostgreSQL)
   │ เก็บ TokenHash = SHA-256(token) เสมอ — ห้ามเก็บ plain token
   │ rotation ทุก refresh; เก็บ ReplacedByTokenHash ตรวจ reuse
   │ พบ reuse → revoke ทุก session ของ user นั้น
   ▼
ทุก request หลัง login
   │ Header: Authorization: Bearer <access token>
   ▼
Authentication middleware (Api/Authentication/)
   │ validate signature + expiry + issuer/audience → สร้าง ClaimsPrincipal (UserId)
   ▼
Authorization
   │ [Authorize] ระดับ controller/endpoint และ [Authorize(Roles = "Admin")] สำหรับ Admin APIs
   │ Claims: UserId (ClaimTypes.NameIdentifier) + Roles (ClaimTypes.Role)
   │ Ownership: ทุก query/command ทั่วไปต้องกรองโดย UserId จาก claims — **ห้าม**รับ UserId จาก client
   ▼
SignalR (Phase 6): hub connection ใช้ JWT เดียวกัน + per-user groups อิง claims — ไม่รับ client-provided userId
```

- **จุดยังเปิด (ต้อง confirm ก่อน Phase 3 จริง):** อายุ token จริง, relation `Users` ↔ `IdentityUser`, ชื่อ routes ย่อย (ดู Decision Ledger)
- ห้าม log รหัสผ่าน / token จริง / ข้อมูลการเงินสำคัญ (Tech_Stack §8)
- Frontend เก็บ access token บนระบบที่เหมาะสม (ตัดสินใจเรื่อง FE storage ตอน implement — ห้ามใช้ localStorage ระยะยาว)

---

## 6. SignalR — Real-time (Phase 6)

- **Route:** `/hubs/notifications` (ไม่เปลี่ยน)
- **ทำอะไร:** แจ้งเตือน in-app (budget threshold, import/OCR progress, สถานะประมวลผล, refresh hints เมื่อ session อื่นแก้ข้อมูล)
- **ข้อมูล:** server เป็นผู้แนบ UserId จาก claims — จัด per-user groups ฝั่ง server เสมอ
- **หลัก:** **บันทึกลง PostgreSQL (ตาราง `Notifications`) ก่อน broadcast เสมอ** — SignalR ไม่ใช่ storage
- **Contract:** เพราะ OpenAPI ไม่ครอบ SignalR — event/payload ของ hub อธิบายใน `/docs/API_SPECIFICATION.md` (section SignalR) และต้องกำหนด **ก่อนเริ่ม Phase 6** — ขณะนี้ยังเป็น open decision
- FE ผูกผ่าน `src/lib/signalr.ts` — ต้องติดตั้ง `@microsoft/signalr` (📦 รออนุมัติ Phase 6)

---

## 7. สรุปกฎการเชื่อมต่อระหว่างส่วน (Cross-Cutting Rules)

1. **Frontend ↔ Backend** — REST (JSON, HTTPS) + SignalR — ห้าม SQL ตรง, ห้ามแชร์ DB credential
2. **Api → Application → Domain** — orchestration อยู่ Application, โดเมนกรรมอยู่ Domain, Controllers เบา
3. **Application → PostgreSQL** — ทุก read/write ผ่าน EF Core ผ่าน interface; ไม่มี direct SQL จาก Domain
4. **ผัง token:** JWT ตรวจที่ Api, token hash จัดเก็บที่ Infrastructure/SQL, claims คือแหล่งเดียวของ identity
5. **SignalR:** เกิดสถานะที่บันทึกแล้วแล้วแจ้งต่อ — แกนหลักคือ REST + DB เสมอ
6. **ทุก request/response:** wrapped envelope (D8) และ traceId ครบเมื่อ error
7. **Cross-layer contract:** DTO ของ Application คือสัญญากับ FE — กำหนดใน `/docs/API_SPECIFICATION.md` ก่อน implement (หมายถึง ดูข้อ "ยังไม่กำหนด" ใน Decision Ledger)
8. **ห้ามประดิษฐ์เลเยอร์/ชนิดการเชื่อมต่อใหม่** — ถ้างานต้องการตัวเชื่อมแบบที่ไม่อยู่ในเอกสารนี้ ให้ถามก่อนสร้าง

---

*Architecture of Record — หากเปลี่ยน ต้องแก้เอกสารนี้ก่อนโค้ด (แจ้งเจ้าของโปรเจค) และ sync ไปทั้ง playbook + AGENTS.md ที่เกี่ยวข้อง*

## อ่านเอกสารประกอบที่เกี่ยวข้อง

- `/docs/API_SPECIFICATION.md` — สัญญา REST/SignalR (รายละเอียด endpoint/response)
- `/docs/DataDictionary.md` — ตาราง/schema (**25 ตาราง** ตาม D13)
- `/docs/DEVELOPMENT_GUIDELINE.md` — Playbook + Decision Ledger
- `/docs/Tech_Stack.md` — Stack baseline
- `/docs/REQUIREMENTS.md` — รายการ requirement (FR)
- `frontend/pocketwise-web/DESIGN.md` — Design System (UI tokens)