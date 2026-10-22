import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PocketWise — ระบบบันทึกรายรับรายจ่ายอัจฉริยะ",
    short_name: "PocketWise",
    description: "แพลตฟอร์มบันทึกรายรับรายจ่าย สแกนสลิปธนาคาร และวางแผนการเงินส่วนบุคคล",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0d3a",
    theme_color: "#5865f2",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
