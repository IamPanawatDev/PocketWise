# PocketWise — Technology Stack & Development Tools

> Project: PocketWise Personal Finance Management System  
> Architecture: Next.js frontend + ASP.NET Core Web API + SignalR + PostgreSQL (Supabase / Docker)  
> Document status: Proposed baseline; confirm package versions against current stable releases before implementation.

## 1. Goals and Architecture

Build a secure, responsive personal finance application for tracking income and expenses, categories, budgets, bank accounts, credit cards, statements, recurring transactions, receipt/slip imports, reports, and real-time notifications.

Recommended high-level architecture:

```text
Browser
  │
  ▼
Next.js + TypeScript + Tailwind CSS + shadcn/ui
  │ HTTPS / JSON (REST API)          │ SignalR over WebSockets
  ▼                                  ▼
ASP.NET Core Web API  ◄────────►  SignalR Hubs
  │
  ├── Application / Domain logic
  ├── Authentication & Authorization
  ├── EF Core (Npgsql)
  └── Background jobs (when needed)
  │
  ▼
PostgreSQL (Local Docker / Supabase)
```

The frontend must never connect directly to PostgreSQL. All data access goes through the backend API. SignalR is for server-pushed events, not a replacement for REST endpoints or durable database storage.

## 2. Core Technology Stack

| Area | Recommended technology | Purpose / notes |
|---|---|---|
| Backend runtime | ASP.NET Core Web API on .NET 10 LTS, or .NET 8 if required by the environment | Build REST endpoints. Choose one target framework and keep all projects aligned. Verify support lifecycle before starting. |
| Real-time | ASP.NET Core SignalR | Push notifications, transaction/import status, and updates to connected clients. |
| API contract | REST + JSON, documented with OpenAPI | Clear request/response contracts and easy frontend integration. |
| API documentation | Microsoft.AspNetCore.OpenApi and/or Swashbuckle | Generate an OpenAPI document and interactive API docs. Verify package compatibility with the selected .NET version. |
| Frontend framework | Next.js (App Router) | Routing, layouts, server/client rendering, and application shell. |
| Language | TypeScript with strict mode | Type safety across UI and API contracts. |
| Styling | Tailwind CSS | Utility-first styling and responsive layouts. |
| UI components | shadcn/ui CLI + Radix UI + react-day-picker | Components are added as source in `frontend/pocketwise-web/src/components/ui/`; installed components are themed with PocketWise `--pw-*` tokens. The app uses Input, Select, Button, AlertDialog, a Calendar/Popover date picker backed by `react-day-picker`, and a shared Select-based time picker. |
| Icons | lucide-react | Consistent UI icons. |
| Forms | React Hook Form + Zod | Form state and schema-based validation. Validate on both client and server. |
| API client | Native fetch or a small typed API wrapper | Centralize base URL, headers, error handling, and credentials. Add TanStack Query if server-state caching/invalidation becomes useful. |
| UI Animations | motion (framer-motion v14.5.0) | Fluid UI animations, staggered lists (AnimatedList), spring counters (AnimatedNumber), route transitions (PageTransition), and micro-interactions. |
| Reports charts | Recharts | Responsive report charts; render amounts in separate currency series and use the project design tokens. |
| SignalR client | @microsoft/signalr (^10.0.11 — ติดตั้งแล้วใน frontend/pocketwise-web) | Connect to the ASP.NET Core SignalR hub and handle reconnects/events. |
| Database | PostgreSQL (Local Docker `postgres:16-alpine` / Cloud: Supabase) | Relational storage for users, transactions, categories, budgets, cards, and audit records. Zero-cost hosting friendly. |
| ORM / migrations | Entity Framework Core PostgreSQL provider (`Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.0) | Database access, LINQ, entity mapping, and schema migrations. |
| Authentication | ASP.NET Core Identity or a carefully designed external identity provider | Password hashing, account lifecycle, roles/claims, and secure sign-in. Decide cookie/BFF vs bearer-token architecture before implementation. |
| Validation | FluentValidation (optional) + domain validation | Validate API inputs and enforce business rules server-side. Avoid duplicating rules without a clear source of truth. |
| Logging | Microsoft.Extensions.Logging with structured logging; Serilog optional | Diagnostic logs with useful correlation IDs. Never log passwords, tokens, or full sensitive financial data. |
| Testing | xUnit, integration-test WebApplicationFactory, and Playwright | Unit tests, API integration tests, and browser end-to-end tests. |
| Code quality | ESLint, Prettier, .editorconfig, dotnet format | Consistent style and maintainable code. |
| Version control | Git + GitHub or another Git host | Branches, pull requests, issues, and code review. |
| CI | GitHub Actions (or equivalent) | Build, lint, test, and validate pull requests. |
| Local environment | Visual Studio / VS Code, Node.js LTS, .NET SDK, SQL Server Developer or LocalDB, SSMS | Development, debugging, and database administration. |
| API testing | Bruno, Postman, or Swagger UI | Save requests and test authentication and API behavior. |
| Design / planning | Figma, diagrams.net (draw.io), Markdown | UI mockups, ER diagrams, flow diagrams, and technical decisions. |

### Version policy

- Pin and document the selected .NET SDK, Node.js LTS version, and package versions.
- Prefer supported LTS releases for a new project, subject to deployment-host compatibility.
- Do not mix incompatible major versions of Next.js, React, Tailwind CSS, shadcn/ui, or EF Core.
- Re-check official release notes and support dates at project kickoff.
- Recharts `^3.10.1` is installed as a runtime dependency in `frontend/pocketwise-web/` for Phase 5 reports; use it only for report visualizations.
- Devart MCP Server for SQL Server (v1.1.0) ได้รับอนุมัติให้ใช้งานผ่าน stdio transport (Connection: `PocketWise`, DSN: `PocketWiseDb`) เพื่อให้ AI Agent สามารถตรวจสอบ schema และความถูกต้องของข้อมูลในฐานข้อมูลได้อย่างปลอดภัย
- Frontend shadcn setup is present in `frontend/pocketwise-web/components.json` (Radix Nova, Tailwind CSS v4, `@/components` and `@/lib/utils` aliases). The `shadcn` CLI is a devDependency; runtime primitives use `radix-ui`, `@radix-ui/react-alert-dialog`, `class-variance-authority`, `tw-animate-css`, and `react-day-picker` (`^10.0.2`) for the shared Calendar UI. Date and date-time fields use `DateInput`/`DateTimeInput` in `src/components/ui/date-input.tsx`, backed by `Calendar` in `src/components/ui/calendar.tsx`; time selection uses shared shadcn `Select` components, not native browser date/time pickers. Use `npx shadcn add <component>` from the frontend app, then theme generated source against `DESIGN.md` without overwriting existing customized primitives.

## 3. Backend Project Structure

> ✂️ **ย้ายไปแล้ว:** โครงสร้างโฟลเดอร์และกฎการวางไฟล์ backend ฉบับใช้งานจริงอยู่ที่ [`/backend/AGENTS.md §3`](file:///D:/Projects/PocketWise/backend/AGENTS.md) (ที่เดียว — ไฟล์นี้ไม่เก็บต้นฉบับโครงสร้างอีกต่อไป กันตกหล่นเวลาแก้) — หลักทั่วไปที่เหลือให้จำ: keep domain rules independent of HTTP, EF Core, and SignalR; controllers thin; use-case coordination ใน Application; database implementations ใน Infrastructure (รายละเอียด: `/docs/ARCHITECTURE.md` §2)

## 4. Frontend Project Structure

> ✂️ **ย้ายไปแล้ว:** โครงสร้างโฟลเดอร์และกฎการวางไฟล์ frontend ฉบับใช้งานจริงอยู่ที่ [`/frontend/AGENTS.md §2`](file:///D:/Projects/PocketWise/frontend/AGENTS.md) (ที่เดียว) — หลักที่เหลือให้จำ: use Server Components by default; `"use client"` เฉพาะอันต้องใช้ browser APIs / state / SignalR; ห้าม expose private server secrets ผ่าน `NEXT_PUBLIC_*`

## 5. SignalR — Recommended Use Cases

> ✂️ **หลักสถาปัตยกรรมของ SignalR (route, บันทึกก่อน broadcast, auth ผ่าน claims, ไม่ durable) อยู่ที่ [`/docs/ARCHITECTURE.md` §6](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) ที่เดียว** — ส่วนนี้เก็บเฉพาะ "เลือกใช้เมื่อไร" ซึ่งเป็นเรื่อง product ที่ไม่มีที่อื่น:
>
> ใช้ SignalR เมื่อ user ได้ประโยชน์จาก update ทันที: in-app notifications (budget threshold), import/OCR job progress, สถานะการประมวลผล transaction/statement, refresh hints เมื่อ data เปลี่ยนจาก active session อื่น
>
> **สัญญา events/payloads** (OpenAPI ไม่ครอบ SignalR) อยู่ที่ [`/docs/API_SPECIFICATION.md` §6](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) (section เปิด — ล็อกก่อน implement Phase 6 ตาม D11-⑤)
>
> หมายเหตุการขยายระบบ: หากต้องการ multi-instance hosting ในอนาคต ให้ประเมน scale-out option (Azure SignalR Service / backplane) ตอน Phase 8 — ปัจจุบันยังไม่จำเป็น

## 6. OpenAPI / Swagger

**Yes, OpenAPI is recommended.** It describes the REST API contract and helps frontend development, debugging, and testing.

Recommended setup:

- Generate the OpenAPI document with `Microsoft.AspNetCore.OpenApi` and expose it at `/openapi/v1.json`.
- Serve the interactive Swagger UI with `NSwag.AspNetCore` at `/swagger` in Development only.
- Document authentication requirements, request/response DTOs, validation errors, pagination, and common status codes.
- Use the OpenAPI document to review contract changes; optionally generate TypeScript types/client code with a compatible generator.
- Secure or disable interactive API documentation in production unless there is an explicit operational need.
- OpenAPI documents the REST API; it does not fully describe SignalR hub events. Document hub names, event names, payloads, and authorization separately.

PocketWise local development uses `http://localhost:5268` for the API and
`http://localhost:5268/swagger` for Swagger UI. The `run.cmd` script explicitly
starts the backend with the `http` launch profile so these URLs stay consistent.
Current package versions are `Microsoft.AspNetCore.OpenApi` 10.0.13 and
`NSwag.AspNetCore` 14.7.1.

For the frontend CSS pipeline, Tailwind CSS v4 is compiled with
`@tailwindcss/postcss`; its plugin is configured in
`frontend/pocketwise-web/postcss.config.mjs`. Keep CSS processing and Tailwind
configuration changes aligned with this PostCSS integration.

Official resources:
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- ASP.NET Core Web API documentation: https://learn.microsoft.com/aspnet/core/web-api/
- ASP.NET Core OpenAPI: https://learn.microsoft.com/aspnet/core/fundamentals/openapi/aspnetcore-openapi
- SignalR: https://learn.microsoft.com/aspnet/core/signalr/introduction
- Next.js: https://nextjs.org/docs
- TypeScript: https://www.typescriptlang.org/docs/
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com/docs
- EF Core SQL Server: https://learn.microsoft.com/ef/core/providers/sql-server/

## 7. External APIs — Only Where They Add Value

The core app does **not** need third-party APIs to record income and expenses. Keep external integrations optional and behind backend interfaces so the system remains usable if a provider is unavailable.

| Capability | Possible provider / approach | Required? | Considerations |
|---|---|---|---|
| Receipt or transfer-slip OCR | Local `Tesseract` 5.2.0 (with `tha` + `eng` models) / Optional: Cloud Vision API | Installed (`Tesseract` 5.2.0 in Infrastructure) | Local offline OCR for Thai slips via `TesseractSlipOcrService` using `tessdata/{tha,eng}.traineddata`. Always lets users review extracted data before saving. |
| Bank account aggregation | A licensed/open-banking provider available in the target country | Optional, only if supported | Availability and authorization vary by country and bank. Do not assume a universal public API exists. Never ask users to share online banking passwords. |
| Exchange rates | A reputable exchange-rate API or official source | Optional | Needed only if supporting multi-currency transactions. Store rate, currency pair, source, and effective date used for conversion. |
| Email delivery | SMTP provider or transactional email service | Optional | For verification, password reset, or reports; protect API keys and rate-limit sending. |
| Error monitoring | Sentry or another approved monitoring service | Optional | Configure PII scrubbing and avoid capturing financial payloads or credentials. |
| Cloud file storage | Azure Blob Storage or compatible private object storage | Optional | For receipt images and imported files; use private containers, short-lived access links, and retention policies. |
| AI categorization / chat | An LLM provider only if a concrete feature justifies it | Optional / later phase | Send the minimum necessary data, disclose processing, review retention terms, and never make AI the authority for financial calculations. |

Before integrating any external provider, confirm pricing, free-tier limits, authentication, rate limits, data residency, retention, and whether commercial use is permitted. Keep provider-specific code in Infrastructure, not in Domain.

## 8. Security Baseline

> ✂️ **การตัดสินใจด้าน security ที่ปิดแล้ว (auth strategy, envelope, secret placement) อยู่ที่ [`/docs/DEVELOPMENT_GUIDELINE.md` Appendix D](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md) (Decision Ledger) และสถาปัตยกรรม auth flow อยู่ที่ [`/docs/ARCHITECTURE.md` §5](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) — ส่วนนี้เป็น baseline รวมที่ควรจำ**
>
> - Use HTTPS in every deployed environment. Use ASP.NET Core Identity or a trusted identity provider; never store plaintext passwords.
> - Bearer-token pattern: กำหนด storage, expiry, rotation/revocation และ refresh-token protection ให้ชัดก่อน implement — อย่าเก็บ long-lived token ใน localStorage (แผนที่ล็อกแล้ว: D1 — JWT + refresh ใน UserRefreshTokens)
> - Apply authorization checks on every record access (per-user data isolation) — ระบุ UserId จาก claims เท่านั้น
> - Validate ทุก input ฝั่ง server; ใช้ EF Core/parameterized queries เสมอ
> - เก็บ secrets ที่ .NET user-secrets (local) / secret manager (deployment) — ห้าม commit
> - Rate limiting สำหรับ login/reset/import; จำกัด upload size/type; เก็บ upload นอก web root
> - ไม่ log รหัสผ่าน/token/ข้อมูลการเงิน; audit logs ลด sensitive data
> - Back up SQL Server + ทดสอบ restore; กำหนดนโยบาย data export/deletion ก่อนขึ้น production

## 9. Development Tools Checklist

### Required to start

- [ ] Git
- [ ] .NET SDK matching the chosen target framework
- [ ] Node.js LTS and npm (or the selected package manager)
- [ ] Visual Studio or VS Code
- [ ] SQL Server Developer / LocalDB and SQL Server Management Studio (SSMS)
- [ ] Browser with developer tools
- [ ] Swagger UI, Bruno, or Postman
- [ ] diagrams.net for ER diagrams and architecture
- [ ] GitHub repository and issue/PR workflow

### Recommended as the project grows

- [ ] xUnit + WebApplicationFactory for backend tests
- [ ] Playwright for end-to-end browser tests
- [ ] ESLint + Prettier + TypeScript strict mode
- [ ] GitHub Actions CI
- [ ] Docker Desktop / Docker Engine if the team needs reproducible local services
- [ ] Error monitoring and structured log aggregation
- [ ] A secure secret manager for deployed environments

## 10. Suggested Implementation Phases

> ✂️ **รายการ phase อย่างย่อให้อ่านตามนี้ได้ — แต่ Playbook ฉบับใช้งานจริง (สถานะ, คำสั่ง, Decision Points, Gate ต่อ phase) อยู่ที่ [`/docs/DEVELOPMENT_GUIDELINE.md`](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md) ที่เดียว** — ลำดับตั้งต้น: 1) Foundation 2) Data model 3) Identity 4) Core transactions 5) Budgets & reports 6) SignalR 7) Imports (CSV ก่อน, OCR ท้าย phase หลังประเมิน cost/privacy/accuracy) 8) Hardening

## 11. Decisions to Confirm Before Coding

> ✂️ **ศูนย์กลางการตัดสินใจ (ถาม → ตอบ → ล็อก) อยู่ที่ Decision Ledger ใน [`/docs/DEVELOPMENT_GUIDELINE.md` Appendix D](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md) ที่เดียว** — checklist เดิมของไฟล์นี้ถูกทับโดย decisions ล็อกแล้ว:
>
> - ✅ Target .NET version — **.NET 10** (csproj ทุก project)
> - ✅ Authentication strategy — **JWT Bearer + Refresh Token** (D1 ใน Ledger — ชนะข้อขัดแย้งกับ DataDictionary ตามที่ระบุใน Appendix C ของ playbook)
> - ✅ Database — localhost + `PocketWiseDb` (D4)
> - ✅ Response envelope — Wrapped (D8)
> - ❓ ยังเปิด: upload storage / multi-currency / bank integration / SignalR scale-out / SQL backup policy / external APIs — ดู "คำถาม open" ใน playbook Appendix D

---
*This document is a proposed baseline for PocketWise, not a claim that every optional tool or external service is required. Re-check official documentation and package compatibility before implementation.*
