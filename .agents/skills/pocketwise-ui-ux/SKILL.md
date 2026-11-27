---
name: pocketwise-ui-ux
description: >-
  Master UI/UX, responsive, modal/bottom-sheet, animation, button hierarchy, and form standards for PocketWise. Use
  when creating, modifying, or reviewing frontend components, dialogs, forms, buttons, date pickers, or styles in
  Next.js.
---

# PocketWise UI & UX Master Standard

> **สำคัญสำหรับ AI Assistant**: เมื่อทำงานเกี่ยวกับ UI, Layout, Component, Styling, Modal, BottomSheet, Forms หรือ Animation ในโปรเจกต์ PocketWise ต้องปฏิบัติตามมาตรฐานในเอกสารนี้อย่างเคร่งครัด

---

## 📱 1. Modal, BottomSheet และ Mobile Button Hierarchy

### Desktop Modal vs Mobile BottomSheet
- ทุก Dialog หรือ Modal บนหน้าจอ Desktop (`sm` ขึ้นไป) **ต้องแสดงผลเป็น BottomSheet บนหน้าจอโทรศัพท์มือถือ (`< sm`) เท่านั้น** โดยใช้ component กลาง `@/components/ui/bottom-sheet` (ซึ่งรองรับ responsive modal/bottom-sheet ภายในตัว)

### ลำดับปุ่มบนมือถือ (Mobile Button Hierarchy Rule)
- บนหน้าจอโทรศัพท์มือถือ (`< sm`) ทุก Dialog, BottomSheet, Modal, และหน้าต่างยืนยันการลบ/ดำเนินการ (`AlertDialog` / `ConfirmDialog`):
  - **ปุ่มยืนยัน / บันทึก / ลบ (Confirm/Action/Delete) ต้องอยู่ข้างบนเสมอ (`order-1` หรือวางก่อน)**
  - **ปุ่มยกเลิก / ปิด (Cancel) ต้องอยู่ข้างล่างเสมอ (`order-2` หรือวางหลัง)**
  - **เหตุผล & กฎตายตัว**: เพื่อให้สอดคล้องกันทั้งเว็บและสะดวกต่อการใช้นิ้วโป้งกดบนมือถือ (ใช้ `data-slot="alert-dialog-action"` และ `data-slot="alert-dialog-cancel"` หรือ `BottomSheetFooter` ที่คุม `order` อัตโนมัติ) ห้ามสลับเอาปุ่มยกเลิกไว้ข้างบนเด็ดขาด

---

## 🎨 2. สไตล์ Glassmorphism, Theme และ Ambient Background

- ทั้ง Modal บน Desktop และ BottomSheet บน Mobile ต้องใช้ดีไซน์สไตล์ **Glassmorphism** (`backdrop-blur-2xl`, translucent surface, subtle hairline border, glow effect)
- **ต้องคำนึงถึง Theme Dark และ Light เสมอ**: สีตัวอักษรและคอนทราสต์ต้องคมชัด อ่านง่าย ไม่กลืนกับพื้นหลังทั้งใน Dark Mode (`var(--pw-surface-indigo)/90`) และ Light Mode (`var(--pw-surface)/90`)
- **Ambient background**: (`.pw-ambient-bg`) แสดงภาพพื้นหลังเฉพาะโหมด (Dark opacity 0.15 + blur, Light opacity 0.75)
- **Design Tokens**: อ้างอิง token จาก `/frontend/pocketwise-web/DESIGN.md` เสมอ (สี, typography, radius, spacing, do/don'ts) ห้ามเดาสีหรือสไตล์เอง

---

## 🔘 3. ปุ่มและสถานะการทำงาน (Buttons, Loading States & Dialogs)

### กฎปุ่ม Loading State เติมสีทึบ (Solid Filled Button Loading Rule)
- ทุกปุ่ม Action หรือปุ่มหลักที่มีสถานะ Loading (เช่น กำลังบันทึก, กำลังอัปโหลด, กำลังอ่านข้อมูล OCR, กำลังลบ, หรือกำลังประมวลผล) **ต้องใช้สไตล์พื้นหลังแบบเติมสีทึบ (Solid Filled Background)** เสมอ เช่น:
  - บันทึก/อัปโหลด: `bg-emerald-600 hover:bg-emerald-700 text-white font-bold`
  - ลบ/ดำเนินการสำคัญ: `bg-rose-600 hover:bg-rose-700 text-white font-bold`
  - แอ็กชันทั่วไป: `bg-blue-600 hover:bg-blue-700 text-white font-bold`
  - พร้อมเงา `shadow-md`
- **ห้าม** ใช้ปุ่มแบบโปร่งแสงหรือสไตล์ Ghost/Outline ที่ไม่มีสีพื้นหลังทึบขณะ Loading เพราะจะกลืนกับพื้นหลัง Glassmorphism และทำให้ผู้ใช้มองไม่เห็นสถานะการทำงาน
- **สถานะ Disabled ขณะ Loading**: ต้องคงความทึบแสงไว้ชัดเจน (`disabled:opacity-85`) พร้อมระบุสีตัวหนังสือ `disabled:text-white` และสีพื้นหลังเดิม (เช่น `disabled:bg-emerald-600`) ป้องกันไม่ให้ปุ่มโปร่งแสงจนมองไม่เห็นตัวหนังสือหรือไอคอน
- **Spinner และข้อความระบุสถานะ**: ต้องมี Spinner Icon (`<Loader2 className="size-4 animate-spin text-white" />`) คู่กับข้อความบอกสถานะที่ชัดเจน (เช่น "กำลังบันทึก...", "กำลังอ่านข้อมูลสลิป...", "กำลังลบออกจากคิว...") เสมอ

### การแจ้งเตือนและการยืนยัน (AlertDialog & Toast Standard)
- **ห้ามใช้ `window.confirm()` หรือ `window.alert()` ของเบราว์เซอร์โดยเด็ดขาด** เพราะทำลาย UX และดูไม่เป็นมืออาชีพ
- **ต้องใช้ `AlertDialog` หรือ `ConfirmDialog` จาก `@/components/ui/alert-dialog` เสมอ** ซึ่งรองรับ Glassmorphism, Responsive (BottomSheet บน Mobile, Centered Dialog บน Desktop) และคุมลำดับปุ่มยืนยันอยู่บน ยกเลิกอยู่ล่าง
- **ต้องมี Loading State ขณะลบหรือยืนยันรายการ**: แสดง Spinner/Disabled State ไม่ปล่อยให้หน้าจอนิ่งค้าง
- **ต้องมี Toast Feedback เสมอ**: ทุกการดำเนินการสำคัญ (เพิกถอนเซสชัน, ลบรายการ, บันทึกข้อมูล, รีเซ็ตรหัสผ่าน, เปลี่ยนสถานะ) ต้องเรียก `toast.success(...)` หรือ `toast.error(...)` ผ่าน `sonner`

---

## 📅 4. วันที่ เวลา และฟอร์มการป้อนข้อมูล (Dates, Times & Forms)

### การเลือกวันที่และเวลา (Date & Time Inputs)
- **ห้ามใช้ native `<input type="date">` หรือ `<input type="datetime-local">` เด็ดขาด**
- **ต้องใช้ shared component จาก `@/components/ui/date-input`** (`DateInput` หรือ `DateTimeInput`) เท่านั้น เพื่อให้ปฏิทิน การเลือกเวลา และการบังคับใช้ปี ค.ศ. เป็นไปในแนวทางเดียวกันทั้งระบบ

### การแสดงผลวันที่และเวลา (Date Display Helper Rule)
- ทุกการแสดงผลวันที่และเวลาในหน้าจอ UI **ต้องเรียกใช้ Helper กลางจาก `@/lib/date-utils`** (`formatDisplayDate`, `formatDisplayDateTime`, `formatDisplayTime`, `formatRelativeTime`) เสมอ
- **ข้อกำหนดตายตัว**: แสดงผลปีเป็น **ค.ศ. เท่านั้น (ห้ามแสดงปี พ.ศ. เด็ดขาด)** และปรับตามเวลาประเทศไทย (`Asia/Bangkok`, UTC+7)
- แปลงเป็น UTC ISO ก่อนเรียก API โดย backend/database ยังคง contract UTC

### การใช้งาน Dropdown / Select
- **ห้ามใช้ native `<select>` และ `<option>` เด็ดขาด**: เนื่องจากบนเบราว์เซอร์หรือมือถือบางรุ่น OS จะบังคับสไตล์พื้นหลังเป็นสีขาวจนตัวหนังสือกลืนมองไม่เห็น (White on White)
- **ต้องใช้ shared shadcn `Select` จาก `@/components/ui/select` เท่านั้น**: กำหนดความกว้างจาก trigger/container คงที่ เมนูเท่ากับ trigger และ truncate ข้อความยาว

### ฟอร์มและการป้อนข้อมูลแบบ Type-Safe
- **Boolean / Enabled**: ใช้ `Select` เลือกได้เฉพาะ `true` หรือ `false` (ห้ามใช้ text input)
- **วันที่และเวลา**: ใช้ `DateTimeInput` / `DateInput` เท่านั้น
- **ตัวเลข (Count, Limit, Timeout)**: ใช้ `<input type="number">`
- **ฟิลด์เลือกสี**: ใช้ color picker ไม่บังคับให้ผู้ใช้พิมพ์ HEX เอง
- **ตัวเลือกแท็ก**: แสดงเป็น badge สีจริงจาก `TagResponse.color` คอนทราสต์ชัดเจน

---

## 🎬 5. แอนิเมชันและ Loading Skeletons (Motion & Skeletons)

- **UI Animation ใช้ `motion/react`**:
  - เมื่อโหลดหน้าจอ: ใช้ shared component `AnimatedList` / `PageTransition` คอนฟิก `initial={{ opacity: 0, y: 10 }}` `animate={{ opacity: 1, y: 0 }}` `transition={{ duration: 0.3 }}` (stagger children 0.05s)
  - ปุ่มและ Interactive Elements: tactile feedback `hover:scale-102 active:scale-98 transition-transform` (หรือ `motion.button` with `whileHover={{ scale: 1.02 }}` `whileTap={{ scale: 0.98 }}`)
  - การ์ดและรายการ: `hover:-translate-y-0.5 hover:shadow-md transition-all`
  - ตัวเลขสรุปยอดเงิน: ใช้ `AnimatedNumber` จาก `@/components/ui/animated-number` เพื่อ animate ตัวเลขหมุนขึ้นอย่างนุ่มนวล
- **Loading Skeleton Shimmer**:
  - ใช้ Skeleton Shimmer (`.pw-skeleton` ใน globals.css) เลียนแบบคอนเทนต์จริงเสมอ ผ่าน `@/components/ui/skeleton` และพรีเซ็ตใน `@/components/shared/Skeletons`
  - ห้ามใช้ข้อความ `<p>กำลังโหลด...</p>` หรือ spinner ลอยโดดเดี่ยวกลางหน้าจอ

---

## 🧭 6. Navigation & Layout

- **Mobile Header Back Navigation**: ในหน้าจอมือถือ บริเวณแถบ Header ด้านบนซ้ายข้างโลโก้ ต้องมีปุ่มย้อนกลับ (`ChevronLeft`) เพื่อให้ผู้ใช้สามารถกดย้อนกลับหน้าจอก่อนหน้าได้สะดวก
- **ตัวกรองเมื่อมีหลายเงื่อนไข**: หากหน้าจอมีเงื่อนไขตัวกรองตั้งแต่ 3 ตัวขึ้นไป หรือมีพื้นที่จำกัดบนมือถือ ต้องยุบเป็นปุ่ม "ตัวกรอง" (Filter Button) พร้อม Badge แสดงจำนวนตัวกรองที่เลือกอยู่ และเปิดเป็น BottomSheet บน Mobile
- **Admin Self-Protection**: ซ่อนปุ่มระงับบัญชีของตนเองพร้อมแสดง Badge "บัญชีของคุณ" ในหน้าจัดการผู้ใช้
- **เอกสารส่งต่องาน UI**: ก่อนเริ่มงาน UI ให้ตรวจสอบ [`/docs/UI_MODERNIZATION_HANDOVER.md`](file:///D:/Projects/PocketWise/docs/UI_MODERNIZATION_HANDOVER.md) เสมอเพื่อต่อยอดและไม่ทำซ้ำในสิ่งที่ทำเสร็จแล้ว
