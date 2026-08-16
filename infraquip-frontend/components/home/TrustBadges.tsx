import { ShieldCheck, HeadphonesIcon, Truck, CreditCard } from "lucide-react";

const PILLARS = [
  { icon: ShieldCheck, title: "Trusted & Verified", desc: "All machines are verified for quality and performance." },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Our experts are here to help you anytime, anywhere." },
  { icon: Truck, title: "Quick Delivery", desc: "On-time delivery, right to your project site." },
  { icon: CreditCard, title: "Flexible Plans", desc: "Daily, weekly, monthly or long-term – you choose." },
];

export function TrustBadges() {
  return (
    <section className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-6">
      <div className="section-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div key={i} className={`flex items-start gap-4 ${i !== 0 ? "pt-6 sm:pt-0 sm:pl-6 lg:pl-8" : ""}`}>
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-500">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-semibold text-sm mb-1">{pillar.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
