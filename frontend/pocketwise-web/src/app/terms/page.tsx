import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/shared/LegalPageLayout";
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Scale,
  Database,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service) | PocketWise",
  description:
    "ข้อกำหนดและเงื่อนไขการใช้งานระบบ PocketWise รวมถึงข้อจำกัดความรับผิดชอบทางการเงินและการคุ้มครองข้อมูล",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Service)"
      subtitle="ข้อตกลงและเงื่อนไขในการเข้าถึงและใช้งานระบบบันทึกรายรับรายจ่าย PocketWise"
      lastUpdated="มีผลบังคับใช้ตั้งแต่วันที่ 21 ตุลาคม 2026"
      activeTab="terms"
      icon={<FileText className="size-6 text-[var(--pw-primary)]" />}
    >
      {/* 1. การยอมรับข้อกำหนด */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            1
          </span>
          การยอมรับข้อตกลงและเงื่อนไข
        </h2>
        <p className="mt-3 text-[var(--pw-ink)]/85">
          ยินดีต้อนรับสู่ <strong>PocketWise</strong> (&quot;ระบบ&quot; หรือ &quot;บริการ&quot;) การเข้าถึง สมัครสมาชิก หรือใช้งานระบบไม่ว่าทางใด ถือว่าคุณได้อ่าน เข้าใจ และยินยอมที่จะผูกพันตนเองตามข้อกำหนดและเงื่อนไขฉบับนี้ ตลอดจนนโยบายความเป็นส่วนตัวของเรา หากคุณไม่ยอมรับเงื่อนไขข้อใดข้อหนึ่ง กรุณาระงับการใช้งานระบบทันที
        </p>
      </section>

      {/* 2. ข้อจำกัดความรับผิดชอบทางการเงิน (สำคัญมาก) */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-magenta)]/50 bg-[var(--pw-surface-indigo)]/70 p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-magenta)] sm:text-xl">
            <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-magenta)] text-xs font-bold text-white">
              2
            </span>
            ข้อจำกัดความรับผิดชอบสำคัญ (Not Financial Advice)
          </h2>
          <AlertTriangle className="size-6 text-[var(--pw-magenta)]" />
        </div>
        <div className="mt-4 space-y-3 text-xs leading-relaxed text-[var(--pw-ink)]/85 sm:text-sm">
          <p>
            <strong>2.1 ลักษณะของเครื่องมือ:</strong> PocketWise ถูกออกแบบและพัฒนาขึ้นเพื่อทำหน้าที่เป็น{" "}
            <strong>&quot;เครื่องมือช่วยอำนวยความสะดวกในการจัดระเบียบบันทึกรายรับ-รายจ่ายส่วนบุคคล&quot;</strong>{" "}
            เท่านั้น
          </p>
          <p>
            <strong>2.2 ไม่ใช่คำแนะนำทางการเงิน:</strong> ข้อมูล กราฟ การคำนวณสถิติ การวิเคราะห์ หรือรายงานสรุปทั้งหมดที่ปรากฏบนระบบ{" "}
            <span className="text-[var(--pw-magenta)] font-semibold underline">
              มิใช่และไม่ถือเป็นคำแนะนำทางการเงิน (Financial Advice), คำแนะนำด้านการลงทุน (Investment Advice), ข้อชี้แนะทางภาษี หรือคำแนะนำทางกฎหมาย
            </span>{" "}
            ใดๆ ทั้งสิ้น
          </p>
          <p>
            <strong>2.3 การตัดสินใจของผู้ใช้:</strong> การวางแผนการเงิน การตัดสินใจลงทุน การก่อหนี้ หรือการบริหารค่าใช้จ่ายใดๆ เป็นดุลยพินิจและความรับผิดชอบของตัวผู้ใช้งานเองแต่เพียงผู้เดียว PocketWise และผู้พัฒนาจะไม่มีส่วนรับผิดชอบต่อความสูญเสีย ความเสียหาย หรือผลขาดทุนใดๆ ที่เกิดขึ้นจากการตัดสินใจของคุณ
          </p>
        </div>
      </section>

      {/* 3. บัญชีผู้ใช้งานและความรับผิดชอบ */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            3
          </span>
          บัญชีผู้ใช้งานและการรักษาความปลอดภัย
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
          <li>
            <strong>ข้อมูลที่ถูกต้อง:</strong> ผู้ใช้ตกลงที่จะให้อีเมลและข้อมูลที่แท้จริงและเป็นปัจจุบันในการลงทะเบียน
          </li>
          <li>
            <strong>การรักษารหัสผ่าน:</strong> ผู้ใช้มีหน้าที่เก็บรักษารหัสผ่านและอุปกรณ์ที่ใช้เข้าสู่ระบบให้ปลอดภัย ไม่เปิดเผยให้บุคคลอื่นทราบ
          </li>
          <li>
            <strong>ความรับผิดชอบต่อบัญชี:</strong> คุณต้องรับผิดชอบต่อทุกกิจกรรมและการกระทำที่เกิดขึ้นภายใต้บัญชีของคุณ หากพบเห็นการเข้าถึงที่ไม่ได้รับอนุญาต ต้องทำการเปลี่ยนรหัสผ่านทันทีและแจ้งผู้ดูแลระบบ
          </li>
        </ul>
      </section>

      {/* 4. ข้อห้ามและนโยบายการใช้งานที่ยอมรับได้ */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            4
          </span>
          ข้อกำหนดและข้อห้ามในการใช้งาน (Acceptable Use Policy)
        </h2>
        <p className="mt-2 text-xs text-[var(--pw-ink)]/75 sm:text-sm">
          ในการใช้งาน PocketWise คุณตกลงว่าจะไม่กระทำการใดๆ ดังต่อไปนี้:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-3.5">
            <div className="flex items-center gap-2 font-semibold text-[var(--pw-magenta)]">
              <ShieldAlert className="size-4 shrink-0" /> ห้ามโจมตีหรือบุกรุกระบบ
            </div>
            <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
              ห้ามพยายามเจาะระบบ ส่งคำขอจำนวนมากผิดปกติ (DDoS/Brute Force) ดัดแปลง เจาะช่องโหว่ หรือทำ Reverse Engineering ระบบ
            </p>
          </div>

          <div className="rounded-[var(--pw-rounded-md)] border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/50 p-3.5">
            <div className="flex items-center gap-2 font-semibold text-[var(--pw-magenta)]">
              <Scale className="size-4 shrink-0" /> ห้ามใช้ในทางที่ผิดกฎหมาย
            </div>
            <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
              ห้ามใช้ระบบในการอำนวยความสะดวกในการฟอกเงิน การฉ้อโกง การกระทำที่ขัดต่อความสงบเรียบร้อย หรือขัดต่อกฎหมายคอมพิวเตอร์
            </p>
          </div>
        </div>
      </section>

      {/* 5. สิทธิ์ในทรัพย์สินทางปัญญาและข้อมูล */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            5
          </span>
          ทรัพย์สินทางปัญญาและการเป็นเจ้าของข้อมูล
        </h2>
        <div className="mt-3 space-y-2 text-xs sm:text-sm">
          <p className="text-[var(--pw-ink)]/80">
            <strong>สิทธิ์ในระบบ:</strong> ซอร์สโค้ด ตราสัญลักษณ์ ดีไซน์ส่วนต่อประสาน (UI/UX) และสถาปัตยกรรมระบบของ PocketWise ถือเป็นทรัพย์สินทางปัญญาของผู้พัฒนา ห้ามทำซ้ำ ดัดแปลง หรือแจกจ่ายเพื่อการค้าโดยไม่ได้รับอนุญาต
          </p>
          <p className="text-[var(--pw-ink)]/80">
            <strong>สิทธิ์ในข้อมูลของคุณ:</strong> ข้อมูลทางการเงิน รายการธุรกรรม และบันทึกทั้งหมดที่คุณกรอกเข้าสู่ระบบ ยังคงเป็นกรรมสิทธิ์ของคุณอย่างสมบูรณ์ เราจะไม่นำข้อมูลของคุณไปจำหน่ายหรือเปิดเผยต่อบุคคลภายนอกโดยปราศจากความยินยอม
          </p>
        </div>
      </section>

      {/* 6. ความพร้อมใช้งานและการสำรองข้อมูล */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            6
          </span>
          ความพร้อมใช้งานและการสำรองข้อมูล (Service &amp; Backup)
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-[var(--pw-ink)]/80 sm:text-sm">
          เรามุ่งมั่นให้บริการระบบด้วยความเสถียรและปลอดภัยสูงสุด อย่างไรก็ดี บริการนี้ให้บริการในลักษณะ <strong>&quot;ตามสภาพที่เป็นอยู่&quot; (AS IS)</strong> และอาจมีการหยุดให้บริการชั่วคราวเพื่อปรับปรุงระบบหรือแก้ไขข้อผิดพลาดทางเทคนิค
        </p>
        <div className="mt-3 flex items-start gap-2.5 rounded-[var(--pw-rounded-md)] border border-[var(--pw-link)]/30 bg-[var(--pw-link)]/10 p-3.5 text-xs text-[var(--pw-link)] sm:text-sm">
          <Database className="size-5 shrink-0 mt-0.5" />
          <span>
            <strong>คำแนะนำด้านการสำรองข้อมูล:</strong> เพื่อป้องกันเหตุสุดวิสัยและการสูญหายของข้อมูล ผู้ใช้งานควรใช้งานฟังก์ชัน <strong>&quot;ส่งออกข้อมูล (Export)&quot;</strong> เป็นประจำเพื่อจัดเก็บสำเนาไฟล์ Excel หรือ CSV ไว้ในเครื่องของท่านเอง
          </span>
        </div>
      </section>

      {/* 7. ข้อจำกัดความรับผิด */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            7
          </span>
          ข้อจำกัดความรับผิด (Limitation of Liability)
        </h2>
        <p className="mt-3 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
          ในขอบเขตสูงสุดที่กฎหมายอนุญาต ผู้พัฒนาและผู้ให้บริการ PocketWise จะไม่รับผิดชอบต่อความเสียหายทางตรง ทางอ้อม หรือผลสืบเนื่องใดๆ (รวมถึงการสูญเสียข้อมูล ผลกำไร หรือการหยุดชะงักทางธุรกิจ) อันเป็นผลมาจากการใช้งาน หรือไม่สามารถใช้งานระบบนี้ได้
        </p>
      </section>

      {/* 8. การสิ้นสุดการใช้งาน */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            8
          </span>
          การยกเลิกและการสิ้นสุดการให้บริการ (Termination)
        </h2>
        <p className="mt-3 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
          คุณสามารถหยุดใช้งานและล้างข้อมูลของคุณออกจากระบบได้ตลอดเวลา ผู้ให้บริการขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีผู้ใช้งานที่ละเมิดข้อกำหนดเหล่านี้โดยไม่ต้องแจ้งให้ทราบล่วงหน้า
        </p>
      </section>

      {/* 9. การเปลี่ยนแปลงข้อกำหนดและการติดต่อ */}
      <section className="rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-primary)]/20 text-xs font-bold text-[var(--pw-primary)]">
            9
          </span>
          การเปลี่ยนแปลงข้อกำหนดและการติดต่อ
        </h2>
        <p className="mt-3 text-xs text-[var(--pw-ink)]/80 sm:text-sm">
          เราอาจปรับปรุงหรือแก้ไขข้อกำหนดการใช้งานนี้ให้สอดคล้องกับฟังก์ชันใหม่หรือกฎหมายที่เกี่ยวข้อง การใช้งานระบบอย่างต่อเนื่องหลังจากการเปลี่ยนแปลงถือว่าคุณยอมรับข้อกำหนดฉบับปรับปรุงแล้ว
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--pw-link)] sm:text-sm">
          <Mail className="size-4 shrink-0" />
          <span>ติดต่อผู้ดูแลระบบ: <a href="mailto:famreplay@gmail.com" className="underline">famreplay@gmail.com</a></span>
        </div>
      </section>
    </LegalPageLayout>
  );
}
