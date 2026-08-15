"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shovel,
  Construction,
  Forklift,
  Truck,
  Hammer,
  Wind,
  ArrowRight,
} from "lucide-react";

const CATEGORIES = [
  {
    name: "Excavators",
    slug: "excavators",
    icon: Shovel,
    description: "Mini to large hydraulic",
    color: "from-amber-500/20 to-amber-600/5",
    border: "hover:border-amber-500/40",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10 group-hover:bg-amber-500/20",
  },
  {
    name: "Cranes",
    slug: "cranes",
    icon: Construction,
    description: "Tower, mobile & hydraulic",
    color: "from-orange-500/20 to-orange-600/5",
    border: "hover:border-orange-500/40",
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10 group-hover:bg-orange-500/20",
  },
  {
    name: "Forklifts",
    slug: "forklifts",
    icon: Forklift,
    description: "Electric & diesel forklifts",
    color: "from-yellow-500/20 to-yellow-600/5",
    border: "hover:border-yellow-500/40",
    iconColor: "text-yellow-500",
    iconBg: "bg-yellow-500/10 group-hover:bg-yellow-500/20",
  },
  {
    name: "Bulldozers",
    slug: "bulldozers",
    icon: Truck,
    description: "Track & wheel bulldozers",
    color: "from-red-500/20 to-red-600/5",
    border: "hover:border-red-500/40",
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10 group-hover:bg-red-500/20",
  },
  {
    name: "Loaders",
    slug: "loaders",
    icon: Hammer,
    description: "Wheel & backhoe loaders",
    color: "from-blue-500/20 to-blue-600/5",
    border: "hover:border-blue-500/40",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10 group-hover:bg-blue-500/20",
  },
  {
    name: "Compactors",
    slug: "compactors",
    icon: Wind,
    description: "Soil, asphalt & plate",
    color: "from-purple-500/20 to-purple-600/5",
    border: "hover:border-purple-500/40",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 1, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function CategoryGrid() {
  return (
    <section className="py-12 sm:py-20 bg-background" aria-labelledby="categories-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 id="categories-heading" className="mb-2 sm:mb-3">
            Browse by{" "}
            <span className="text-gradient-amber">Equipment Type</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto">
            From excavators to compactors — find any heavy machinery you need.
          </p>
        </div>

        {/* 3-col on mobile, 6-col on lg */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <motion.div key={cat.slug} variants={itemVariants}>
                <Link
                  href={`/machines/${cat.slug}`}
                  className={`machine-card group block p-3 sm:p-5 text-center border border-border bg-gradient-to-b ${cat.color} ${cat.border} transition-all`}
                  aria-label={`Browse ${cat.name}`}
                >
                  <div className="flex justify-center mb-2 sm:mb-3">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${cat.iconBg} transition-colors`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${cat.iconColor}`} />
                    </div>
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm text-foreground mb-0 sm:mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight hidden sm:block">
                    {cat.description}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All Link */}
        <div className="text-center mt-6 sm:mt-8">
          <Link
            href="/machines"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all equipment categories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
