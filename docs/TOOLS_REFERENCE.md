# PocketWise — สารบัญเครื่องมือและเทคโนโลยีทั้งหมด (Tools & Technologies Reference)

> **เอกสารคู่มืออ้างอิงเครื่องมือของระบบ PocketWise**  
> บันทึกรายการเครื่องมือ (Tools), ไลบรารี (Libraries), เซอร์วิสภายนอก (Cloud Services), และชุดทดสอบ (Testing Tools) ทั้งหมดที่ใช้งานในโปรเจค พร้อมวัตถุประสงค์ คำสั่ง และตำแหน่งคอนฟิก เพื่อให้ผู้พัฒนาและ AI เข้าใจตรงกันและสืบค้นได้ง่ายในระยะยาว

---

## 📌 สรุปภาพรวมเครื่องมือจำแนกตามหมวดหมู่ (Quick Summary)

```
PocketWise Ecosystem
├── 🌐 Frontend: Next.js 16 (Turbopack) + TypeScript + Tailwind CSS v4 + shadcn/ui + Motion + Recharts
├── ⚙️ Backend: ASP.NET Core Web API (.NET 10) + EF Core (Npgsql) + Tesseract OCR
├── 🗄️ Database: PostgreSQL (Local Docker: 5432 / Production: Supabase)
├── ☁️ Hosting & Cloud: Vercel (Frontend) + Render (Backend API)
├── ⏱️ Monitoring: UptimeRobot (Free Plan - 24/7 Keep-Alive Pinger ทุก 5 นาที)
├── 🧪 Testing & QA: Playwright (Brave Browser Headed Mode) + xUnit (.NET 10)
└── 🚀 DevOps & CI/CD: GitHub Actions (Automated PR Gates) + GitHub CLI (gh)
```

---

## 🌐 1. เครื่องมือฝั่ง Frontend (Web Application)

| ชื่อเครื่องมือ / Library | เวอร์ชัน | หน้าที่และวัตถุประสงค์ (What & Why) | ตำแหน่งโค้ด / คอนฟิก |
| :--- | :---: | :--- | :--- |
| **Next.js (App Router)** | `16.4.2` | เฟรมเวิร์กหลักสำหรับสร้างเว็บแอปพลิเคชัน รองรับ Server Components, Server-Side Rendering (SSR), และ Client-Side Routing แบบความเร็วสูงด้วย Turbopack | `frontend/pocketwise-web/` |
| **TypeScript** | `^5` | ภาษาหลักฝั่ง Frontend เพิ่มความปลอดภัยด้านชนิดข้อมูล (Type-Safe) เชื่อมโยง Data Contracts กับ Backend | `tsconfig.json` |
| **Tailwind CSS v4** | `^4.0` | เครื่องมือจัดสไตล์หน้าเว็บด้วย Utility Classes ร่วมกับ Modern CSS variables (`--pw-*` design tokens) และ `@tailwindcss/postcss` | `src/app/globals.css`<br>`postcss.config.mjs` |
| **shadcn/ui + Radix UI** | Nova Theme | ชุด UI Primitives แบบ Headless Accessibility (Dialog, Select, Popover, Dropdown, FormField) ที่นำโค้ดมาปรับแต่งสไตล์ Glassmorphism ในระบบ | `src/components/ui/` |
| **Motion (`motion/react`)** | `^14.5.0` | ไลบรารีแอนิเมชันสำหรับ React: Staggered list fade-in (`AnimatedList`), Spring counter หมุนตัวเลข (`AnimatedNumber`), Page transitions, และ Micro-interactions บนปุ่ม | `src/components/ui/` |
| **Recharts** | `^3.10.1` | ไลบรารีกราฟสถิติและการเงิน สำหรับหน้ารายงาน (`/reports`): Donut Chart สัดส่วนรายจ่าย, Bar Chart และ Line Chart แยกสกุลเงินอย่างชัดเจน | `src/features/reports/` |
| **Lucide React** | ล่าสุด | ชุดไอคอน Vector คุณภาพสูง ครอบคลุมการเงิน หมวดหมู่ ธนาคาร และการแจ้งเตือน | Reusable ในทุก Component |
| **React Hook Form + Zod** | ล่าสุด | จัดการ State ของฟอร์มและการตรวจสอบความถูกต้องของข้อมูล (Form Validation Schema) ก่อนส่งไปยัง Backend | `src/schemas/` |
| **Sonner** | ล่าสุด | ระบบแจ้งเตือนแบบ Toast Message สไตล์ Glassmorphism ให้ Feedback ทุกการกระทำสำคัญ (`toast.success`, `toast.error`) | `src/app/layout.tsx` |
| **@microsoft/signalr** | `^10.0.11` | Client สำหรับเชื่อมต่อ WebSocket กับ Backend Hub เพื่อรับการแจ้งเตือน Real-time (เช่น งานอ่านสลิปเสร็จสิ้น, งบประมาณเกินลิมิต) | `src/lib/signalr.ts` |

---

## ⚙️ 2. เครื่องมือฝั่ง Backend (.NET Web API)

| ชื่อเครื่องมือ / Library | เวอร์ชัน | หน้าที่และวัตถุประสงค์ (What & Why) | ตำแหน่งโค้ด / คอนฟิก |
| :--- | :---: | :--- | :--- |
| **ASP.NET Core Web API** | `.NET 10.0` | เฟรมเวิร์ก Backend ประสิทธิภาพสูง จัดการ RESTful API endpoints, Business Logic, Validation และ Authentication | `backend/PocketWise.API/` |
| **Entity Framework Core (Npgsql)** | `10.0.0` | ORM สำหรับเชื่อมต่อ PostgreSQL จัดการ Query, Transactions และ Database Code-First Migrations | `PocketWise.Infrastructure/Data/` |
| **Tesseract OCR Engine** | `5.2.0` | ระบบอ่านตัวอักษรและข้อมูลตัวเลขจากภาพสลิปโอนเงิน (Slip OCR) แบบ Local ออฟไลน์ รองรับภาษาไทย (`tha`) และอังกฤษ (`eng`) | `PocketWise.Infrastructure/Services/Ocr/`<br>`tessdata/` |
| **ASP.NET Core Identity + JWT** | `.NET 10.0` | ระบบจัดการผู้ใช้ แฮชรหัสผ่าน และออก Token (JWT Access Token + Refresh Token หมุนเวียนในฐานข้อมูล) | `PocketWise.Infrastructure/Services/Auth/` |
| **OpenAPI / NSwag** | `14.7.1` | สร้างเอกสาร API อัตโนมัติ (Swagger UI) สำหรับทดสอบ API บนเครื่องพัฒนา (`http://localhost:5268/swagger`) | `backend/PocketWise.API/Program.cs` |
| **ASP.NET Core SignalR** | `.NET 10.0` | WebSocket Hub สำหรับ Broadcast เหตุการณ์แบบ Real-time ไปยัง Frontend (`/hubs/notifications`) | `PocketWise.API/Hubs/` |

---

## 🗄️ 3. ฐานข้อมูลและบริการ Cloud (Database & Cloud Infrastructure)

| ชื่อเครื่องมือ / บริการ | สภาพแวดล้อม | หน้าที่และวัตถุประสงค์ | การเชื่อมต่อ / URL |
| :--- | :---: | :--- | :--- |
| **PostgreSQL (Docker)** | Local Dev | ฐานข้อมูลหลักสำหรับการพัฒนาบนเครื่องจำลองผ่าน Docker Compose (`postgres:16-alpine`) | `localhost:5432/pocketwise_db` |
| **Supabase PostgreSQL** | Production | ฐานข้อมูล PostgreSQL บน Cloud สำหรับระบบจริง รองรับ High Availability, Automated Backups, และ SSL | `db.gctkbbkkyuphzszqntnk.supabase.co` |
| **Render** | Production | คลาวด์เซิร์ฟเวอร์โฮสต์ Backend ASP.NET Core Web API (.NET 10 Docker Container) | `https://pocketwise-api-zo94.onrender.com` |
| **Vercel** | Production | คลาวด์แพลตฟอร์มโฮสต์ Frontend Next.js พร้อม Edge Network, Automated Previews, และ CDN ทั่วโลก | `https://pocket-wise-one.vercel.app` |
| **UptimeRobot (Free Plan)** | External Monitoring | ยิง HTTP GET Request ไปยัง `/health` ทุก **5 นาที ตลอด 24 ชม.** เพื่อป้องกันไม่ให้ Render Free Instance เข้าสู่โหมดหลับ (Zero Cold Start) และแจ้งเตือนเมื่อระบบขัดข้อง | `https://uptimerobot.com`<br>Target: `/health` |

---

## 🧪 4. เครื่องมือทดสอบและตรวจสอบคุณภาพ (Testing & QA Tools)

| ชื่อเครื่องมือ | ประเภท | หน้าที่และวัตถุประสงค์ (What & Why) | คำสั่งมาตรฐานที่ใช้ |
| :--- | :---: | :--- | :--- |
| **Playwright + Brave Browser** | E2E QA Testing | ชุดทดสอบการทำงานของเว็บแบบมองเห็นหน้าจอจริง (**Visible Headed Mode: `headless: false`**) โดยเปิดผ่าน **Brave Browser** เพื่อให้ผู้ใช้มองเห็นทุกขั้นตอนการทดสอบ (ปุ่ม, ฟอร์ม, โมดอล, การตอบสนองของ UI) ได้อย่างโปร่งใส | `node tests/e2e/<script>.cjs`<br>Browser: Brave Application |
| **xUnit Test Framework** | Unit & Integration Testing | ชุดทดสอบฝั่ง Backend ครอบคลุม Domain Logic, Service Operations, Repository Mappings, และ Security Controllers (98 tests) | `dotnet test backend/PocketWise.sln` |
| **Next.js Linter (ESLint)** | Static Analysis | ตรวจสอบคุณภาพโค้ด TypeScript/React, กฎของ Hooks และ Best Practices | `npm run lint` (ในโฟลเดอร์ frontend) |

---

## 🚀 5. เครื่องมือ DevOps และควบคุมเวอร์ชัน (DevOps & Version Control)

| ชื่อเครื่องมือ | หน้าที่และวัตถุประสงค์ | ประโยชน์ที่ได้รับ |
| :--- | :--- | :--- |
| **Git** | ระบบควบคุมเวอร์ชันของโค้ด (Source Control Management) | ติดตามประวัติการแก้ไขและแยกสายงานตามนโยบาย `develop` ➔ `main` |
| **GitHub Actions** | Automated CI/CD Pipeline (`.github/workflows/ci.yml`) | ตรวจสอบคุณภาพโค้ดอัตโนมัติเมื่อเปิด Pull Request (รัน .NET Build/Tests และ Next.js Build) ป้องกันโค้ดพังขึ้นสู่ Production |
| **GitHub CLI (`gh`)** | เครื่องมือสั่งการ GitHub จากเทอร์มินัล | บริหารจัดการ Pull Requests, ตรวจสอบสถานะ CI checks (`gh pr checks`), และควบคุม Workflow |

---

## 💻 6. คำสั่งมาตรฐานสำหรับพัฒนาและทดสอบ (Cheat Sheet)

```bash
# 1. รันระบบ Local ทั้งหมด (Frontend + Backend)
./run.cmd

# 2. ทดสอบ Backend ทั้งหมด
dotnet test backend/PocketWise.sln -c Release

# 3. ตรวจสอบ Lint และ Build ของ Frontend
cd frontend/pocketwise-web
npm run lint
npm run build

# 4. ทดสอบ QA บนหน้าจอจริงด้วย Brave Browser UI (Headed Mode)
node tests/e2e/qa_step5_brave_ci_validation.cjs
```

---
*เอกสารนี้ได้รับการบันทึกและตรวจสอบโดย AI Architecture Assistant สำหรับโปรเจค PocketWise*
