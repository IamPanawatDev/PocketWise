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

> 🗺️ **ก่อนเริ่มงานทุกครั้ง** ให้อ่าน Playbook ต่อ Phase ที่ [`/docs/DEVELOPMENT_GUIDELINE.md`](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md) ร่วมด้วยเสมอ (ขั้นตอน, คำสั่ง, สถานะ Phase, Decision Points) — แตะ contract ใด ๆ ต้องอ้างอิง [`/docs/DataDictionary.md`](file:///D:/Projects/PocketWise/docs/DataDictionary.md) และแตะ requirement ใด ๆ ต้องอ้างอิง [`/docs/REQUIREMENTS.md`](file:///D:/Projects/PocketWise/docs/REQUIREMENTS.md) (รายการ FR + สถานะ — Source of Truth ของ "ทำอะไร/ไม่ทำอะไร") — สัญญา REST/SignalR ระหว่าง Frontend–Backend อยู่ที่ [`/docs/API_SPECIFICATION.md`](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) — **จบงาน implement ต้องอัปเดตสถานะที่ [`/docs/IMPLEMENTATION_CHECKLIST.md`](file:///D:/Projects/PocketWise/docs/IMPLEMENTATION_CHECKLIST.md) ทุกครั้ง**

---

## 🔗 3. ขั้นตอนการตรวจสอบก่อนเริ่มเขียนโค้ด (Pre-Implementation Protocol)

ก่อนเริ่มเขียนโค้ดฟีเจอร์ใดๆ ให้ปฏิบัติตามลำดับขั้นตอนนี้เสมอ — **หมายเหตุ: กฎที่ซ้ำข้ามฝั่ง (ศึกษา backend contract, sync types กับ DTOs) มี version เดียวที่ rule #1 + #3 ด้านบน — ส่วนนี้ระบุ**วิธีตรวจ**ที่เป็นรูปธรรมฝั่ง FE:**

1. **ตรวจสอบ Backend Contract** (วิธีตรวจของกฎ #1):
   - Endpoint และ HTTP Methods → `backend/src/PocketWise.Api/Controllers` และ `/docs/API_SPECIFICATION.md`
   - ฟิลด์ Request/Response → `backend/src/PocketWise.Application/DTOs` (ต้องตรงกับ `src/types/`)
   - Enum → `backend/src/PocketWise.Domain/Enums` (ต้องมีค่าเท่ากันใน `src/types/`)
2. **จับคู่โฟลเดอร์ให้ถูกต้อง**:
   - นำสิ่งที่ต้องการทำ ไปแมปกับตารางในข้อ 2
3. **ตรวจสอบความชัดเจน**:
   - หากขาดข้อมูล เช่น สเปกของ UI, เงื่อนไข Business Logic, หรือ API endpoint ที่ยังไม่มี **ต้องถามผู้ใช้ทันทีก่อนลงมือ**

---

## 🎨 4. Design System — DESIGN.md (บังคับใช้ทุกงาน UI)

> ติดตั้งผ่าน `npx getdesign@latest add discord` — เอกสานฉบับเต็มอยู่ที่ [`frontend/pocketwise-web/DESIGN.md`](file:///D:/Projects/PocketWise/frontend/pocketwise-web/DESIGN.md) (~550 บรรทัด — tokens เท่านั้นใน front-matter, รายละเอียดเต็มหลัง front-matter)

1. **อ่าน `frontend/pocketwise-web/DESIGN.md` ก่อนเขียน UI ใด ๆ ทุกครั้ง (ห้ามข้าม)**
   - ทุก component, หน้าจอ, สถานะ (hover/loading/empty) ต้องอ้างอิง token จากไฟล์นี้ — **ห้ามเดาสี/ฟอนต์/spacing เอง**
2. **ตาราง token หลัก (สรุปจาก DESIGN.md):**
   - **สี**: Canvas indigo `#0a0d3a` · Blurple (primary) `#5865f2` · Green (high-intent CTA เท่านั้น) `#35ed7e` · Magenta `#ec48bd` · Link `#00b0f4` · Surface indigo `#1e2353` · Surface onyx `#23272a` · Surface black `#000000` · Ink `#ffffff` / `#000000` · Hairline `#23272a`
   - **Typography**: Display (heavy 700–800, all-caps) / Heading 700 / Body 400–500 — เต็มตาม `typography:` block
   - **Rounded**: 6 / 12 / 14 / 16 / 40 / 50 / 120 / full — ปุ่มและแถวใช้ 12–16px, card/panel ใช้ 40px+
   - **Spacing**: 4/8/12/16/20/24/32/40px
3. **ข้อห้าม (Do/Don't) ที่สำคัญ:**
   - ❌ **ห้าม**ทำ background เป็นสีเทากลางหรือดำเนียบ — canvas ต้องเป็น indigo เสมอ
   - ❌ **ห้าม**ใช้สีเขียว `(green)` กับปุ่มใดปุ่มหนึ่งโดยไม่ตั้งใจ — สีนี้สงวนไว้ให้ action ที่ intent สูงสุดเพียงปุ่มเดียวต่อหน้า
   - ❌ **ห้าม**ใช้ shadow หนัก ๆ — depth มาจากสี, gradient และ radius เป็นหลัก
   - ❌ **ห้าม**ทำ card/media เหลี่ยม — ทุกอย่างต้องมี radius, ห้ามต่ำกว่า `{rounded.sm}` (12px) ที่ card
   - ❌ ห้ามเพิ่มสีเด่น (accent) ใหม่เกิน 3 สีต่อหน้า — Blurple / Green / Magenta คือ chord เต็ม
4. **การปรับใช้กับ PocketWise:**
   - Discord เป็น dark, gaming, all-caps เมื่อธรรมชาติขัดกับการเงิน (เช่น ความอ่านยากของตารางตัวเลขจำนวนมากใน all-caps) — ใช้ **tokens เป็นสถาปัตยกรรมหลัก** (canvas, Blurple, radius scale, spacing) และปรับ typography ของ body/บัญชี่ให้เหมาะกับข้อมูลการเงินโดย**ไม่ลดความโดดเด่นของ display type**
   - หาก UX ทับซ้อนกับ a11y (เช่น contrast ของ ink บน canvas) — พิสูจน์ด้วย contrast ≥ 4.5:1 สำหรับ body text ก่อน commit
5. **ความสอดคล้องกับ stack:** ยังไม่ต้อง implement เป็น Tailwind theme จนกว่าจะเริ่ม UI จริง — เมื่อถึงจังหวะ ให้ map tokens ข้างต้นเป็น CSS variables / Tailwind theme ผ่าน `src/app/globals.css` และอัปเดต DESIGN.md เมื่อมีการปรับ

---

## 🔔 5. Feedback & Confirmation (Toast vs AlertDialog — กฎบังคับ)

> ติดตั้งแล้ว: `sonner` (Toast) + `@radix-ui/react-alert-dialog` (ใช้ทำ `AlertDialog` แบบ shadcn/ui) — ใช้ทั้งสองตัวนี้เป็นมาตรฐานเดียวทั้งโปรเจค

1. **Toast (`sonner`) — ใช้สำหรับ "แจ้งผล" เท่านั้น**
   - แจ้งว่าการกระทำสำเร็จ/ล้มเหลว (เช่น "บันทึกรายการแล้ว", "ลบหมวดหมู่แล้ว", "เกิดข้อผิดพลาด")
   - ไม่ต้องให้ผู้ใช้ตัดสินใจ — ปรากฏแล้วหายไปเอง
   - ห้ามใช้ `alert()` / `confirm()` / `window.location.reload()` เพื่อแจ้งผล — ใช้ toast + invalidate query แทน
2. **AlertDialog (shadcn/ui) — ใช้สำหรับ "การตัดสินใจที่ต้องยืนยัน" เท่านั้น**
   - การกระทำที่ทำลายข้อมูลหรือกลับไม่ได้ (ลบรายการ/ลบแท็ก/ลบบัญชี/ออกจากระบบ ฯลฯ)
   - ต้องมีปุ่มยืนยัน + ยกเลิกชัดเจน — ไม่ใช่ toast
   - ห้ามใช้ `window.confirm()` — ใช้ `AlertDialog`
3. **การวางไฟล์:**
   - `Toaster` ต่อใน root layout (`src/app/layout.tsx`) — ครั้งเดียว
   - `AlertDialog` primitive → `src/components/ui/alert-dialog.tsx`
   - `ConfirmDialog` (wrapper ที่ใช้ซ้ำ) → `src/components/shared/ConfirmDialog.tsx`
4. **หลักเลือกใช้:** ถ้าต้องการให้ผู้ใช้ "ตอบ" → AlertDialog; ถ้าต้องการ "บอก" ผล → Toast
