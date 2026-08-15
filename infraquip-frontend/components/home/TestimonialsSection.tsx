"use client";

import { motion } from "framer-motion";
import { Star, Building2, HardHat } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Rajesh Sharma",
    role: "Fleet Owner",
    company: "Sharma Equipment Rentals",
    location: "Pune, Maharashtra",
    icon: HardHat,
    rating: 5,
    quote:
      "InfraQuip transformed how I manage my 12-machine fleet. Enquiries now come directly to me — no more chasing leads on WhatsApp. I got 3 new long-term clients in the first month.",
    avatar: "RS",
    tier: "Pro Vendor",
  },
  {
    name: "Priya Menon",
    role: "Procurement Manager",
    company: "BuildRight Infrastructure",
    location: "Bengaluru, Karnataka",
    icon: Building2,
    rating: 5,
    quote:
      "We needed 4 excavators for a highway project in under a week. Found all of them on InfraQuip, compared specs, and confirmed within 48 hours. Incredible platform.",
    avatar: "PM",
    tier: "Business",
  },
  {
    name: "Anil Verma",
    role: "Civil Contractor",
    company: "Independent Contractor",
    location: "Nagpur, Maharashtra",
    icon: HardHat,
    rating: 5,
    quote:
      "The verified vendor badges gave me confidence. I knew exactly what I was getting — maintained machinery from a trusted source. Far better than OLX.",
    avatar: "AV",
    tier: "Customer",
  },
];

export function TestimonialsSection() {
  return (
    <section
      className="py-16 sm:py-24 bg-muted/20"
      aria-labelledby="testimonials-heading"
    >
      <div className="section-container">
        <div className="text-center mb-10 sm:mb-16">
          <h2 id="testimonials-heading" className="mb-3">
            Trusted by <span className="text-gradient-amber">Construction Professionals</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Vendors and customers across India are building their businesses with InfraQuip.
          </p>
        </div>

        {/* Horizontal scroll on mobile, 3-col grid on sm+ */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {TESTIMONIALS.map((t, i) => (
            <motion.article
              key={t.name}
              /* Always visible — only translate animates */
              initial={{ opacity: 1, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="card-surface p-5 sm:p-6 flex flex-col gap-4 snap-start flex-shrink-0 w-[85vw] sm:w-auto"
              aria-label={`Testimonial from ${t.name}`}
            >
              {/* Stars */}
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-5">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold flex-shrink-0">
                  {t.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.role} · {t.location}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0 hidden sm:block">
                  {t.tier}
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Mobile swipe indicator */}
        <div className="flex justify-center gap-1.5 mt-4 sm:hidden">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="h-1 w-6 rounded-full bg-border" />
          ))}
        </div>
      </div>
    </section>
  );
}
