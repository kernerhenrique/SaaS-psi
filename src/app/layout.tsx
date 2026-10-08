import type { Metadata, Viewport } from "next";
import { Crimson_Pro, Geist_Mono, Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Serifada próxima à do cartão da identidade visual; usada só em títulos.
const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Consultório", template: "%s · Consultório" },
  description: "Agenda, prontuário e financeiro para psicólogas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { title: "Consultório", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f6f2ec",
  // Deixa o conteúdo ir até a borda (notch/barra de gestos) para o padding de
  // "área segura" funcionar no modo app (instalado) — ver BottomNav.
  viewportFit: "cover",
};

// Aplica o tema salvo (ou a preferência do sistema) antes da primeira pintura,
// para não mostrar o tema errado por um instante (flash of wrong theme).
// Modo claro é o padrão: só usa o escuro se a psicóloga escolheu.
const THEME_INIT_SCRIPT = `
  try {
    if (localStorage.getItem("theme") === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${crimsonPro.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
