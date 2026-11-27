# PocketWise — Master AI Engineering Rules & Full-Stack System Guide

> **สำคัญมากสำหรับ AI Assistant**: เอกสารนี้เป็น Master Rule ระดับ Root ของทั้งโปรเจค PocketWise ที่ AI ต้องอ่านและปฏิบัติตามทุกครั้ง ไม่ว่าจะทำงานในส่วน Backend, Frontend หรือเอกสารระบบ

---

## 🏗️ 1. สถาปัตยกรรมระบบภาพรวม (System Architecture)

ระบบ PocketWise ใช้สถาปัตยกรรมแบบ Unified Full-Stack บน Next.js 16 (App Router + Serverless Route Handlers + Drizzle ORM + Real-time SSE) บน Vercel — **ผังฉบับเต็ม (ระบบ, dependency, request lifecycle, auth flow, PostgreSQL, Realtime) อยู่ที่ [`/docs/ARCHITECTURE.md`](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) เท่านั้น (SoT เดียว — ห้ามเขียนโค้ดขัดกับผังนั้น)**

### กฎสถาปัตยกรรมระดับ Root:
- **Client Components ต้องไม่เชื่อมต่อกับ PostgreSQL / Database โดยตรง**: การเข้าถึงข้อมูลทั้งหมดต้องผ่าน API Layer (`/api/v1/*` Server Handlers) เท่านั้น
- **Real-time Event Stream มีไว้สำหรับ Server-Pushed Events เท่านั้น**: ใช้แจ้งเตือนแบบ Real-time, อัปเดตสถานะงาน (Import/OCR/Status) ผ่าน SSE (`/api/v1/notifications/stream`) **ห้าม** ใช้แทนที่ REST API หรือฐานข้อมูลหลัก
- **Single Source of Truth**: Backend Server Handlers เป็นผู้กำหนด Business Logic, Validation หลัก และ Data Contracts เสมอ

---

## 🚨 2. กฎเหล็กประจำโปรเจค (Master Core Rules)

1. **ศึกษาโครงสร้างทั้งระบบก่อนเริ่มเขียนโค้ดเสมอ (Study Before Coding)**
   - หากจะเขียนโค้ดฝั่ง Frontend **ต้องเข้าไปตรวจสอบโค้ดฝั่ง Backend ก่อนเสมอ** (Controllers, DTOs, Enums, Models) เพื่อให้ Data Contract และ Type Definitions สอดคล้องกัน 100%
   - หากจะแก้ไขหรือเพิ่ม API ฝั่ง Backend **ต้องคำนึงถึงผลกระทบต่อ Frontend เสมอ**
2. **ห้ามตัดสินใจเองเด็ดขาด — ถ้าไม่เข้าใจให้หยุดแล้วกลับมาถามฉัน (Zero Guessing / Ask When Unclear)**
   - หากมีข้อกำหนดทางธุรกิจ, Requirement, Workflow, สถาปัตยกรรม, หรือโครงสร้างฐานข้อมูลใดที่ไม่ชัดเจน **ห้ามคิดหรือตัดสินใจแทนผู้ใช้เองเด็ดขาด**
   - ให้หยุดและสอบถามผู้ใช้เพื่อความชัดเจนก่อนเริ่มลงมือทำเสมอ
3. **ห้ามติดตั้ง Library หรือ Package ใดๆ เพิ่มเติมจนกว่าจะได้รับคำสั่ง (Strict Dependency Policy)**
   - **ห้าม** ติดตั้ง NuGet Package ฝั่ง Backend (`dotnet add package`)
   - **ห้าม** ติดตั้ง npm Package ฝั่ง Frontend (`npm install`, `pnpm add`, `yarn add`)
   - จนกว่าจะได้รับคำสั่งหรือการอนุญาตที่ชัดเจนจากผู้ใช้เป็นกรณีไป
4. **เพิ่ม Tool/Package แล้วต้องอัปเดตกฎและคู่มือในงานเดียวกัน**
   - เมื่อได้รับอนุมัติให้เพิ่ม dependency หรือ tool ใด ๆ (เช่น library, CLI/local tool, build/lint/test/code-generation tool หรือ SDK) ให้แก้ manifest/lock file ที่เกี่ยวข้อง และอัปเดต `AGENTS.md` ของขอบเขตนั้นในงานเดียวกัน
   - บันทึกวัตถุประสงค์ ขอบเขต/ตำแหน่งติดตั้ง วิธีใช้หรือคำสั่งมาตรฐาน การตั้งค่าที่จำเป็น และข้อกำหนดการใช้งาน เพื่อให้ AI และผู้พัฒนาคนถัดไปใช้แนวทางเดียวกัน
   - อัปเดตรายการเวอร์ชันและคำสั่งใน `/docs/Tech_Stack.md` หรือ Appendix A/B ของ `/docs/DEVELOPMENT_GUIDELINE.md` ตามความเหมาะสม
5. **มาตรฐาน UI, Modal, BottomSheet, Responsive, Animation และ Date (UI & UX Master Standard)**
   - 📖 **Skill Pointer**: โหลดและปฏิบัติตามสกิล [`pocketwise-ui-ux`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-ui-ux/SKILL.md) ทุกครั้งที่สร้างหรือแก้ไข UI
   - **กฎเหล็กสรุปย่อ**:
     - **Desktop Modal vs Mobile BottomSheet**: บนจอ `< sm` ทุก Modal ต้องแสดงผลเป็น BottomSheet ผ่าน `@/components/ui/bottom-sheet`
     - **Mobile Button Order**: ปุ่ม Action/Confirm/Delete อยู่บน (`order-1`), ปุ่ม Cancel อยู่ล่าง (`order-2`) ห้ามสลับ
     - **วันที่และเวลา**: ห้ามใช้ native date picker; ต้องใช้ `@/components/ui/date-input` (`DateInput`/`DateTimeInput`), แสดงปี **ค.ศ. เท่านั้น (ห้ามแสดง พ.ศ.)**, ปรับเวลา UTC+7 `Asia/Bangkok` ผ่าน `@/lib/date-utils`
     - **ปุ่ม Loading State เติมสีทึบ**: ต้องใช้พื้นหลังเติมสีทึบ (`bg-emerald-600`, `bg-blue-600`, `bg-rose-600`), Spinner ชัดเจน, `disabled:opacity-85 disabled:text-white` ห้ามใช้ปุ่มโปร่งแสงขณะ Loading
     - **AlertDialog & Feedback**: ห้ามใช้ `window.alert()` / `window.confirm()`; ใช้ `@/components/ui/alert-dialog` และ Sonner `toast.success`/`toast.error` เสมอ
     - **Dropdown & Forms**: ห้ามใช้ native `<select>`; ใช้ shadcn `@/components/ui/select`, Boolean ใช้ Select `true`/`false`
6. **กฎเหล็กการใช้งานฐานข้อมูลและ MCP (Database MCP & Zero Schema Drift Policy)**
   - 📖 **Skill Pointer**: โหลดและปฏิบัติตามสกิล [`pocketwise-database-sync`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-database-sync/SKILL.md) เมื่อทำงานกับ Database หรือ Migration
   - **กฎเหล็กสรุปย่อ**:
     - ระหว่างพัฒนา: **ต้องใช้ Database Local Docker เท่านั้น** (`localhost:5432/pocketwise_db`)
     - **ห้าม** เรียกใช้ MCP เพื่อ Query, ทดสอบ, Seed หรือแก้ข้อมูลบน Supabase Production ระหว่างพัฒนาเด็ดขาด
     - เมื่อแก้โครงสร้างตาราง: ต้องอัปเดตสกีมาและรัน Migration ให้ Local และ Supabase Production ตรงกัน 100% (Zero Schema Drift)
7. **ขั้นตอนการปฏิบัติงานและการเลือกโหมดการทำงาน (Execution Modes & Quality Standards)**
   - 📖 **Skill Pointer**: โหลดและปฏิบัติตามสกิล [`pocketwise-execution-workflow`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-execution-workflow/SKILL.md) เมื่อวางแผนและส่งมอบงาน
   - **กฎเหล็กสรุปย่อ**:
     - **Track A (Fast-Track Inline Execution)**: สำหรับงาน UI, CSS, ข้อความ, ฟอร์ม, Bug Fix ทั่วไป ➔ Orchestrator ลงมือทำเองแบบ Inline จบใน 3–8 นาที ไม่ต้องแตก Subagent
     - **Track B (Full Multi-Agent Architecture)**: สำหรับงาน Feature ใหญ่, สถาปัตยกรรมหลัก, Auth, Schema ➔ ใช้กระบวนการ 6-Step Multi-Agent
     - **Smart Scoped Quality Gates**: แก้ Frontend ตรวจเฉพาะ lint/build (หรือ `tsc --noEmit`); แก้ Backend ตรวจเฉพาะ `dotnet build/test`; ห้ามรันข้ามฝั่งให้เสียเวลา
     - **Tiered QA Protocol**: Tier 1 ตรวจ Component/Snapshot < 30 วินาที; Tier 2 ทดสอบ Playwright ด้วย Browser Edge ในเครื่อง (ห้ามดาวน์โหลด external browser binary เด็ดขาด)
     - **กฎภาษา**: สนทนากับผู้ใช้เป็น **ภาษาไทย** เสมอ; สื่อสารระหว่าง Subagent ด้วยกันเป็น **ภาษาอังกฤษ 100%**
     - **🛑 กฎหยุดรอคำสั่ง**: พัฒนาถึงแค่ **Step 5 (QA Verification)** แล้วหยุดรายงานผลทันที **ห้ามข้ามไปทำ Step 6 (Deploy/PR) เองเด็ดขาดจนกว่าผู้ใช้จะสั่ง**
8. **กฎเหล็กขั้นตอนการ Deploy (Strict PR-Based Deployment Protocol)**
   - 📖 **Skill Pointer**: เมื่อผู้ใช้สั่งให้ "Deploy", "เอาขึ้น production", หรือ "เปิด PR" ให้เรียกใช้สกิล [`deploy-workflow`](file:///D:/Projects/PocketWise/.agents/skills/deploy-workflow/SKILL.md) ทันที
   - **กฎเหล็กสรุปย่อ**: ห้าม Push โค้ดตรงเข้า `main` เด็ดขาด; Commit เข้า `develop` ➔ เปิด PR เข้า `main` ➔ เฝ้า CI ให้ผ่าน 100% ➔ Sync Supabase Schema ➔ Confirm Merge
9. **มาตรฐานระบบส่งอีเมล เทมเพลต และลิงก์การทำงาน (Email Delivery & Actionable Link Standard)**
   - 📖 **Skill Pointer**: โหลดและปฏิบัติตามสกิล [`pocketwise-email-delivery`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-email-delivery/SKILL.md) เมื่องานเกี่ยวข้องกับอีเมล
   - **กฎเหล็กสรุปย่อ**: ห้ามส่ง Raw Token ดิบในอีเมล; ต้องมีปุ่ม CTA ขนาดใหญ่ + ลิงก์ URL สำรอง; Token ต้องเข้ารหัส `Base64UrlEncode`; ลิงก์ห้ามตกไปที่ `localhost` บนเซิร์ฟเวอร์จริง; ส่งผ่าน HTTPS Port 443 REST API (Cloud Egress Safe)

---

## 🧭 3. กฎย่อยประจำแต่ละส่วนของโปรเจค (Sub-Rules Navigation)

โปรเจคนี้แบ่ง Rule ตามขอบเขตการทำงานเพื่อให้ AI วางโค้ดได้อย่างถูกต้อง:

| ขอบเขตงาน | เอกสาร Rule ประจำส่วน | สิ่งที่ต้องศึกษาใน Rule |
|---|---|---|
| **ภาพรวมทั้งโปรเจค** | [`/AGENTS.md`](file:///D:/Projects/PocketWise/AGENTS.md) | สถาปัตยกรรมรวม, Contract, กฎเหล็ก และ Policy |
| **Backend (Next.js Handlers)** | [`/frontend/pocketwise-web/src/lib/server/`](file:///D:/Projects/PocketWise/frontend/pocketwise-web/src/lib/server/) | Modular Route Handlers, Drizzle ORM, SSE Stream, Vercel Cron |
| **Frontend (Next.js)** | [`/frontend/AGENTS.md`](file:///D:/Projects/PocketWise/frontend/AGENTS.md) | Next.js App Router, Components, Features, Lib, Schemas, Types |
| **Backend (.NET 10 Legacy)** | [`/backend/AGENTS.md`](file:///D:/Projects/PocketWise/backend/AGENTS.md) | Clean Architecture ประวัติเดิม (Decommissioned จาก Render แล้ว) |
| **UI & UX Standard** | [`.agents/skills/pocketwise-ui-ux`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-ui-ux/SKILL.md) | Modal/BottomSheet, Mobile Button Hierarchy, Glassmorphism, Date/Time |
| **Database & Migration** | [`.agents/skills/pocketwise-database-sync`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-database-sync/SKILL.md) | Local Docker vs Supabase, Zero Schema Drift, Drizzle/EF Core Migrations |
| **Execution Workflow** | [`.agents/skills/pocketwise-execution-workflow`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-execution-workflow/SKILL.md) | Track A/B, Smart Scoped Quality Gates, Tiered QA, Stop at Step 5 |
| **Deploy Protocol** | [`.agents/skills/deploy-workflow`](file:///D:/Projects/PocketWise/.agents/skills/deploy-workflow/SKILL.md) | 10 ขั้นตอนการ Deploy มาตรฐาน, PR-Based, CI Verification |
| **Email Delivery** | [`.agents/skills/pocketwise-email-delivery`](file:///D:/Projects/PocketWise/.agents/skills/pocketwise-email-delivery/SKILL.md) | Zero raw tokens, CTA buttons, Base64Url, HTTPS delivery port 443 |
| **Tech Stack & Guideline** | [`/docs/Tech_Stack.md`](file:///D:/Projects/PocketWise/docs/Tech_Stack.md) | รายละเอียด Stack, Version Policy, Checklist และ Phase การพัฒนา |
| **Architecture (ล็อกแล้ว)** | [`/docs/ARCHITECTURE.md`](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) | ผังระบบ, Dependency ระหว่าง Layer, Request lifecycle, Auth flow |
| **API Specification** | [`/docs/API_SPECIFICATION.md`](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) | Conventions, Envelope, Error codes, Pagination, Auth endpoints |
| **Requirements (FR)** | [`/docs/REQUIREMENTS.md`](file:///D:/Projects/PocketWise/docs/REQUIREMENTS.md) | รายการ requirement ทั้งระบบ — Source of Truth ของ "ทำอะไร" |
| **Data Dictionary (Schema)** | [`/docs/DataDictionary.md`](file:///D:/Projects/PocketWise/docs/DataDictionary.md) | 25 ตาราง, ER Diagram, Business Rules ของข้อมูล (Source of Truth ของ schema) |
| **UI Handover Guide** | [`/docs/UI_MODERNIZATION_HANDOVER.md`](file:///D:/Projects/PocketWise/docs/UI_MODERNIZATION_HANDOVER.md) | สรุปงานปรับปรุง UI/UX ทั้งหมดของระบบ (ห้ามทำซ้ำในสิ่งที่เสร็จแล้ว) |
| **Design System** | [`/frontend/pocketwise-web/DESIGN.md`](file:///D:/Projects/PocketWise/frontend/pocketwise-web/DESIGN.md) | Color palette, typography, radius, spacing, do/don'ts |
