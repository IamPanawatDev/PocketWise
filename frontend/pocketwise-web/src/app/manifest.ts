import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "com.pocketwise.app",
    name: "PocketWise — ระบบบันทึกรายรับรายจ่ายอัจฉริยะ",
    short_name: "PocketWise",
    description: "แพลตฟอร์มบันทึกรายรับรายจ่าย สแกนสลิปธนาคาร และวางแผนการเงินส่วนบุคคล",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0a0d3a",
    theme_color: "#5865f2",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "บันทึกรายการด่วน",
        short_name: "จดด่วน",
        description: "เปิดหน้าบันทึกรายรับ-รายจ่ายทันที",
        url: "/transactions?action=new",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "สแกนสลิปโอนเงิน",
        short_name: "สแกนสลิป",
        description: "นำเข้าสลิปธนาคารด้วย OCR",
        url: "/imports",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
      {
        name: "รายงานและภาพรวม",
        short_name: "รายงาน",
        description: "สรุปรายรับ-รายจ่ายและกราฟวิเคราะห์",
        url: "/reports",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
