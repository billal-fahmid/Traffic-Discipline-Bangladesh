import type { Metadata } from "next";
import { Inter, Hanken_Grotesk, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", weight: ["500", "700", "800"] });
const notoBengali = Noto_Sans_Bengali({ subsets: ["bengali"], variable: "--font-noto-bengali", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Traffic Discipline Bangladesh — Report Traffic Violations",
  description:
    "Report traffic violations across Bangladesh — anonymously or as a registered citizen. Upload photo/video evidence, pin the GPS location, and track your report to resolution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${hanken.variable} ${notoBengali.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
