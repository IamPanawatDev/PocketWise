# PocketWise

Personal Finance Management System — ระบบบันทึกรายรับรายจ่าย (มุมมองส่วนบุคคล) พร้อมการนำเข้ารายการจากสลิป การจัดการบัตรเครดิต งบประมาณ และการแจ้งเตือนแบบ real-time

## Architecture

Decoupled Full-Stack — ผังฉบับล็อกแล้วอยู่ที่ [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

```text
Browser
  │  Next.js (App Router) + TypeScript + Tailwind CSS     [frontend/pocketwise-web]
  │  REST/JSON (envelope: { success, data }) + SignalR    [/hubs/notifications]
  ▼
ASP.NET Core Web API on .NET 10 — Clean Architecture      [backend/]
  ├── PocketWise.Domain           # Entities, ValueObjects, Enums, Rules
  ├── PocketWise.Application      # Use Cases, DTOs, Validators, Interfaces
  ├── PocketWise.Infrastructure   # EF Core 10 + SQL Server, Repositories
  └── PocketWise.Api              # Controllers, Hubs, Middleware, JWT Auth
  ▼
SQL Server (Microsoft SQL Server 2025, database: PocketWiseDb)
```

## Tech Stack

| ฝั่ง | หลัก ๆ |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, ESLint 9 |
| Backend | .NET 10 (ASP.NET Core Web API), EF Core 10.0.13, ASP.NET Core Identity (JWT + Refresh Token) |
| Database | Microsoft SQL Server 2025 (localhost / `PocketWiseDb`) |
| Real-time | ASP.NET Core SignalR (server) + `@microsoft/signalr` (client — จะติดตั้งเมื่อถึง Phase 6) |
| Testing | xUnit + WebApplicationFactory / Playwright (ตาม phase) |

รายละเอียดเต็ม: [`docs/Tech_Stack.md`](docs/Tech_Stack.md)

## เริ่มต้นใช้งาน (Development)

```bash
# 1) Restore + build backend (ติดตั้ง dotnet-ef local tool ด้วย)
cd backend
dotnet tool restore
dotnet build

# 2) Install frontend
cd ../frontend/pocketwise-web
npm install

# 3) ตั้ง env ฝั่ง frontend
copy .env.example .env.local     # Windows (Linux: cp)

# 4) รันทั้งสองฝั่งพร้อมกัน (จาก repo root — ต้องมี Windows Terminal)
..\..\run.cmd
# หรือรันแยก:
#   Backend : cd backend/src/PocketWiseApi && dotnet watch run   → https://localhost:7023
#   Frontend: cd frontend/pocketwise-web && npm run dev          → http://localhost:3000
```

## Requirements

- .NET SDK 10.0
- Node.js LTS (npm)
- SQL Server 2025 (หรือ 2019+; Windows Authentication) — database `PocketWiseDb`
- (ทางเลือก) Windows Terminal สำหรับ `run.cmd`

## AI Engineering Rules ของโปรเจคนี้

โปรเจคนี้ใช้ระบบเอกสาร rule สำหรับ AI assistant (Claude/Codex/Gemini) — โปรดอ่านก่อนแตะโค้ด:

- [`AGENTS.md`](AGENTS.md) — กฎเหล็กระดับ root + navigation
- [`backend/AGENTS.md`](backend/AGENTS.md) / [`frontend/AGENTS.md`](frontend/AGENTS.md) — กฎต่อขอบเขต + ตำแหน่งไฟล์
- [`docs/DEVELOPMENT_GUIDELINE.md`](docs/DEVELOPMENT_GUIDELINE.md) — Playbook ต่อ Phase + Decision Ledger
- [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md) — Checklist ติดตามงาน implement รายรายการ (อัปเดตทุกครั้งที่ implement เสร็จ)
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — Requirements (FR) + สถานะ
- [`docs/DataDictionary.md`](docs/DataDictionary.md) — Schema (implement 20/25 ตาราง ตาม D12)
- [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md) — สัญญา REST/SignalR
- [`frontend/pocketwise-web/DESIGN.md`](frontend/pocketwise-web/DESIGN.md) — Design System (UI tokens)

## Status

ดูตารางสถานะ Phase ได้ที่ [`docs/DEVELOPMENT_GUIDELINE.md` §3](docs/DEVELOPMENT_GUIDELINE.md) — ปัจจุบัน: Phase 2 (Data Model) พร้อมเริ่มโค้ด