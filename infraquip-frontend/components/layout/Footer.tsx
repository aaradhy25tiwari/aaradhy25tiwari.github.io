import Link from "next/link";
import { Wrench, Mail, Phone, MapPin, Building2, ShieldCheck } from "lucide-react";

const FOOTER_LINKS = {
  equipment: {
    title: "Equipment Categories",
    links: [
      { label: "Excavators", href: "/machines?category=excavators" },
      { label: "Cranes & Lifters", href: "/machines?category=cranes" },
      { label: "Bulldozers & Crawlers", href: "/machines?category=bulldozers" },
      { label: "Forklifts & Reach Trucks", href: "/machines?category=forklifts" },
      { label: "Wheel Loaders", href: "/machines?category=loaders" },
      { label: "Road Compactors", href: "/machines?category=compactors" },
    ],
  },
  platform: {
    title: "Platform",
    links: [
      { label: "Browse All Machinery", href: "/machines" },
      { label: "List Your Machine", href: "/register?role=vendor" },
      { label: "Subscription Pricing", href: "/pricing" },
      { label: "Live Equipment Leads", href: "/live-leads" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Request Access", href: "/register" },
    ],
  },
  company: {
    title: "Legal & Compliance",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact & Support", href: "/contact" },
      { label: "Privacy Policy (DPDP)", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cancellation & Refund", href: "/refund" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Data Deletion Request", href: "/data-deletion" },
    ],
  },
};

const TOP_CITIES = [
  "Mumbai", "Pune", "Bengaluru", "Chennai", "Hyderabad",
  "Delhi NCR", "Kolkata", "Ahmedabad", "Surat", "Nagpur",
  "Indore", "Jaipur", "Lucknow", "Coimbatore", "Bhubaneswar",
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-sm" aria-label="Site footer">
      <div className="section-container py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* ── Brand & Registered Office Column ─────────────────────────────────── */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl w-fit">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
                <Wrench className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-gradient-amber text-2xl tracking-tight">InfraQuip</span>
            </Link>

            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              India&apos;s premier B2B heavy construction equipment rental and sales network.
              Empowering contractors, fleet owners, and infrastructure builders across 50+ cities.
            </p>

            {/* Corporate Address & Contact Details */}
            <div className="space-y-2.5 text-sm text-muted-foreground pt-1">
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs leading-relaxed text-foreground font-medium">
                  InfraQuip Technologies India Pvt. Ltd.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <address className="not-italic text-xs leading-relaxed">
                  Unit 402, 4th Floor, Panchshil Business Park, Balewadi High Street, Pune, Maharashtra 411045, India
                </address>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a href="tel:+919876543210" className="text-xs hover:text-foreground transition-colors font-medium">
                  +91-9876543210 / +91 (20) 6789-4500
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href="mailto:support@infraquip.com" className="text-xs hover:text-foreground transition-colors">
                  support@infraquip.com
                </a>
              </div>
            </div>
          </div>

          {/* ── Link Columns ─────────────────────────────────── */}
          {Object.values(FOOTER_LINKS).map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Top Cities ───────────────────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Equipment Hubs &amp; Service Locations
            </h3>
            <span className="text-[11px] text-muted-foreground">Pan-India Availability</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {TOP_CITIES.map((city) => (
              <Link
                key={city}
                href={`/machines?city=${city.toLowerCase().replace(/ /g, "-")}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Bottom Bar ───────────────────────────────────────── */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>© {currentYear} InfraQuip Technologies India Pvt. Ltd. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span>CIN: <strong className="text-foreground">U74999PN2024PTC198765</strong></span>
            <span>·</span>
            <span>GSTIN: <strong className="text-foreground">27AABCI1234F1Z5</strong></span>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>·</span>
            <Link href="/refund" className="hover:underline">Refunds</Link>
            <span>·</span>
            <Link href="/cookies" className="hover:underline">Cookies</Link>
            <span>·</span>
            <Link href="/data-deletion" className="hover:underline">Data Deletion</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
