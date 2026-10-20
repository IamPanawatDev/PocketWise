# PocketWise — REQUIREMENTS.md (จาก Requirement Sheets ต้นทาง)

> **ที่มา (Source):** Google Sheets "ระบบบันทึกรายรับรายจ่าย" — [เปิดชีต](https://docs.google.com/spreadsheets/d/11xfdjcAKEbh7a6l6B9u8y_1ksIM2il1xeDpOelm7KRw/edit) (local shortcut: `docs/ระบบบันทึกรายรับรายจ่าย.url`)
> **สถานะ:** แปลงจากชีตต้นทางมาเป็น structured requirements — สถานะของแต่ละรายการ (FR) ระบุปีกำกับ; ห้ามเดา scope ที่ไม่ปรากฏในชีต (Zero Guessing)
> **บทบาทของเอกสาร:** รายการ requirement ของระบบ ใช้เป็นแหล่งอ้างอิงกลางสำหรับทำ backlog/planning — Data contract ลงลึกที่ `/docs/DataDictionary.md`, ขั้นตอนพัฒนาที่ `/docs/DEVELOPMENT_GUIDELINE.md`

---

## 1. ขอบเขตระบบ (System Scope) — จากชีต "ภาพรวมระบบ"

| # | ระบบหลัก | คำอธิบายตามชีต |
|:-:|---|---|
| S1 | **ระบบบันทึกรายรับรายจ่าย** | บันทึกรายการอัตโนมัติจากสลิปธนาคาร เพิ่มรายการเอง และรวบรวมข้อมูลค่าใช้จ่ายไว้ในแอปเดียว |
| S2 | **ระบบจัดการบัตรเครดิต** | นำเข้าใบแจ้งยอดบัตรเครดิต บันทึกยอดซื้อ ยอดผ่อน ดอกเบี้ย และเงินคืนตามข้อมูลที่รองรับ |
| S3 | **ระบบวิเคราะห์และวางแผนการเงิน** | สรุปค่าใช้จ่ายตามหมวดหมู่ แท็ก ธนาคาร และช่วงเวลา พร้อมตั้งงบประมาณและติดตามพฤติกรรมการใช้เงิน |

---

## 2. Functional Requirements (FR) — จากชีต "รายละเอียดฟีเจอร์ทั้งหมด"

### F1 — บันทึกอัตโนมัติจากสลิปธนาคาร

> Goal ตามชีต: "อ่านสลิปจากแอปธนาคารที่รองรับ รวมถึงธนาคารไทย 20 แอปตามข้อมูลเว็บไซต์"

| FR | รายการ | สถานะใน roadmap* |
|:-:|---|:-:|
| FR1.1 | อ่านสลิปจากแอปธนาคารที่รองรับ (รวมธนาคารไทย ~20 แอป) | ✅ Phase 7 (Local Slip Parser & Review Flow) |
| FR1.2 | ดึงชื่อผู้รับเงินและจำนวนเงิน | ✅ Phase 7 |
| FR1.3 | อัปโหลดสลิปการโอนเงิน | ✅ Phase 7 |
| FR1.4 | แยกดูรายการตามธนาคาร | ✅ Phase 4 |
| FR1.5 | จัดการรายการย้ายเงินระหว่างบัญชี (TransferGroups) | ✅ Phase 4 |

### F2 — เพิ่มรายการด้วยตนเอง

| FR | รายการ | สถานะใน roadmap |
|:-:|---|:-:|
| FR2.1 | เพิ่มรายจ่ายเงินสด | ✅ Phase 4 |
| FR2.2 | เพิ่มรายจ่ายบัตรเครดิต | ✅ Phase 5: CreditCards CRUD + transaction form picker |
| FR2.3 | เพิ่มรายรับ เช่น เงินเดือน | ✅ Phase 4 |
| FR2.4 | ระบุรายละเอียดรายการและจำนวนเงิน | ✅ Phase 4 |
| FR2.5 | เลือกหมวดหมู่และแท็ก | ✅ Phase 4 |
| FR2.6 | แก้ไขรายละเอียดการจัดหมวดหมู่ของรายการ | ✅ Phase 4 |
| FR2.7 | ตั้งรายการที่เกิดซ้ำล่วงหน้า เช่น ค่าเช่าบ้านหรือค่าสมาชิก (RecurringTransactions) | ✅ Phase 5 |

### F3 — ระบบหมวดหมู่และแท็ก

#### F3.1 หมวดหมู่รายจ่าย

| FR | รายการ | สถานะ |
|:-:|---|:-:|
| FR3.1.1 | จัดหมวดหมู่ค่าใช้จ่ายอัตโนมัติจากฐานข้อมูลร้านค้าที่รู้จัก (Merchants + CategoryRules) | ✅ Phase 5 |
| FR3.1.2 | สร้างหมวดหมู่เองได้ | ✅ Phase 4 |
| FR3.1.3 | จำหมวดหมู่ที่เคยเลือก เพื่อช่วยเลือกให้อัตโนมัติในครั้งถัดไป (CategoryRules) | ✅ Phase 5 |
| FR3.1.4 | เปลี่ยนหมวดหมู่และจัดเรียงลำดับหมวดหมู่ | ✅ Phase 4 |

#### F3.2 แท็ก (#Tags)

| FR | รายการ | สถานะ | หมายเหตุ |
|:-:|---|:-:|---|
| FR3.2.1 | สร้างแท็กเอง เช่น `#บัตรเครดิต`, `#เที่ยวญี่ปุ่น`, `#ให้แม่` | ✅ Phase 4 | |
| FR3.2.2 | ติดแท็กให้รายการเพื่อรวบรวมค่าใช้จ่ายตามเรื่องที่สนใจ | ✅ Phase 4 | TransactionTags |
| FR3.2.3 | ใช้แท็กช่วยติดตามงบประมาณเฉพาะเรื่อง | ✅ Phase 5 | Budgets scopeType=tag |
| FR3.2.4 | ค้นหาและกรองรายการตามแท็ก | ✅ Phase 4 | |
| FR3.2.5 | จัดเรียงและลบแท็ก | ✅ Phase 4 | |
| FR3.2.6 | สร้างได้สูงสุด 20 แท็ก | ✅ กฎ Business (DataDictionary) | backend ตรวจ limit และคืน `TAG_LIMIT_REACHED` |

### F4 — ระบบค้นหาและจัดการรายการ

| FR | รายการ | สถานะ |
|:-:|---|:-:|
| FR4.1 | ดูรายการรายรับรายจ่ายย้อนหลัง | ✅ Phase 4 |
| FR4.2 | ค้นหารายการ | ✅ Phase 4 |
| FR4.3 | กรองรายการตามธนาคาร | ✅ Phase 4 |
| FR4.4 | กรองตามหมวดหมู่และแท็ก | ✅ Phase 4 |
| FR4.5 | เรียงรายการตามจำนวนเงิน | ✅ Phase 4 |
| FR4.6 | ดูสรุปรายการแยกตามหมวดหมู่ | ✅ Phase 5 (reports) |
| FR4.7 | เลือกดูช่วงเวลาที่ต้องการ | ✅ Phase 4 (ช่วงวันที่ของรายการ) |
| FR4.8 | จัดการรายการที่นำเข้าจากสลิป | ✅ Phase 7 (Slip import review & confirm) |
| FR4.9 | ปรับแต่งข้อมูลรายการเพื่อให้สรุปค่าใช้จ่ายได้ตรงตามการใช้งาน | ✅ Phase 4 |

### F5 — ระบบงบประมาณ (Budget Management)

#### F5.1 ตั้งงบประมาณ

| FR | รายการ | สถานะ |
|:-:|---|:-:|
| FR5.1.1 | ตั้งงบรายจ่ายรวม (overall) | ✅ Phase 5 |
| FR5.1.2 | ตั้งงบแยกตามหมวดหมู่ (scopeType=category) | ✅ Phase 5 |
| FR5.1.3 | ตั้งงบตามแท็ก (scopeType=tag) | ✅ Phase 5 |
| FR5.1.4 | กำหนดงบเพื่อควบคุมค่าใช้จ่ายในช่วงเวลาที่ต้องการ (period) | ✅ Phase 5 |

#### F5.2 ติดตามและแจ้งเตือนงบ

| FR | รายการ | สถานะ | หมายเหตุ |
|:-:|---|:-:|---|
| FR5.2.1 | ติดตามยอดใช้จ่ายเทียบกับงบที่ตั้งไว้ | ✅ Phase 5 | |
| FR5.2.2 | แจ้งเตือนเมื่อใช้จ่ายใกล้ถึงงบ **ผ่าน email ที่ลงทะเบียน** | ✅ Phase 5 | ส่งอีเมลแจ้งเตือนงบ (ใกล้ถึงขีดจำกัด/เกินงบ) ผ่าน built-in SMTP (SmtpEmailService), รองรับ dev mode mock log, เคารพ EmailBudgetAlertsEnabled, บันทึก NotificationChannel.Email และ in-app SignalR เรียบร้อย |
| FR5.2.3 | แก้ไขงบประมาณ | ✅ Phase 5 | |
| FR5.2.4 | ลบงบที่ไม่ใช้แล้ว | ✅ Phase 5 | |

### F6 — ระบบ Dashboard และวิเคราะห์การเงิน

#### F6.1 ภาพรวมรายรับรายจ่าย

| FR | รายการ | สถานะ |
|:-:|---|:-:|
| FR6.1.1 | สรุปค่าใช้จ่ายตามหมวดหมู่ | ✅ Phase 5 |
| FR6.1.2 | ดูภาพรวมรายจ่ายจากสลิปและบัตรเครดิต | ✅ Phase 5/7 | สรุปภาพรวมรายจ่ายสลิป vs. บัตรเครดิต, สัดส่วน %, จำนวนรายการ, breakdown รายบัตร และ navigation กรองรายการ/บัตรเครดิตครบถ้วน |
| FR6.1.3 | แยกดูค่าใช้จ่ายตามธนาคาร | ✅ Phase 5 |
| FR6.1.4 | แสดงสัดส่วนการใช้จ่ายแต่ละหมวด (percentage breakdown) | ✅ Phase 5 |

#### F6.2 กราฟและแนวโน้ม

| FR | รายการ | สถานะ |
|:-:|---|:-:|
| FR6.2.1 | สรุปรายสัปดาห์ | ✅ Phase 5 |
| FR6.2.2 | สรุปรายเดือน | ✅ Phase 5 |
| FR6.2.3 | สรุปรายไตรมาส | ✅ Phase 5 |
| FR6.2.4 | สรุปรายปี | ✅ Phase 5 |
| FR6.2.5 | เปรียบเทียบค่าใช้จ่ายข้ามเดือน | ✅ Phase 5 |
| FR6.2.6 | ดูแนวโน้มการใช้เงินเพิ่มขึ้นหรือลดลง | ✅ Phase 5 |
| FR6.2.7 | กรองกราฟตามหมวดหมู่และแท็ก | ✅ Phase 5 |

#### F6.3 ระบบตั้งค่าและปรับแต่งแอป

| FR | รายการ | สถานะ |
|:-:|---|:-:|
| FR6.3.1 | ปรับธีมของแอป (Dark, Light) | ✅ Phase 5.5 — settings persisted and verified end-to-end |
| FR6.3.2 | ตั้งค่าข้อมูลส่วนตัว | ✅ Phase 5.5 — profile persisted and verified end-to-end |
| FR6.3.3 | เปลี่ยนเบอร์มือถือ | ✅ Phase 5.5 — persisted and verified end-to-end |
| FR6.3.4 | เปลี่ยนอีเมล | ✅ Phase 5.5 — persisted; IsEmailVerified reset per D35 and verified end-to-end |
| FR6.3.5 | แก้ไขวันเกิด | ✅ Phase 5.5 — persisted and verified end-to-end |
| FR6.3.6 | ล้างข้อมูลเพื่อเริ่มต้นใหม่ (data reset) | ✅ Phase 5.5 — soft-delete, preserved identity/settings, and refresh-token revocation verified end-to-end |
| FR6.3.7 | ยืนยันอีเมลของผู้ใช้ (Email Verification) — ส่งลิงก์ยืนยันทางอีเมลและอัปเดตสถานะ IsEmailVerified | ✅ Phase 5.5/D42 — Built-in ASP.NET Core Identity Token + SmtpEmailService (0 บาท ฟรี 100%), 60s Cooldown, URL-safe Base64Url, หน้า /verify-email และ UI ตั้งค่าพร้อมเทสต์ครบ 100% |

### F7 — ระบบบทบาทและสิทธิ์ (Role-Based Access Control) — เพิ่มจากเจ้าของโปรเจค (D13, D41)

| FR | รายการ | สถานะ | หมายเหตุ |
|:-:|---|:-:|---|
| FR7.1 | จัดการบทบาทผู้ใช้ (Roles) — สร้าง/แก้ไข/ปิดใช้งาน/ลบ | ✅ Phase 3 (D41) | ตาราง Roles, RolesManager หน้า /admin/permissions, ป้องกันการลบ Admin |
| FR7.2 | จัดการรายการสิทธิ์ (Permissions) — ดูสิทธิ์แยกตามโมดูล | ✅ Phase 3 (D41) | ตาราง Permissions 15 สิทธิ์ 6 โมดูล พร้อม Seed อัตโนมัติ |
| FR7.3 | กำหนดหนึ่งหรือหลายบทบาทให้ผู้ใช้ (UserRoles) | ✅ Phase 3 (D41) | ตาราง UserRoles, UserRolesManager หน้า /admin/permissions พร้อมค้นหา |
| FR7.4 | กำหนดสิทธิ์ให้แต่ละบทบาท (RolePermissions) | ✅ Phase 3 (D41) | ตาราง RolePermissions, RolePermissionsMatrix หน้า /admin/permissions |
| FR7.5 | บังคับสิทธิ์ตาม role ตอน authorize ทุก endpoint | ✅ Phase 3 (D41) | ClaimTypes.Role ใน JWT + [Authorize(Roles = "Admin")] บน Admin API |

### F8 — บันทึกประวัติการเปลี่ยนแปลง (Audit Logs) — เพิ่มจากเจ้าของโปรเจค (D13)

| FR | รายการ | สถานะ | หมายเหตุ |
|:-:|---|:-:|---|
| FR8.1 | บันทึกเหตุการณ์สำคัญ (CREATE/UPDATE/DELETE/IMPORT) พร้อม actor + entity | ⬜ | ตาราง AuditLogs |
| FR8.2 | ดูย้อนหลังการแก้ไข/ลบข้อมูลและเหตุการณ์นำเข้า (สำหรับเจ้าของข้อมูล) | ⬜ | per-user |

---

## 3. ข้อกำหนดไม่ใช่ฟังก์ชัน (NFRs) ที่ผูกกับ requirements นี้

> ตัวเลขกฎฉบับเต็มอยู่ที่ source of truth ของแต่ละเรื่อง (ดูตาราง SoT ใน `/docs/DEVELOPMENT_GUIDELINE.md`) — บรรทัดนี้ระบุ**ความผูกพันต่อ FR** เท่านั้น

| Rule (ผูกกับ FR ข้างบน) | ผูกกับ FR | Source of Truth ฉบับเต็ม |
|---|---|---|
| soft delete (`IsDeleted`) ตารางการเงิน 9 ตาราง — ห้ามลบถาวร | ทุก FR ฝั่งรายการ/งบ/บัตร | D5 (playbook) + DataDictionary |
| เก็บเวลา UTC + แสดงตาม timezone ผู้ใช้ | ทุก FR ที่มีช่วงเวลา (F4, F5, F6.2) | DataDictionary |
| Tag limit 20 tags ต่อผู้ใช้ (validate ฝั่ง backend) | FR3.2.6 | DataDictionary |
| Duplicate detection (FileHash / TransactionReference / จำนวน+เวลา) | FR1.x, FR4.8 | DataDictionary |
| Auth: JWT + refresh (hash/rotation/multi-device) | (prerequisite ของทุก FR — ไม่ใช่ FR จากชีต) | D1 + ARCHITECTURE §5 |
| ทุก endpoint ตอบ wrapped envelope | ทุก FR (implementation policy) | D8 + API_SPECIFICATION |
| per-user authorization ทุก record | ทุก FR | ARCHITECTURE §5 + Tech_Stack §8 |

*สถานะ "ใน roadmap" ใส่เพื่อชี้ว่ารายการนี้จะถูกสร้างใน Phase ไหนตาม `/docs/DEVELOPMENT_GUIDELINE.md` — ไม่ใช่คำมั่นวันเวลา; หากลำดับจริงปรับ ให้แก้ที่ playbook และตารางนี้ให้สอดคล้องกัน*

---

## 4. สิ่งที่อยู่นอกขอบเขตเอกสารนี้ (จากชีต — ไม่มีข้อมูลให้ตีความ)

**ชีต 2 แผ่นกล่าวถึงเฉพาะฟีเจอร์ F1–F6 — รายการด้านล่างไม่มีข้อมูลในชีตต้นทาง** (ระบบยังไม่กำหนด ต้องถามเจ้าของโปรเจคก่อน implement หากงานทับถึง):

- การ register/log in/log out (คุณสมบัติ auth ปรากฏเฉพาะใน DataDictionary/Tech_Stack ไม่ใช่ใน requirement sheets)
- Multi-currency, ฟอร์เวิร์ด exchange rate, และ bank aggregation API
- Export รายงานเป็นไฟล์ (CSV/XLSX/PDF)
- การ share/แชร์รายงานกับ user อื่น, การ invite สมาชิก
- Mobile native app, PWA, offline-mode specifics

> **หมายเหตุ (D13):** F7 (RBAC) และ F8 (AuditLogs) **ถูกเพิ่มภายหลังชีตต้นทาง** ตามคำสั่งเจ้าของโปรเจค — อยู่ในขอบเขต implement แล้ว (ไม่ใช่ "นอกขอบเขต" อีกต่อไป) ดู §2. **D12 (สร้างเฉพาะ 20/25 ตาราง) ถูกยกเลิก** — DataDictionary + Phase 2 สร้างครบ 25 ตาราง

---

## 5. Checklist การใช้งาน (สำหรับ AI และเจ้าของโปรเจค)

- [ ] FR ไหนที่จะเริ่มสร้าง — ทำ mapping ไปที่ Phase ของ playbook แล้ว
- [ ] ข้อมูลขาด (ระบุใน §4) — ถามเจ้าของโปรเจคก่อนเขียนโค้ด (Zero Guessing)
- [ ] จบ feature: อัปเดตสถานะ FR ในเอกสารนี้ (⬜ → 🟡 → ✅) ควบคู่กับตารางสถานะใน DEVELOPMENT_GUIDELINE.md
- [ ] **จบ implement: อัปเดตรายการที่เกี่ยวข้องใน `/docs/IMPLEMENTATION_CHECKLIST.md` ทุกครั้ง** (ติ๊ก ⬜ → 🟡 → ✴️/✅ ตามขอบเขต — และบันทึก FR id ที่จับคู่ไว้ ให้ตรงกับ status ในเอกสารนี้)
- [ ] Schema/contract เปลี่ยน — sync กับ DataDictionary และ types ฝั่ง FE ในงานเดียวกัน

---

*เอกสารนี้แปลงจาก requirement sheets ต้นทาง (2 แผ่น: "ภาพรวมระบบ", "รายละเอียดฟีเจอร์ทั้งหมด") — หากแก้ชีตต้นทาง ให้อัปเดตเอกสารนี้ด้วย และชี้เสมอว่าชีตคือ requirement source, เอกสารนี้คือบันทึก structured + status tracking*