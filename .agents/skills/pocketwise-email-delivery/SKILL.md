---
name: pocketwise-email-delivery
description: >-
  PocketWise email delivery and actionable link standards. Use when creating or updating email templates, email
  services, password reset flows, verification emails, or background notification delivery.
---

# PocketWise Email Delivery & Actionable Link Master Standard

> **สำคัญสำหรับ AI Assistant**: ห้ามส่ง Raw Token ดิบลงในอีเมลโดยไม่มีปุ่มกดหรือลิงก์เด็ดขาด ทุกอีเมลที่มีการกระทำ (Actionable Email เช่น ยืนยันอีเมล, รีเซ็ตรหัสผ่าน, คำเชิญ, อนุมัติ) ต้องปฏิบัติตามมาตรฐานนี้ 100%

---

## 🔘 1. ห้ามพิมพ์ Token ดิบลงในอีเมลโดยไม่มีปุ่มกดหรือลิงก์ (Zero Raw Token Dumps)

ทุกอีเมลที่มีการกระทำ (Actionable Email เช่น ยืนยันอีเมล, รีเซ็ตรหัสผ่าน, คำเชิญ, แจ้งเตือน):
1. **ต้องมีปุ่ม CTA (Call-to-Action)**:
   - ขนาดใหญ่ จัดกึ่งกลาง สไตล์ Responsive ที่นิ้วแตะกดได้ง่ายบนมือถือ
   - โครงสร้าง: `<a href="{actionUrl}" target="_blank" ...>ยืนยันอีเมล / รีเซ็ตรหัสผ่าน</a>`
2. **ต้องมีลิงก์ URL สำรองแบบข้อความเต็ม**:
   - วางไว้ด้านล่างปุ่ม เพื่อให้ผู้ใช้สามารถคลิกหรือคัดลอก (Copy-Paste) ไปวางในเบราว์เซอร์ได้หากโปรแกรมอีเมลไม่รองรับปุ่มกด
3. **ห้ามส่งเฉพาะรหัส Token ดิบ (Raw Token String)**:
   - ห้ามใส่ Token ดิบในกล่องข้อความหรือ `<div>` ลอย ๆ โดยไม่มีลิงก์หรือปุ่มกดโดยเด็ดขาด

---

## 🔐 2. การเข้ารหัส Token สำหรับ URL (URL-Safe Base64 Encoding)

- Token ที่จะนำไปต่อเป็น Query Parameter ใน URL (เช่น `?token={encodedToken}`):
  - **ต้องผ่านการเข้ารหัสด้วย `Base64UrlEncode` เสมอ**
  - แทนที่ `+` ด้วย `-`
  - แทนที่ `/` ด้วย `_`
  - ตัด padding `=` ทิ้ง
  - **เหตุผล**: เพื่อป้องกันไม่ให้อักขระพิเศษหลุดหรือถูก URL Decode ผิดพลาดเมื่อผู้ใช้กดลิงก์จากอีเมลไคลเอนต์ต่าง ๆ

---

## 🌐 3. การชี้โดเมนบน Production (Never Hardcode or Fallback to Localhost on Production)

Base URL ของลิงก์ในอีเมล **ต้องไม่ตกไปที่ `http://localhost:3000` บนเซิร์ฟเวอร์จริงโดยเด็ดขาด**:
1. **ระบบ `ResolveBaseUrl`**:
   - ตรวจสอบ `Origin` หรือ `Referer` จาก Client Request หากไม่ใช่ localhost ให้ใช้โดเมนนั้น
2. **Fallback Configuration**:
   - หากไม่มี Header หรือเป็นค่าว่าง หรือส่งจาก background job/admin ต้อง Fallback ไปที่ค่าคอนฟิก `FrontendBaseUrl` ซึ่งบน Production ถูกกำหนดเป็น `https://pocket-wise.vercel.app`
3. **Route Proxy / Gateway**:
   - ฝั่ง Next.js Server (เช่น `/api/auth/register`, `/api/auth/forgot-password`) ต้องส่งต่อ Header `Origin` หรือ `Referer` เสมอ

---

## ⚙️ 4. มาตรฐานความสอดคล้องกันทุก Service (Consistency Across Services)

- ไม่ว่าจะส่งจาก Public Auth (`AuthService`) หรือผู้ดูแลระบบ (`AdminUserService`) หรือ Scheduled Jobs **ต้องใช้มาตรฐานเทมเพลตอีเมล, ลิงก์ และการเข้ารหัส Token เดียวกัน 100%** ห้ามเขียนเทมเพลตแบบ Placeholder ชั่วคราวเด็ดขาด

---

## ☁️ 5. นโยบายพอร์ตคลาวด์และโปรโตคอลส่งอีเมล (Cloud Egress Port & HTTPS Delivery)

- **ข้อจำกัดของ Cloud Hosting**: บริการ Cloud Hosting (เช่น Render Free Tier, Vercel, Serverless) มีนโยบายบล็อกพอร์ต SMTP ขาออก (25, 465, 587)
- **ช่องทางหลัก**: ระบบส่งอีเมลหลักของโปรเจกต์ต้องรองรับการส่งผ่าน **HTTPS (Port 443) REST API** (เช่น Google Apps Script Web App Relay หรือ API Provider) เป็นอันดับแรกเสมอ
- **ช่องทางรอง**: SMTP เป็นทางเลือกรองสำหรับ Local Development เท่านั้น
