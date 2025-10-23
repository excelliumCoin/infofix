import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/lib/providers";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "InfoFix",
  description: "Earn IFX by completing social tasks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-white">
        <Providers>
          <Header />
          <main className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
