import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { ChatbotWrapper } from "@/components/chat/ChatbotWrapper";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// ── Default Metadata ──────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://infraquip.com"
  ),
  title: {
    default: "InfraQuip — Construction Equipment Rental & Sales Marketplace",
    template: "%s | InfraQuip",
  },
  description:
    "Find excavators, cranes, bulldozers, and heavy machinery for rent or sale. India's trusted B2B construction equipment marketplace. Compare prices, specs, and vendors.",
  keywords: [
    "construction equipment rental",
    "heavy machinery rental India",
    "excavator rental",
    "crane rental",
    "bulldozer rental",
    "JCB rental",
    "equipment marketplace",
    "InfraQuip",
  ],
  authors: [{ name: "InfraQuip" }],
  creator: "InfraQuip",
  publisher: "InfraQuip",
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
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://infraquip.com",
    siteName: "InfraQuip",
    title: "InfraQuip — Construction Equipment Rental & Sales Marketplace",
    description:
      "Find verified excavators, cranes, bulldozers & more for rent or sale. India's B2B heavy equipment marketplace.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "InfraQuip — Construction Equipment Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InfraQuip — Construction Equipment Rental & Sales",
    description:
      "India's trusted B2B construction equipment marketplace. Rent or buy verified machinery.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://infraquip.com",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f2e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

// ── Organization JSON-LD ──────────────────────────────────────
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "InfraQuip",
  url: "https://infraquip.com",
  logo: "https://infraquip.com/logo.png",
  description:
    "India's trusted B2B construction equipment rental and sales marketplace.",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "support@infraquip.com",
  },
};

// ── WebSite Search Action Schema ──────────────────────────────
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "InfraQuip",
  url: "https://infraquip.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://infraquip.com/machines?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        {/* Structured Data — rendered in body so extension-injected <head> scripts cannot break hydration */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {/* Accessibility: Skip to main content */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main id="main-content" className="flex-1 relative z-0">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
          <ChatbotWrapper />
        </Providers>
      </body>
    </html>
  );
}
