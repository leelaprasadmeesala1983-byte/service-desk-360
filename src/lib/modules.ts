import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Package,
  Ticket,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import type { UserRole } from "./constants";

type AppModuleKey = "service-ticket" | "asset-management" | "quick-cash";

type ModuleMenuItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Hidden outright for technicians, not merely read-only (spec §4). */
  adminOnly?: boolean;
};

type AppModule = {
  key: AppModuleKey;
  name: string;
  shortName: string;
  description: string;
  path: string;
  icon: LucideIcon;
  /** Card tint on the module picker, mirroring the reference app. */
  tint: string;
  iconBackground: string;
  roles: UserRole[];
  menuItems: ModuleMenuItem[];
};

const APP_MODULES: Record<AppModuleKey, AppModule> = {
  "service-ticket": {
    key: "service-ticket",
    name: "Service Ticket Management",
    shortName: "Service Ticket",
    description: "Manage and track service requests",
    path: "/service-tickets",
    icon: Ticket,
    tint: "#EEF6FF",
    iconBackground: "#2F80ED",
    roles: ["ADMIN", "TECHNICIAN"],
    menuItems: [
      {
        label: "Dashboard",
        path: "/service-tickets",
        icon: LayoutDashboard,
      },
      {
        label: "Service Management",
        path: "/service-tickets/service-management",
        icon: Wrench,
      },
      {
        label: "Installation Management",
        path: "/service-tickets/installation-management",
        icon: ClipboardList,
      },
      {
        label: "Project Management",
        path: "/service-tickets/project-management",
        icon: FolderKanban,
      },
      {
        label: "Technician Reports",
        path: "/service-tickets/technician-reports",
        icon: BarChart3,
      },
      {
        label: "Customer Reports",
        path: "/service-tickets/customer-reports",
        icon: UserCheck,
        adminOnly: true,
      },
      {
        label: "Users",
        path: "/service-tickets/users",
        icon: Users,
        adminOnly: true,
      },
    ],
  },

  "asset-management": {
    key: "asset-management",
    name: "Asset Management",
    shortName: "Asset Management",
    description: "Track and manage organization assets",
    path: "/asset-management",
    icon: Boxes,
    tint: "#EFFBF4",
    iconBackground: "#35B96F",
    roles: ["ADMIN"],
    menuItems: [
      {
        label: "Dashboard",
        path: "/asset-management/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Received Material",
        path: "/asset-management/received-material",
        icon: Inbox,
      },
      {
        label: "Send to Vendor",
        path: "/asset-management/send-to-vendor",
        icon: Truck,
      },
      {
        label: "Repair Status",
        path: "/asset-management/repair-status",
        icon: Wrench,
      },
      {
        label: "Vendor Received",
        path: "/asset-management/vendor-received",
        icon: Package,
      },
      {
        label: "Customer Return",
        path: "/asset-management/customer-return",
        icon: UserCheck,
      },
      {
        label: "Vendors",
        path: "/asset-management/vendors",
        icon: Building2,
      },
      {
        label: "Reports",
        path: "/asset-management/reports",
        icon: BarChart3,
      },
    ],
  },

  "quick-cash": {
    key: "quick-cash",
    name: "Quick Cash",
    shortName: "Quick Cash",
    description: "Manage transactions and payments",
    path: "/quick-cash",
    icon: Wallet,
    tint: "#FFF8E9",
    iconBackground: "#F5B72F",
    roles: ["ADMIN"],
    menuItems: [
      {
        label: "Quick Cash",
        path: "/quick-cash",
        icon: LayoutGrid,
      },
    ],
  },
};

const MODULE_ORDER: AppModuleKey[] = [
  "service-ticket",
  "asset-management",
  "quick-cash",
];

function getModulesForRole(role: UserRole): AppModule[] {
  return MODULE_ORDER.map((key) => APP_MODULES[key]).filter((module) =>
    module.roles.includes(role),
  );
}

function getModuleFromPath(pathname: string): AppModule | null {
  for (const key of MODULE_ORDER) {
    const module = APP_MODULES[key];
    if (pathname === module.path || pathname.startsWith(`${module.path}/`)) {
      return module;
    }
  }
  return null;
}

function getMenuItemsForRole(
  module: AppModule,
  role: UserRole,
): ModuleMenuItem[] {
  return module.menuItems.filter((item) => !item.adminOnly || role === "ADMIN");
}

export type { AppModule, AppModuleKey, ModuleMenuItem };
export {
  APP_MODULES,
  MODULE_ORDER,
  getModulesForRole,
  getModuleFromPath,
  getMenuItemsForRole,
};
