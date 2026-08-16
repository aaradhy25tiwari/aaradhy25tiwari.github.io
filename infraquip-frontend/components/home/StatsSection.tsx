"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Users, Truck, MapPin, ShieldCheck } from "lucide-react";

const STATS = [
  { value: 5000, suffix: "+", label: "HAPPY CUSTOMERS", icon: Users },
  { value: 1000, suffix: "+", label: "MACHINES", icon: Truck },
  { value: 50, suffix: "+", label: "CITIES", icon: MapPin },
  { value: 10, suffix: "+", label: "YEARS OF TRUST", icon: ShieldCheck },
];

function AnimatedCounter({
  target,
  suffix,
  isVisible,
}: {
  target: number;
  suffix: string;
  isVisible: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target]);

  return (
    <span>
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-12 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800"
      aria-label="Platform statistics"
    >
      <div className="section-container flex flex-col md:flex-row items-center justify-between gap-8">
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full md:w-3/4">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-center gap-4"
              >
                <div className="text-amber-600 dark:text-amber-500 hidden sm:block">
                  <Icon className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      isVisible={isVisible}
                    />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold tracking-wider">{stat.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="w-full md:w-1/4 flex items-center justify-end border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-6 md:pt-0 md:pl-8">
          <div className="text-right">
            <h3 className="text-slate-900 dark:text-white font-bold uppercase text-sm mb-1">Built for today.</h3>
            <h3 className="text-amber-600 dark:text-amber-500 font-bold uppercase text-sm mb-2">Powered for tomorrow.</h3>
            <p className="text-slate-600 dark:text-slate-500 text-xs">Your reliable partner in building stronger infrastructure.</p>
          </div>
        </div>

      </div>
    </section>
  );
}
