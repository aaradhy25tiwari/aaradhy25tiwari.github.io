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
    name: "EXCAVATORS",
    slug: "excavators",
    icon: Shovel,
    description: "Powerful and efficient for all earthmoving needs.",
  },
  {
    name: "CRANES",
    slug: "cranes",
    icon: Construction,
    description: "Lifting solutions for heavy and high rise projects.",
  },
  {
    name: "FORKLIFTS",
    slug: "forklifts",
    icon: Forklift,
    description: "Reliable material handling and warehouse solutions.",
  },
  {
    name: "BULLDOZERS",
    slug: "bulldozers",
    icon: Truck,
    description: "Heavy-duty pushing and site preparation.",
  },
  {
    name: "LOADERS",
    slug: "loaders",
    icon: Hammer,
    description: "Versatile machines for digging, loading and more.",
  },
  {
    name: "COMPACTORS",
    slug: "compactors",
    icon: Wind,
    description: "Built for compaction and infrastructure stability.",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function CategoryGrid() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900" aria-labelledby="categories-heading">
      <div className="section-container">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-end mb-10 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 id="categories-heading" className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
              SHOP BY <span className="text-amber-500">CATEGORY</span>
            </h2>
          </div>
          <Link
            href="/machines"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors uppercase"
          >
            VIEW ALL CATEGORIES
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 2-col on mobile, 6-col on lg */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <motion.div key={cat.slug} variants={itemVariants}>
                <Link
                  href={`/machines/${cat.slug}`}
                  className="group block h-full p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-xl transition-all duration-300"
                  aria-label={`Browse ${cat.name}`}
                >
                  <div className="flex justify-center mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                      <Icon className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white text-center mb-2 uppercase tracking-wide group-hover:text-amber-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                    {cat.description}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View All Link (Mobile) */}
        <div className="text-center mt-8 sm:hidden">
          <Link
            href="/machines"
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors uppercase"
          >
            VIEW ALL CATEGORIES
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
