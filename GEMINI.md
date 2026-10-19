# PocketWise — Master AI Engineering Rules & Full-Stack System Guide

> **สำคัญมากสำหรับ AI Assistant**: เอกสารนี้เป็น Master Rule ระดับ Root ของทั้งโปรเจค PocketWise ที่ AI ต้องอ่านและปฏิบัติตามทุกครั้ง ไม่ว่าจะทำงานในส่วน Backend, Frontend หรือเอกสารระบบ

---

## 🏗️ 1. สถาปัตยกรรมระบบภาพรวม (System Architecture)

ระบบ PocketWise ใช้สถาปัตยกรรมแบบแยกส่วน (Decoupled Full-Stack Architecture) — **ผังฉบับเต็ม (ระบบ, dependency, request lifecycle, auth flow, SQL Server, SignalR) อยู่ที่ [`/docs/ARCHITECTURE.md`](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) เท่านั้น (SoT เดียว — ห้ามเขียนโค้ดขัดกับผังนั้น)**

### กฎสถาปัตยกรรมระดับ Root:
- **Frontend ต้องไม่เชื่อมต่อกับ SQL Server โดยตรง**: การเข้าถึงข้อมูลทั้งหมดต้องผ่าน ASP.NET Core Web API เท่านั้น
- **SignalR มีไว้สำหรับ Server-Pushed Events เท่านั้น**: ใช้แจ้งเตือนแบบ Real-time, อัปเดตสถานะงาน (Import/OCR/Status) **ห้าม** ใช้ SignalR แทนที่ REST API หรือฐานข้อมูลหลัก
- **Single Source of Truth**: Backend เป็นผู้กำหนด Business Logic, Validation หลัก และ Data Contracts เสมอ

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
   - อัปเดตรายการเวอร์ชันและคำสั่งใน `/docs/Tech_Stack.md` หรือ Appendix A/B ของ `/docs/DEVELOPMENT_GUIDELINE.md` ตามความเหมาะสม; ถ้า tool กระทบ architecture, code generation, API/schema หรือ workflow ให้ sync เอกสาร Source of Truth ที่เกี่ยวข้องด้วย
   - ระบุว่าเป็นของที่ติดตั้งแล้วหรือเป็นเพียงตัวเลือกให้ชัดเจน และเอารายการออก/ปรับสถานะเมื่อถอดถอนหรือเลิกใช้; ห้ามบันทึก secret หรือ credential ในเอกสาร

---

## 🧭 3. กฎย่อยประจำแต่ละส่วนของโปรเจค (Sub-Rules Navigation)

โปรเจคนี้แบ่ง Rule ตามขอบเขตการทำงานเพื่อให้ AI วางโค้ดได้อย่างถูกต้อง:

| ขอบเขตงาน | เอกสาร Rule ประจำส่วน | สิ่งที่ต้องศึกษาใน Rule |
|---|---|---|
| **ภาพรวมทั้งโปรเจค** | [`/AGENTS.md`](file:///D:/Projects/PocketWise/AGENTS.md) | สถาปัตยกรรมรวม, Contract, กฎเหล็ก และ Policy |
| **Backend (.NET 10)** | [`/backend/AGENTS.md`](file:///D:/Projects/PocketWise/backend/AGENTS.md) | Clean Architecture, โฟลเดอร์ที่ต้องวาง Entity, DTO, Service, Controller, Hub |
| **Frontend (Next.js)** | [`/frontend/AGENTS.md`](file:///D:/Projects/PocketWise/frontend/AGENTS.md) | Next.js App Router, โฟลเดอร์ที่ต้องวาง Components, Features, Lib, Schemas, Types |
| **Tech Stack & Guideline** | [`/docs/Tech_Stack.md`](file:///D:/Projects/PocketWise/docs/Tech_Stack.md) | รายละเอียด Stack, Version Policy, Checklist และ Phase การพัฒนา |
| **Architecture (ล็อกแล้ว)** | [`/docs/ARCHITECTURE.md`](file:///D:/Projects/PocketWise/docs/ARCHITECTURE.md) | ผังระบบ, ทิศทาง Dependency ระหว่าง Layer, Request lifecycle, Auth flow, กฎการเชื่อมต่อ — ห้ามสร้าง Architecture คนละแบบ |
| **API Specification (สัญญา)** | [`/docs/API_SPECIFICATION.md`](file:///D:/Projects/PocketWise/docs/API_SPECIFICATION.md) | Conventions, Envelope, Error codes, Pagination, Auth endpoints, SignalR events — สัญญา FE↔BE ก่อนพัฒนาจริง (Swagger คือ REST spec หลัก) |
| **Playbook ต่อ Phase** | [`/docs/DEVELOPMENT_GUIDELINE.md`](file:///D:/Projects/PocketWise/docs/DEVELOPMENT_GUIDELINE.md) | ขั้นตอนเชิงปฏิบัติต่อ Phase, คำสั่งที่ใช้จริง, สถานะความคืบหน้า, Decision Points และ Decision Ledger |
| **Implementation Checklist** | [`/docs/IMPLEMENTATION_CHECKLIST.md`](file:///D:/Projects/PocketWise/docs/IMPLEMENTATION_CHECKLIST.md) | Checklist ติดตามงาน implement รายรายการต่อ phase — อัปเดตทุกครั้งที่ implement เสร็จ (กติกา §11 ของ playbook) |
| **Requirements (FR)** | [`/docs/REQUIREMENTS.md`](file:///D:/Projects/PocketWise/docs/REQUIREMENTS.md) | รายการ requirement ทั้งระบบ (แปลงจาก Requirement Sheets), สถานะต่อ FR, ขอบเขตนอก scope — Source of Truth ของ "ทำอะไร" |
| **Data Dictionary (Schema)** | [`/docs/DataDictionary.md`](file:///D:/Projects/PocketWise/docs/DataDictionary.md) | **25 ตาราง** (ครบทั้งหมดตาม D13), ER Diagram, Business Rules ของข้อมูล (Source of Truth ของ schema) |

---

## 🎨 4. Design System (DESIGN.md)

โปรเจคนี้ใช้ design system กลางสำหรับงาน UI ทั้งหมด:

- ไฟล์ Design System อยู่ที่ [`/frontend/pocketwise-web/DESIGN.md`](file:///D:/Projects/PocketWise/frontend/pocketwise-web/DESIGN.md) (ติดตั้งผ่าน `npx getdesign@latest add discord`)
- **AI ที่จะเขียน UI/หน้าจอ/Component ใด ๆ ฝั่ง Frontend ต้องอ่านและอ้างอิง token จาก DESIGN.md ก่อนเสมอ** (สี, typography, radius, spacing, components, do/don'ts)
- ห้ามออกแบบ UI โดยเดาสี/ฟอนต์/spacing เอง — ทุกค่าต้องอ้าง token จากไฟล์นี้
- รายละเอียดกฎการใช้งานและการปรับให้เหมาะกับโปรเจคการเงิน ดู §4 ของ [`/frontend/AGENTS.md`](file:///D:/Projects/PocketWise/frontend/AGENTS.md)

---

## 📋 5. ลำดับขั้นตอนการทำงานของ AI (Standard Workflow)

```mermaid
flowchart TD
    A["ได้รับคำสั่งจากผู้ใช้"] --> B["ศึกษา Tech_Stack.md และโค้ดเดิมใน /backend และ /frontend"]
    B --> C{"มีจุดที่ไม่ชัดเจนหรือไม่?"}
    C -- "มี / ไม่แน่ใจ" --> D["หยุดทันที แล้วถามผู้ใช้ ห้ามคิดเอง"]
    D --> E["ได้รับคำตอบจากผู้ใช้"]
    E --> B
    C -- "ชัดเจนครบถ้วน" --> F{"ต้องใช้ Library ใหม่หรือไม่?"}
    F -- "ต้องใช้ แต่ยังไม่ได้รับอนุญาต" --> G["ขออนุญาตติดตั้ง Package จากผู้ใช้ก่อน"]
    G --> H["ผู้ใช้ยินยอม"]
    H --> I["ระบุโฟลเดอร์ที่ถูกต้องตาม AGENTS.md ของฝั่งนั้นๆ"]
    F -- "ไม่ต้องใช้ Library เพิ่ม" --> I
    I --> J["เริ่มลงมือเขียนโค้ดตามโครงสร้างที่กำหนด"]
    J --> K["ทดสอบ Build / Lint ให้ผ่าน 100%"]
```
