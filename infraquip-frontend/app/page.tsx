import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { StatsSection } from "@/components/home/StatsSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CtaBanner } from "@/components/home/CtaBanner";

import { LiveLeadsPreview } from "@/components/home/LiveLeadsPreview";

// ── SEO Metadata ──────────────────────────────────────────────
export const metadata: Metadata = {
  title: "InfraQuip — Construction Equipment Rental & Sales Marketplace India",
  description:
    "Find verified excavators, cranes, bulldozers, forklifts, and heavy machinery for rent or sale. Compare prices, specs, and vendors across India. List your equipment free today.",
  openGraph: {
    title: "InfraQuip — Find Construction Equipment Near You",
    description:
      "India's B2B marketplace for heavy machinery rental and sales. Verified vendors, transparent pricing, fast enquiry.",
  },
};

// ── FAQ Structured Data ───────────────────────────────────────
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I rent construction equipment on InfraQuip?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Browse listings, apply filters for your city and equipment type, click the listing, and click 'Enquire Now'. A vendor will respond within 24 hours.",
      },
    },
    {
      "@type": "Question",
      name: "Is InfraQuip free to use for customers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Customers can browse all listings and send up to 5 enquiries per month for free. Upgrade to Business plan for unlimited enquiries.",
      },
    },
    {
      "@type": "Question",
      name: "How do I list my construction equipment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Register as a vendor, complete your profile, and click 'Add Machine'. Your listing is reviewed and goes live within 24 hours.",
      },
    },
    {
      "@type": "Question",
      name: "What types of equipment can I find on InfraQuip?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Excavators, cranes, bulldozers, forklifts, loaders, compactors, and more. Both rental and purchase options available.",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <HeroSection />
      <LiveLeadsPreview />
      <CategoryGrid />
      <StatsSection />
      <HowItWorks />
      <FeaturedListings />
      <TestimonialsSection />
      <CtaBanner />
    </>
  );
}
