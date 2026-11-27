---
name: pocketwise-database-sync
description: >-
  Database MCP usage and zero schema drift policy for PocketWise. Use when designing schemas, altering tables/columns,
  creating migrations, running DB scripts, or deploying database changes between Local Docker and Supabase Production.
---

# PocketWise Database MCP & Zero Schema Drift Policy

> **สำคัญสำหรับ AI Assistant**: ห้ามเกิด Database Schema Mismatch หรือ Schema Drift ระหว่างเครื่องพัฒนา (Local Docker) และ Production (Supabase) โดยเด็ดขาด

---

## 🔒 1. นโยบายการเข้าถึงฐานข้อมูลระหว่างพัฒนา (Implementation Phase)

- **ต้องใช้ Database Local (Docker) เท่านั้น**:
  - การต่อเชื่อมฐานข้อมูลระหว่างพัฒนาและการทดสอบต้องชี้ไปที่ PostgreSQL Local Docker (`0.0.0.0:5432/pocketwise_db`) หรือใช้ MCP `pocketwise-postgres` ที่ชี้ไปยัง Local เท่านั้น
- **ข้อห้ามเด็ดขาด**:
  - **ห้าม** เรียกใช้ MCP หรือคำสั่ง SQL เพื่อ Query, ทดสอบ, Seed หรือแก้ไขข้อมูลบน Supabase Production ในระหว่างการ Implement โดยเด็ดขาด เพื่อป้องกันผลกระทบต่อข้อมูลจริงของผู้ใช้

---

## 🔄 2. ขั้นตอนการจัดการ Schema Changes & Zero Schema Drift

หากมีการอัปเดต, เพิ่ม, ลบ หรือแก้ไขโครงสร้างตาราง (Columns, Tables, Data Types, Constraints, Foreign Keys หรือ Indexes):

### 1. Source of Truth
- ตรวจสอบและอัปเดต Data Dictionary ที่ [`/docs/DataDictionary.md`](file:///D:/Projects/PocketWise/docs/DataDictionary.md) ให้ตรงตามโครงสร้างจริง
- ตรวจสอบ Schema ฝั่ง Next.js ที่ `src/lib/server/db/schema.ts` (Drizzle ORM) ให้มีคอลัมน์และประเภทข้อมูลตรงกับตารางจริงใน PostgreSQL

### 2. Migration Scripts
- จัดทำ SQL Migration Script ให้ครบถ้วน รองรับ idempotency (เช่น `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`)
- กรณีใช้ EF Core: สร้าง Code-First Migration ใน `PocketWise.Infrastructure` ให้เรียบร้อย

### 3. ขั้นตอนการ Deploy สู่ Production (Zero Schema Drift)
- การรัน Script อัปเดตโครงสร้างตารางบน Supabase (Production) ต้องทำให้ตรงกับ Local 100% เสมอ
- **สกีมาและคอลัมน์ทั้งหมดระหว่าง Local และ Supabase Production ต้องตรงกันอย่างสมบูรณ์** ป้องกันไม่ให้เกิด Database Runtime Error หรือ 500 Internal Server Error บน Production โดยเด็ดขาด
- การ Apply Schema Migration บน Supabase Production ต้องทำควบคู่กับการ Merge เข้าสู่ branch `main`
