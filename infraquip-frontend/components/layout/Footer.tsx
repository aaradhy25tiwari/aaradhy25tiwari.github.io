import Link from "next/link";
import { Wrench, Mail, Phone, MapPin } from "lucide-react";

const FOOTER_LINKS = {
  equipment: {
    title: "Equipment",
    links: [
      { label: "Excavators", href: "/machines/excavators" },
      { label: "Cranes", href: "/machines/cranes" },
      { label: "Bulldozers", href: "/machines/bulldozers" },
      { label: "Forklifts", href: "/machines/forklifts" },
      { label: "Loaders", href: "/machines/loaders" },
      { label: "Compactors", href: "/machines/compactors" },
    ],
  },
  platform: {
    title: "Platform",
    links: [
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "List Your Machine", href: "/register?role=vendor" },
      { label: "For Companies", href: "/register?role=customer" },
    ],
  },
  legal: {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
};

const TOP_CITIES = [
  "Mumbai", "Pune", "Bengaluru", "Chennai", "Hyderabad",
  "Delhi NCR", "Kolkata", "Ahmedabad", "Surat", "Nagpur",
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card" aria-label="Site footer">
      <div className="section-container py-10 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* ── Brand Column ─────────────────────────────────── */}
          <div className="sm:col-span-2 lg:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl w-fit">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Wrench className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-gradient-amber">InfraQuip</span>
            </Link>

            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              India&apos;s trusted B2B marketplace for construction equipment rental
              and sales. Connecting vendors with construction companies across the
              country.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a href="mailto:support@infraquip.com" className="hover:text-foreground transition-colors">
                  support@infraquip.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Serving Tier 2 &amp; 3 cities across India</span>
              </div>
            </div>
          </div>

          {/* ── Link Columns ─────────────────────────────────── */}
          {Object.values(FOOTER_LINKS).map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Equipment Available In
          </h3>
          <div className="flex flex-wrap gap-2">
            {TOP_CITIES.map((city) => (
              <Link
                key={city}
                href={`/machines?city=${city.toLowerCase().replace(/ /g, "-")}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Bottom Bar ───────────────────────────────────────── */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} InfraQuip. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Payment secured by{" "}
            <span className="text-foreground font-medium">Razorpay</span>
            {" · "}
            Data hosted on{" "}
            <span className="text-foreground font-medium">Supabase</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
