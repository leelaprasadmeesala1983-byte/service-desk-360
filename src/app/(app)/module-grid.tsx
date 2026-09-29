import { ArrowRight, Boxes, Ticket, Wallet } from "lucide-react";
import Link from "next/link";

import type { UserRole } from "@/lib/constants";
import { getModulesForRole } from "@/lib/modules";

interface ModuleVisualConfig {
  key: string;
  title: string;
  description: string;
  badge: string;
  path: string;
  icon: typeof Ticket;
  accentBar: string;
  iconBg: string;
  iconColor: string;
  badgeStyle: string;
  arrowHoverClass: string;
}

const MODULE_CONFIGS: Record<string, ModuleVisualConfig> = {
  "service-ticket": {
    key: "service-ticket",
    title: "Service Ticket",
    description:
      "Manage, track, assign, and resolve customer service requests.",
    badge: "Service Management",
    path: "/service-tickets",
    icon: Ticket,
    accentBar: "bg-blue-600",
    iconBg:
      "bg-blue-50 border border-blue-100/80 dark:bg-blue-950/50 dark:border-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeStyle:
      "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50",
    arrowHoverClass: "group-hover:bg-blue-600 group-hover:text-white",
  },
  "asset-management": {
    key: "asset-management",
    title: "Asset Management",
    description: "Track equipment, devices, maintenance cycles, and assets.",
    badge: "Asset Management",
    path: "/asset-management",
    icon: Boxes,
    accentBar: "bg-emerald-600",
    iconBg:
      "bg-emerald-50 border border-emerald-100/80 dark:bg-emerald-950/50 dark:border-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeStyle:
      "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
    arrowHoverClass: "group-hover:bg-emerald-600 group-hover:text-white",
  },
  "quick-cash": {
    key: "quick-cash",
    title: "Quick Cash",
    description:
      "Manage counter transactions, payments, collections, and invoicing.",
    badge: "Quick Cash",
    path: "/quick-cash",
    icon: Wallet,
    accentBar: "bg-amber-500",
    iconBg:
      "bg-amber-50 border border-amber-100/80 dark:bg-amber-950/50 dark:border-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeStyle:
      "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
    arrowHoverClass: "group-hover:bg-amber-500 group-hover:text-white",
  },
};

function ModuleGrid({ role }: { role: UserRole }) {
  const allowedModules = getModulesForRole(role);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6 lg:gap-8">
      {allowedModules.map((module) => {
        const config = MODULE_CONFIGS[module.key] || {
          key: module.key,
          title: module.shortName,
          description: module.description,
          badge: module.shortName,
          path: module.path,
          icon: module.icon,
          accentBar: "bg-primary",
          iconBg: "bg-muted border border-border",
          iconColor: "text-foreground",
          badgeStyle: "bg-muted text-muted-foreground border-border",
          arrowHoverClass: "group-hover:bg-primary group-hover:text-white",
        };

        const Icon = config.icon;

        return (
          <Link
            key={config.key}
            href={config.path}
            className="group relative flex min-h-[260px] sm:min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs transition-all duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-card dark:hover:border-slate-700 sm:p-5.5"
          >
            {/* Top Accent Line */}
            <div
              className={`absolute inset-x-0 top-0 h-1.5 ${config.accentBar}`}
            />

            <div>
              {/* Icon Container */}
              <div
                className={`flex size-11 items-center justify-center rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105 sm:size-12 ${config.iconBg} ${config.iconColor}`}
              >
                <Icon className="size-5 stroke-[2.2]" />
              </div>

              {/* Title */}
              <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
                {config.title}
              </h2>

              {/* Description */}
              <p className="mt-1.5 text-xs sm:text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                {config.description}
              </p>
            </div>

            {/* Bottom Section */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${config.badgeStyle}`}
              >
                {config.badge}
              </span>

              <button
                type="button"
                aria-label={`Open ${config.title}`}
                className={`flex size-8.5 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors duration-200 dark:bg-slate-800 dark:text-slate-400 ${config.arrowHoverClass}`}
                tabIndex={-1}
              >
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export { ModuleGrid };
