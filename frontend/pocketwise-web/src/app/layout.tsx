import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketWise",
  description: "ระบบบันทึกรายรับรายจ่าย",
  icons: {
    icon: "https://cdn-icons-png.flaticon.com/512/10384/10384161.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
