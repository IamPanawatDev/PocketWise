import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketWise",
  description: "ระบบบันทึกรายรับรายจ่าย",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("pocketwise-theme");if(t){document.documentElement.dataset.theme=t;}}catch(e){}`,
          }}
        />
      </head>
      <body className="relative min-h-dvh bg-[var(--pw-canvas)] text-[var(--pw-ink)] antialiased selection:bg-[var(--pw-primary)] selection:text-white">
        <div className="pw-ambient-bg" aria-hidden="true" />
        <div className="relative z-1 flex min-h-dvh flex-col">
          <Providers>
            {children}
            <Toaster position="top-center" richColors />
          </Providers>
        </div>
      </body>
    </html>
  );
}
