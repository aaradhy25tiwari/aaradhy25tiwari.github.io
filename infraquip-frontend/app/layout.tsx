import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { ChatbotWrapper } from "@/components/chat/ChatbotWrapper";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { StickyMobileCta } from "@/components/layout/StickyMobileCta";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// ── Default Metadata ──────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://infraquip.in"
  ),
  title: {
    default: "InfraQuip — Construction Equipment Rental & Sales Marketplace India",
    template: "%s | InfraQuip",
  },
  description:
    "Rent and buy verified heavy construction machinery across India. Compare excavators, cranes, bulldozers, and forklifts with transparent pricing and verified vendors.",
  keywords: [
    "construction equipment rental India",
    "heavy machinery rental Pune Mumbai Bangalore",
    "excavator rental",
    "crane rental",
    "bulldozer rental",
    "JCB rental",
    "forklift rental",
    "equipment marketplace India",
    "InfraQuip",
  ],
  authors: [{ name: "InfraQuip Technologies India Pvt. Ltd." }],
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
    url: "https://infraquip.in",
    siteName: "InfraQuip",
    title: "InfraQuip — Construction Equipment Rental & Sales Marketplace India",
    description:
      "Find verified excavators, cranes, bulldozers & more for rent or sale. India's trusted B2B heavy equipment network.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "InfraQuip — Construction Equipment Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InfraQuip — Construction Equipment Rental & Sales Marketplace",
    description:
      "India's trusted B2B construction equipment marketplace. Rent or buy verified machinery.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://infraquip.in",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
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
  name: "InfraQuip Technologies India Pvt. Ltd.",
  legalName: "InfraQuip Technologies India Private Limited",
  url: "https://infraquip.in",
  logo: "https://infraquip.in/logo.png",
  description:
    "India's trusted B2B construction equipment rental and sales marketplace.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Unit 402, 4th Floor, Panchshil Business Park, Balewadi High Street",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "411045",
    addressCountry: "IN",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-9876543210",
      contactType: "customer service",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi", "Marathi"],
    },
  ],
  sameAs: [],
};

// ── WebSite Search Action Schema ──────────────────────────────
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "InfraQuip",
  url: "https://infraquip.in",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://infraquip.in/machines?q={search_term_string}",
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
      <head>
        <GoogleAnalytics />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
        {/* Structured Data */}
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
          <StickyMobileCta />
          <CookieBanner />
          <Toaster />
          <ChatbotWrapper />
        </Providers>
      </body>
    </html>
  );
}
