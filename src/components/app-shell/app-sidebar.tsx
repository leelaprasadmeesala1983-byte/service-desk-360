"use client";

import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import {
  APP_MODULES,
  type AppModuleKey,
  getMenuItemsForRole,
} from "@/lib/modules";
import type { CurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

import { useShell } from "./shell-context";

/**
 * The module is named by key, not passed whole: its `icon` fields are React
 * components, which a server component cannot serialize into a client one.
 */
type AppSidebarProps = {
  moduleKey: AppModuleKey;
  user: CurrentUser;
};

function isItemActive(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  itemPath: string,
  modulePath: string,
) {
  const [itemBase, itemQueryStr] = itemPath.split("?");

  if (itemQueryStr) {
    if (pathname !== itemBase) return false;
    const itemParams = new URLSearchParams(itemQueryStr);
    const itemTab = itemParams.get("tab");
    const currentTab = searchParams?.get("tab");

    if (itemTab === "all" || itemTab === "all-assets") {
      return currentTab === "all" || currentTab === "all-assets";
    }
    return currentTab === itemTab;
  }

  // If this item is the module's Dashboard (e.g. /service-tickets or /asset-management/dashboard)
  if (itemBase === modulePath || itemBase === `${modulePath}/dashboard`) {
    if (pathname === modulePath || pathname === `${modulePath}/dashboard`) {
      const currentTab = searchParams?.get("tab");
      return !currentTab || currentTab === "dashboard";
    }
    return false;
  }

  // Sub-routes (e.g. /service-tickets/service-management, /asset-management/received-material)
  return pathname === itemBase || pathname.startsWith(`${itemBase}/`);
}

function SidebarContent({ moduleKey, user }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { closeMobileNav } = useShell();
  const module = APP_MODULES[moduleKey];
  const menuItems = getMenuItemsForRole(module, user.role);

  return (
    <div className="bg-sidebar flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-5 pt-4 pb-2 lg:pt-5">
        <p className="text-sidebar-foreground text-xs font-bold tracking-wider uppercase">
          {module.shortName}
        </p>
        <button
          type="button"
          onClick={closeMobileNav}
          aria-label="Close menu"
          className="text-sidebar-foreground -mr-2 inline-flex size-9 items-center justify-center rounded-md hover:bg-white/10 lg:hidden cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(
            pathname,
            searchParams,
            item.path,
            module.path,
          );

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={closeMobileNav}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-[13.5px] sm:text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-bold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-semibold",
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="size-4 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border border-t px-5 py-3">
        <Link
          href="/"
          onClick={closeMobileNav}
          className="text-sidebar-foreground hover:text-sidebar-accent-foreground text-xs font-semibold"
        >
          ← Back to Modules
        </Link>
      </div>
    </div>
  );
}

function AppSidebar({ moduleKey, user }: AppSidebarProps) {
  const { mobileNavOpen, closeMobileNav } = useShell();

  // Close mobile drawer on Escape key or resize to desktop
  useEffect(() => {
    if (!mobileNavOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobileNav();
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMobileNav();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileNavOpen, closeMobileNav]);

  return (
    <>
      <aside className="hidden w-70 shrink-0 lg:block">
        <div className="fixed top-14 bottom-0 left-0 w-70 overflow-hidden lg:top-[68px]">
          <SidebarContent moduleKey={moduleKey} user={user} />
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileNav}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity cursor-pointer"
          />
          <div className="absolute inset-y-0 left-0 w-[82vw] max-w-70 shadow-2xl transition-transform">
            <SidebarContent moduleKey={moduleKey} user={user} />
          </div>
        </div>
      )}
    </>
  );
}

export { AppSidebar };
