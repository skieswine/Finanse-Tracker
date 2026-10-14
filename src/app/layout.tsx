import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { ThemeScript } from "@/components/theme/theme-script";
import { I18nProvider } from "@/lib/i18n/client";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaries[await getLocale()];
  return {
    title: t.app.name,
    description: t.app.description,
    applicationName: t.app.name,
    appleWebApp: { capable: true, title: t.app.name, statusBarStyle: "black-translucent" },
    // Explicit icons replace the file-based ones, so list the SVG favicon too.
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch.png" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <I18nProvider locale={locale} dictionary={dictionaries[locale]}>
          {children}
        </I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
