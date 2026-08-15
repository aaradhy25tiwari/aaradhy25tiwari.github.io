"use client";

import { motion } from "framer-motion";
import { UserPlus, Search, MessageSquare, CheckCircle } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up as a Vendor to list your equipment, or as a Customer to discover machinery.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    step: "02",
    icon: Search,
    title: "Find or List",
    description: "Vendors post detailed listings with photos and specs. Customers search by location and type.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Send Enquiry",
    description: "Customers send structured enquiries directly to vendors — no WhatsApp chaos.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    step: "04",
    icon: CheckCircle,
    title: "Finalize & Deploy",
    description: "Agree on terms and get your machinery on-site. Track the process end-to-end.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24 bg-background"
      aria-labelledby="how-it-works-heading"
    >
      <div className="section-container">
        <div className="text-center mb-10 sm:mb-16">
          <h2 id="how-it-works-heading" className="mb-3">
            How <span className="text-gradient-amber">InfraQuip</span> Works
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            From search to site — the fastest way to source or lease construction
            equipment in India.
          </p>
        </div>

        {/* 2x2 on mobile, 4-col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                /* Start visible — only translate, not opacity */
                initial={{ opacity: 1, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className={`relative flex flex-col items-center text-center rounded-2xl border ${step.border} p-4 sm:p-6 bg-card overflow-hidden group hover:border-${step.color.split('-')[1]}-400/50 transition-colors`}
              >
                {/* Background Number */}
                <div className="absolute -top-4 -right-2 text-7xl font-black text-muted/30 select-none group-hover:text-muted/50 transition-colors">
                  {step.step}
                </div>

                {/* Icon */}
                <div className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl ${step.bg} border border-border mb-4 sm:mb-6 z-10`}>
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${step.color}`} />
                </div>

                <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 z-10 relative">{step.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed z-10 relative">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
