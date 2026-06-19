import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "IMTR Academic Portal",
  description: "Institute of Meteorological Training and Research",
  icons: {
    icon: "/images/gok-logo.png",
    apple: "/images/gok-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        <NextTopLoader
          color="#0ea5e9"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #0ea5e9,0 0 5px #0ea5e9"
        />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
