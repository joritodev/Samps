import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
// themes.css ANTES de globals.css: acento pessoal (globals) vence o tema em empate.
import "./themes.css";
import "./globals.css";
import { PREFERENCES_BOOT_SCRIPT } from "@/lib/theme/preferences";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Samps OS",
  description: "Plataforma de gestão operacional da Samps Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica cor/densidade pessoais antes da 1ª pintura (sem flash). */}
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
