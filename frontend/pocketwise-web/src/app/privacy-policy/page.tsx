import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/shared/LegalPageLayout";
import {
  ShieldCheck,
  Cookie,
  Database,
  Lock,
  UserCheck,
  Clock,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว (Privacy Policy) | PocketWise",
  description:
    "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) ของ PocketWise",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="นโยบายความเป็นส่วนตัว (Privacy Policy)"
      subtitle="แนวทางการเก็บรวบรวม ใช้ และคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)"
      lastUpdated="มีผลบังคับใช้ตั้งแต่วันที่ 21 ตุลาคม 2026"
      activeTab="privacy"
      icon={<ShieldCheck className="size-6 text-[var(--pw-primary)]" />}
    >
      {/* 1. บทนำ */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            1
          </span>
          บทนำและเจตนารมณ์
        </h2>
        <p className="mt-3 text-[var(--pw-ink)]/85">
          PocketWise (&quot;เรา&quot; หรือ &quot;ผู้ให้บริการ&quot;) ให้ความสำคัญสูงสุดต่อการรักษาความลับและการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งาน (&quot;คุณ&quot; หรือ &quot;เจ้าของข้อมูลส่วนบุคคล&quot;) เอกสารฉบับนี้จัดทำขึ้นเพื่อให้สอดคล้องกับ{" "}
          <strong>พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong>{" "}
          โดยมีเป้าหมายเพื่อชี้แจงให้คุณทราบอย่างโปร่งใสเกี่ยวกับประเภทของข้อมูลส่วนบุคคลที่เราจัดเก็บ วัตถุประสงค์ ฐานทางกฎหมายในการประมวลผล สิทธิ์ตามกฎหมายของคุณ ตลอดจนมาตรการรักษาความปลอดภัยของระบบ
        </p>
      </section>

      {/* 2. ข้อมูลส่วนบุคคลที่เราจัดเก็บ */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            2
          </span>
          ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม
        </h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--pw-link)] sm:text-base">
              <UserCheck className="size-4" /> 2.1 ข้อมูลบัญชีผู้ใช้งาน (Account Data)
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
              <li><strong>ที่อยู่อีเมล (Email):</strong> ใช้เป็นชื่อบัญชีในการเข้าสู่ระบบและรับการแจ้งเตือนสำคัญ</li>
              <li><strong>ชื่อที่แสดง (Display Name):</strong> ชื่อที่คุณกำหนดสำหรับใช้ทักทายและแสดงผลในระบบ</li>
              <li>
                <strong>รหัสผ่าน (Password):</strong> จัดเก็บโดยผ่านกระบวนการแฮชทางเดียวด้วยขั้นตอนวิธีความปลอดภัยระดับสูง (Salted Hash) โดยระบบและผู้ดูแลระบบไม่สามารถเห็นหรือเข้าถึงรหัสผ่านจริงของคุณได้
              </li>
            </ul>
          </div>

          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--pw-green)] sm:text-base">
              <Database className="size-4" /> 2.2 ข้อมูลธุรกรรมและบันทึกทางการเงิน (Financial Entries)
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
              <li>รายการบันทึกรายรับ รายจ่าย ยอดโอนเงิน วันที่ และบันทึกช่วยจำ (Notes)</li>
              <li>ชื่อบัญชีการเงิน ประเภทบัญชี และเลข 4 หลักท้ายของบัญชีหรือบัตรที่คุณบันทึก</li>
              <li>การจัดหมวดหมู่ (Categories), แท็ก (Tags), และเป้าหมายงบประมาณ (Budgets)</li>
            </ul>
            <div className="mt-3 flex items-start gap-2 rounded-[var(--pw-rounded-xs)] bg-[var(--pw-primary)]/10 p-2.5 text-xs text-[var(--pw-primary)]">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>ข้อชี้แจงสำคัญ:</strong> PocketWise ไม่มีการเชื่อมต่อ Direct API ไปยังบัญชีธนาคารจริง และไม่มีการจัดเก็บข้อมูลอ่อนไหวระดับสูง เช่น รหัส PIN, CVV/CVC หรือหมายเลขบัตรเครดิตเต็มจำนวน 16 หลัก
              </span>
            </div>
          </div>

          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--pw-primary)] sm:text-base">
              <Clock className="size-4" /> 2.3 ข้อมูลเชิงเทคนิคและประวัติการทำงาน (Technical &amp; Audit Logs)
            </h3>
            <p className="mt-2 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
              เพื่อความปลอดภัยและการป้องกันการโจมตีทางไซเบอร์ ระบบมีการบันทึกที่อยู่ไอพี (IP Address), ชนิดของเบราว์เซอร์ (User Agent), วันเวลาที่ทำธุรกรรมสำคัญ (เช่น การเข้าสู่ระบบ, การเปลี่ยนรหัสผ่าน, การแก้ไข/ลบรายการ)
            </p>
          </div>
        </div>
      </section>

      {/* 3. นโยบายการใช้คุกกี้ (Cookies Notice) */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-primary)]/40 bg-[var(--pw-surface-indigo)]/70 p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
            <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)] text-xs font-bold text-white">
              3
            </span>
            นโยบายการใช้งานคุกกี้ (Cookies Notice)
          </h2>
          <Cookie className="size-6 text-[var(--pw-link)]" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--pw-ink)]/85 sm:text-sm">
          PocketWise ให้ความเคารพต่อความเป็นส่วนตัวของคุณ เราใช้เฉพาะ{" "}
          <strong>&quot;คุกกี้ที่มีความจำเป็นอย่างยิ่งต่อการทำงานของระบบ (Strictly Necessary Cookies)&quot;</strong>{" "}
          เพื่อให้บริการระบบยืนยันตัวตนและการรักษาความปลอดภัยเท่านั้น:
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] p-3.5">
            <div className="flex items-center justify-between font-mono text-xs font-bold text-[var(--pw-link)]">
              <span>pw_access</span>
              <span className="rounded bg-[var(--pw-link)]/15 px-1.5 py-0.5 text-[10px]">Session</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--pw-ink)]/75">
              คุกกี้ความปลอดภัยสูง (HttpOnly, Secure, SameSite) สำหรับการเข้าสู่ระบบและยืนยันตัวตนในแต่ละคำขอ
            </p>
          </div>

          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] p-3.5">
            <div className="flex items-center justify-between font-mono text-xs font-bold text-[var(--pw-green)]">
              <span>pw_refresh</span>
              <span className="rounded bg-[var(--pw-green)]/15 px-1.5 py-0.5 text-[10px]">Refresh</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--pw-ink)]/75">
              คุกกี้สำหรับต่ออายุเซสชันการใช้งานอย่างต่อเนื่องและปลอดภัย ไม่สามารถเข้าถึงได้ผ่าน JavaScript ฝั่ง Client
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[var(--pw-rounded-xs)] border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300">
          ✓ <strong>ไม่มีคุกกี้ติดตาม (No Tracking / Marketing Cookies):</strong> PocketWise ไม่มีการฝังคุกกี้โฆษณา ไม่มีการส่งต่อข้อมูลให้บุคคลที่สามเพื่อการตลาด และไม่มีสคริปต์วิเคราะห์พฤติกรรมข้ามเว็บไซต์ คุณจึงได้รับความคุ้มครองความเป็นส่วนตัวสูงสุดโดยไม่ต้องกังวลเรื่องการถูกติดตาม
        </div>
      </section>

      {/* 4. วัตถุประสงค์และฐานทางกฎหมาย */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            4
          </span>
          วัตถุประสงค์และฐานทางกฎหมายในการประมวลผล
        </h2>
        <div className="mt-4 space-y-3 text-xs sm:text-sm">
          <div className="flex gap-3">
            <span className="font-semibold text-[var(--pw-link)] shrink-0">1. การปฏิบัติตามสัญญา (Contract):</span>
            <span className="text-[var(--pw-ink)]/80">
              เพื่อให้บริการระบบบันทึก จัดหมวดหมู่ คำนวณสรุปผล และแสดงรายงานการเงินตามที่คุณบันทึก
            </span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-[var(--pw-primary)] shrink-0">2. ประโยชน์โดยชอบด้วยกฎหมาย (Legitimate Interests):</span>
            <span className="text-[var(--pw-ink)]/80">
              เพื่อตรวจจับและป้องกันการทุจริต การโจมตีระบบรักษาความปลอดภัย การตรวจสอบความถูกต้องผ่านบันทึก Audit Logs และการปรับปรุงความเสถียรของแอปพลิเคชัน
            </span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-[var(--pw-green)] shrink-0">3. การปฏิบัติตามกฎหมาย (Legal Obligation):</span>
            <span className="text-[var(--pw-ink)]/80">
              เพื่อปฏิบัติตามพระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ และกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </span>
          </div>
        </div>
      </section>

      {/* 5. ระยะเวลาในการจัดเก็บข้อมูล */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            5
          </span>
          ระยะเวลาในการเก็บรักษาข้อมูล (Data Retention)
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-4">
            <h4 className="font-semibold text-[var(--pw-ink)]">ข้อมูลบัญชีและรายการธุรกรรม</h4>
            <p className="mt-1 text-[var(--pw-ink)]/70">
              จัดเก็บตลอดระยะเวลาที่บัญชีผู้ใช้ยังคงเปิดใช้งาน และจะถูกลบถาวรเมื่อคุณขอลบบัญชีหรือล้างข้อมูล
            </p>
          </div>
          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-4">
            <h4 className="font-semibold text-[var(--pw-ink)]">ประวัติกิจกรรมระบบ (Audit Logs)</h4>
            <p className="mt-1 text-[var(--pw-ink)]/70">
              จัดเก็บเป็นระยะเวลาไม่เกิน <strong>90 วัน</strong> เพื่อการตรวจสอบความมั่นคงปลอดภัยตามมาตรฐาน และจะถูกหมุนเวียนลบออกอัตโนมัติ
            </p>
          </div>
        </div>
      </section>

      {/* 6. สิทธิ์ของเจ้าของข้อมูลส่วนบุคคลตามกฎหมาย PDPA */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            6
          </span>
          สิทธิ์ของเจ้าของข้อมูลส่วนบุคคล (Your Rights under PDPA)
        </h2>
        <p className="mt-2 text-xs text-[var(--pw-ink)]/75 sm:text-sm">
          ภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คุณมีสิทธิ์อันชอบธรรมดังต่อไปนี้:
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-3.5">
            <FileSpreadsheet className="size-5 shrink-0 text-[var(--pw-green)]" />
            <div>
              <h4 className="text-xs font-bold text-[var(--pw-ink)] sm:text-sm">สิทธิ์ในการเข้าถึงและโอนย้ายข้อมูล (Data Portability)</h4>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
                คุณสามารถส่งออกและดาวน์โหลดสำเนาข้อมูลธุรกรรมทางการเงินทั้งหมดของคุณออกมาเป็นไฟล์ Excel หรือ CSV ได้ทุกเมื่อผ่านหน้าส่งออกข้อมูล (Export)
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-3.5">
            <Trash2 className="size-5 shrink-0 text-[var(--pw-magenta)]" />
            <div>
              <h4 className="text-xs font-bold text-[var(--pw-ink)] sm:text-sm">สิทธิ์ในการขอลบหรือล้างข้อมูล (Right to Erasure)</h4>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
                คุณสามารถใช้คำสั่ง &quot;ล้างข้อมูลทั้งหมด (Data Reset)&quot; ได้ด้วยตนเองผ่านเมนูการตั้งค่า เพื่อลบประวัติธุรกรรม บัญชี และงบประมาณทั้งหมดออกจากฐานข้อมูลทันที
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-3.5">
            <UserCheck className="size-5 shrink-0 text-[var(--pw-link)]" />
            <div>
              <h4 className="text-xs font-bold text-[var(--pw-ink)] sm:text-sm">สิทธิ์ในการแก้ไขข้อมูลให้ถูกต้อง (Right to Rectification)</h4>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
                คุณมีสิทธิ์แก้ไขชื่อที่แสดง ข้อมูลธุรกรรม หรือการตั้งค่าต่างๆ ให้ถูกต้องเป็นปัจจุบันได้ตลอดเวลา
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-3.5">
            <Lock className="size-5 shrink-0 text-[var(--pw-primary)]" />
            <div>
              <h4 className="text-xs font-bold text-[var(--pw-ink)] sm:text-sm">สิทธิ์ในการคัดค้านและจำกัดการประมวลผล</h4>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
                คุณสามารถขอจำกัดหรือคัดค้านการประมวลผลข้อมูลส่วนบุคคล หรือยื่นข้อร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.) หากพบการกระทำที่ไม่ชอบด้วยกฎหมาย
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. มาตรการความปลอดภัย */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            7
          </span>
          มาตรการรักษาความมั่นคงปลอดภัย (Security Measures)
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
          <li><strong>การเข้ารหัสรับส่งข้อมูล:</strong> ข้อมูลทั้งหมดที่ส่งผ่านอินเทอร์เน็ตได้รับการเข้ารหัสด้วยมาตรฐานความปลอดภัยสูง (SSL/TLS 1.3)</li>
          <li><strong>การควบคุมการเข้าถึง (Access Control):</strong> กำหนดสิทธิ์การเข้าถึงข้อมูลตามบทบาท (Role-Based Access Control) อย่างเคร่งครัด เฉพาะผู้ได้รับอนุญาตเท่านั้น</li>
          <li><strong>การป้องกันบัญชี:</strong> มีระบบป้องกันการเดารหัสผ่าน (Rate Limiting), ระบบยืนยันอีเมล และระบบรีเซ็ตรหัสผ่านแบบ Token ชั่วคราวที่มีการจำกัดเวลาและสิทธิ์</li>
        </ul>
      </section>

      {/* 8. การติดต่อผู้ควบคุมข้อมูล */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            8
          </span>
          ช่องทางการติดต่อ (Data Protection Officer)
        </h2>
        <p className="mt-2 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
          หากคุณมีความประสงค์จะใช้สิทธิ์ของเจ้าของข้อมูล หรือมีข้อสอบถามเกี่ยวกับนโยบายความเป็นส่วนตัวฉบับนี้ สามารถติดต่อเราได้ที่:
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--pw-link)] sm:text-sm">
          <Mail className="size-4 shrink-0" />
          <span>อีเมล: <a href="mailto:famreplay@gmail.com" className="underline">famreplay@gmail.com</a></span>
        </div>
      </section>
    </LegalPageLayout>
  );
}
