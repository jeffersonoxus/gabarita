import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "Gabarita+",
  description: "Simulados inteligentes para concursos públicos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased min-h-screen`}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
