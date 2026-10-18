<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PocketWise Frontend — AI Engineering Rules & Project Structure Guide

> **สำคัญมากสำหรับ AI Assistant**: เอกสารนี้เป็นกฎและข้อบังคับที่ต้องอ่านและปฏิบัติตามทุกครั้งก่อนเริ่มทำงานในโปรเจคนี้

---

## 🚨 1. กฎเหล็กที่ต้องปฏิบัติตามอย่างเคร่งครัด (Core Rules)

1. **ศึกษาโครงสร้างโปรเจคทั้ง Frontend และ Backend ก่อนลงมือเขียนเสมอ (Study Before Coding)**
   - ก่อนจะเริ่มเขียนหรือแก้ไขโค้ดใดๆ AI **ต้องเข้าไปศึกษาและทำความเข้าใจโครงสร้างของ `/frontend/...` และ `/backend/...` ก่อนเสมอ**
   - ต้องตรวจสอบ Controllers, Endpoints, DTOs, Enums และ Models ในฝั่ง `backend/src/` เพื่อให้มั่นใจว่า API contract, โครงสร้างข้อมูล และ Type Definitions ฝั่ง Frontend ตรงกัน 100%

2. **ห้ามตัดสินใจเองเด็ดขาด — ถ้าไม่เข้าใจให้หยุดแล้วกลับมาถามฉัน (Zero Guessing / Ask When Unclear)**
   - หากมีข้อกำหนด, Requirement, Workflow, สถาปัตยกรรม หรือโครงสร้างข้อมูลใดที่ไม่ชัดเจน หรือมีความคลุมเครือ **ห้ามคิดหรือตัดสินใจแทนผู้ใช้เองเด็ดขาด**
   - ให้หยุดและสอบถามผู้ใช้เพื่อความชัดเจนก่อนเริ่มเขียนโค้ดเสมอ

3. **ห้ามติดตั้ง Library หรือ Package อื่นเพิ่มเติมจนกว่าจะได้รับคำสั่ง (Strict Dependency Policy)**
   - ห้ามรันคำสั่ง `npm install`, `yarn add`, `pnpm add` เพื่อเพิ่ม library อื่นๆ นอกเหนือจากที่มีอยู่เดิมโดยเด็ดขาด จนกว่าจะได้รับคำสั่งหรือการอนุญาตที่ชัดเจนจากผู้ใช้

---

## 📁 2. คู่มือตำแหน่งไฟล์ (Code Placement Guide) — ต้องเขียนไว้ที่โฟลเดอร์ไหน?

เมื่อต้องการเพิ่มโค้ด ให้วางไฟล์ลงในโฟลเดอร์ตามหน้าที่และความรับผิดชอบอย่างเคร่งครัด:

```text
frontend/pocketwise-web/
├── public/                     # Static assets เช่น รูปภาพ, ไอคอน, favicon
├── src/
│   ├── app/                    # Next.js App Router (Routing & Layouts)
│   │   ├── (auth)/             # หน้าเกี่ยวกับระบบยืนยันตัวตน (Login, Register, Forgot Password)
│   │   ├── (dashboard)/        # หน้าหลักของระบบ (Overview, Transactions, Budgets, Reports ฯลฯ)
│   │   ├── api/                # Next.js Route Handlers (ใช้เฉพาะเมื่อต้องทำ BFF / Proxy ภายใน)
│   │   ├── layout.tsx          # Root Application Layout
│   │   └── page.tsx            # Entry landing page
│   │
│   ├── components/             # Reusable UI Components
│   │   ├── ui/                 # Base/Primitive UI components (ปุ่ม, ช่องกรอก, Dialog, Dropdown)
│   │   └── shared/             # Components ที่ใช้ร่วมกันหลายหน้า (Navbar, Sidebar, Header, ModalWrapper)
│   │
│   ├── features/               # โดเมนและฟีเจอร์ทางธุรกิจ (Domain-Driven Architecture)
│   │   ├── transactions/       # จัดการธุรกรรมรายรับ-รายจ่าย (ตาราง, ฟอร์มบันทึก, ตัวกรอง)
│   │   ├── budgets/            # จัดการงบประมาณ (หลอดงบประมาณ, แจ้งเตือนลิมิต)
│   │   ├── accounts/           # บัญชีธนาคารและยอดเงินคงเหลือ
│   │   ├── credit-cards/       # บัตรเครดิต, รอบบิล, Statement
│   │   ├── reports/            # สรุปภาพรวม, กราฟสถิติ, รายงานการเงิน
│   │   └── notifications/      # ระบบแจ้งเตือน Real-time และ Notification Drawer
│   │
│   ├── lib/                    # Core Infrastructure, Client Instances & Utilities
│   │   ├── api-client.ts       # Central Fetch wrapper จัดการ Base URL, Auth Headers, Error handling
│   │   ├── signalr.ts          # จัดการ Connection และ Event listeners ของ SignalR Hub
│   │   └── utils.ts            # Utility functions ทั่วไป (เช่น ฟอร์แมตวันที่, แปลงสกุลเงิน, cn helper)
│   │
│   ├── schemas/                # Schema Validation (เช่น Zod schemas สำหรับ Validate ฟอร์มและข้อมูลเข้า)
│   └── types/                  # TypeScript Interfaces และ Type Definitions สำหรับสัญญากับ Backend
```

### รายละเอียดการวางโค้ดแต่ละประเภท:

| สิ่งที่ต้องการเขียนเพิ่ม | โฟลเดอร์ที่ต้องวาง | ตัวอย่าง |
|---|---|---|
| **หน้าจอใหม่ (Route/Page)** | `src/app/(auth)/` หรือ `src/app/(dashboard)/` | `src/app/(dashboard)/transactions/page.tsx` |
| **Component เฉพาะฟีเจอร์** | `src/features/<feature-name>/components/` | `src/features/transactions/components/TransactionForm.tsx` |
| **Hook หรือ Logic เฉพาะฟีเจอร์** | `src/features/<feature-name>/hooks/` | `src/features/budgets/hooks/useBudgetSummary.ts` |
| **Component ส่วนกลางที่ใช้ซ้ำข้ามฟีเจอร์** | `src/components/shared/` | `src/components/shared/Sidebar.tsx`, `PageHeader.tsx` |
| **UI พื้นฐาน (Primitive Components)** | `src/components/ui/` | `src/components/ui/button.tsx`, `input.tsx` |
| **การเชื่อมต่อ API / Hubs** | `src/lib/` | `src/lib/api-client.ts`, `src/lib/signalr.ts` |
| **ฟังก์ชัน Helper / ฟอร์แมตข้อมูล** | `src/lib/` | `src/lib/utils.ts` (เช่น `formatCurrency`, `formatDate`) |
| **การ Validate ฟอร์ม (Schemas)** | `src/schemas/` | `src/schemas/transaction.schema.ts` |
| **Type / Contract ของข้อมูล** | `src/types/` | `src/types/transaction.types.ts`, `api.types.ts` |
| **รูปภาพ / ไฟล์ Static** | `public/` | `public/icons/`, `public/images/` |

---

## 🔗 3. ขั้นตอนการตรวจสอบก่อนเริ่มเขียนโค้ด (Pre-Implementation Protocol)

ก่อนเริ่มเขียนโค้ดฟีเจอร์ใดๆ ให้ปฏิบัติตามลำดับขั้นตอนนี้เสมอ:

1. **ตรวจสอบ Backend Contract**:
   - สำรวจ `backend/src/PocketWise.Api/Controllers` เพื่อดู Endpoint และ HTTP Methods
   - สำรวจ `backend/src/PocketWise.Application/DTOs` เพื่อดูฟิลด์ข้อมูล Request/Response
   - สำรวจ `backend/src/PocketWise.Domain/Enums` เพื่อให้ Enum ใน Frontend มีค่าตรงกัน
2. **จับคู่โฟลเดอร์ให้ถูกต้อง**:
   - นำสิ่งที่ต้องการทำ ไปแมปกับตารางในข้อ 2
3. **ตรวจสอบความชัดเจน**:
   - หากขาดข้อมูล เช่น สเปกของ UI, เงื่อนไข Business Logic, หรือ API endpoint ที่ยังไม่มี **ต้องถามผู้ใช้ทันทีก่อนลงมือ**
