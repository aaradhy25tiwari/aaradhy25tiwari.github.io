"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const VENDOR_BENEFITS = [
  "List up to 5 machines free, forever",
  "Receive direct enquiries from construction companies",
  "Analytics: views, enquiry rates per listing",
  "Verified vendor badge after document review",
];

export function CtaBanner() {
  return (
    <section
      className="py-12 sm:py-24 bg-background"
      aria-labelledby="cta-heading"
    >
      <div className="section-container">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-accent/5 p-6 sm:p-10 lg:p-16"
        >
          {/* Background glow */}
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/15 blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-accent/10 blur-[60px] pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left: Headline */}
            <div>
              <h2 id="cta-heading" className="mb-3 sm:mb-4 text-xl sm:text-3xl lg:text-4xl">
                Own Construction Equipment?{" "}
                <span className="text-gradient-amber">Start Earning Today.</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-lg mb-5 sm:mb-6 leading-relaxed">
                Join 500+ vendors already listing on InfraQuip. No setup fees.
                Your first 5 listings are always free.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="btn-amber-glow gap-2 w-full sm:w-auto" asChild>
                  <Link href="/register?role=vendor">
                    List Your Machine Free
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href="/pricing">View Pricing Plans</Link>
                </Button>
              </div>
            </div>

            {/* Right: Benefits */}
            <div className="space-y-3">
              {VENDOR_BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Already a customer?{" "}
                  <Link
                    href="/machines"
                    className="text-primary hover:underline"
                  >
                    Browse available equipment →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
