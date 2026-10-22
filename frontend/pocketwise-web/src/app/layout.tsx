import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/shared/Providers";
import "./globals.css";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://pocket-wise-self.vercel.app");

export const viewport: Viewport = {
  themeColor: "#0a0d3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "PocketWise — ระบบบันทึกรายรับรายจ่ายอัจฉริยะ สแกนสลิป & วางแผนการเงิน",
    template: "%s | PocketWise",
  },
  description:
    "PocketWise แพลตฟอร์มบันทึกรายรับรายจ่าย วางแผนการเงินส่วนบุคคลอัจฉริยะ รองรับการสแกนสลิปธนาคารด้วย OCR นำเข้าใบแจ้งยอดบัตรเครดิต จัดหมวดหมู่อัตโนมัติ แจ้งเตือนงบประมาณเรียลไทม์ และสรุปรายงานการเงินครบวงจร",
  keywords: [
    "PocketWise",
    "บันทึกรายรับรายจ่าย",
    "แอปบันทึกรายรับรายจ่าย",
    "สแกนสลิป",
    "อ่านสลิปโอนเงิน",
    "สลิปธนาคาร OCR",
    "จัดหมวดหมู่รายจ่าย",
    "วางแผนงบประมาณ",
    "รายงานการเงิน",
    "จัดการบัตรเครดิต",
    "expense tracker",
    "personal finance",
    "money manager",
  ],
  authors: [{ name: "PocketWise Team" }],
  creator: "PocketWise",
  publisher: "PocketWise",
  applicationName: "PocketWise",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "/",
    siteName: "PocketWise",
    title: "PocketWise — ระบบบันทึกรายรับรายจ่ายอัจฉริยะ สแกนสลิป & วางแผนการเงิน",
    description:
      "บันทึกรายรับรายจ่ายอัตโนมัติด้วยระบบ OCR สแกนสลิปธนาคารและใบแจ้งยอด วางแผนงบประมาณและการเงินอย่างชาญฉลาด",
    images: [
      {
        url: "/brand-logo.png",
        width: 512,
        height: 512,
        alt: "PocketWise Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PocketWise — ระบบบันทึกรายรับรายจ่ายอัจฉริยะ",
    description:
      "บันทึกรายรับรายจ่ายอัตโนมัติด้วยระบบ OCR สแกนสลิปธนาคารและใบแจ้งยอด วางแผนงบประมาณและการเงินอย่างชาญฉลาด",
    images: ["/brand-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PocketWise",
  url: baseUrl,
  description:
    "แพลตฟอร์มบันทึกรายรับรายจ่าย วางแผนการเงินส่วนบุคคลอัจฉริยะ รองรับการสแกนสลิปธนาคารด้วย OCR นำเข้าใบแจ้งยอดบัตรเครดิต และจัดหมวดหมู่อัตโนมัติ",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  inLanguage: "th",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "THB",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("pocketwise-theme")||"dark";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
