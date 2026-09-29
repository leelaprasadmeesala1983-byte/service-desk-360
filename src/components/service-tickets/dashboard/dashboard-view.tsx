"use client";

import {
  ArrowRight,
  Boxes,
  Calendar,
  Clock,
  Eye,
  FolderKanban,
  HardDriveDownload,
  Truck,
  User,
  UserCog,
  Users as UsersIcon,
  Wallet,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/app-shell/page-header";
import { InstallationDetailsDialog } from "@/components/service-tickets/installation/installation-details-dialog";
import { MonthlyActivityChart } from "@/components/service-tickets/monthly-activity-chart";
import { ProjectDetailsDialog } from "@/components/service-tickets/project/project-details-dialog";
import { ServiceDetailsDialog } from "@/components/service-tickets/service/service-details-dialog";
import { StatCard } from "@/components/service-tickets/stat-card";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import { Button } from "@/components/ui/button";
import type { DashboardData, PendingEventRow } from "@/db/queries/dashboard";
import type { UserRole } from "@/lib/constants";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { RECORD_KIND_PATHS } from "@/lib/service-ticket";
import { cn } from "@/lib/utils";

type DashboardViewProps = {
  data: DashboardData;
  viewerRole: UserRole;
};

const QUICK_LINKS = [
  {
    label: "Service Management",
    description: "Manage and track service requests and tickets",
    href: "/service-tickets/service-management",
    icon: Wrench,
    adminOnly: false,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
  },
  {
    label: "Installation Management",
    description: "Track appliance and system installation tasks",
    href: "/service-tickets/installation-management",
    icon: HardDriveDownload,
    adminOnly: false,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
  {
    label: "Project Management",
    description: "Oversee long-term contracts and corporate projects",
    href: "/service-tickets/project-management",
    icon: FolderKanban,
    adminOnly: false,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
  {
    label: "Users / Technicians",
    description: "Manage technician assignments, roles and staff",
    href: "/service-tickets/users",
    icon: UserCog,
    adminOnly: true,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/50",
  },
];

const KIND_ICONS: Record<
  import("@/lib/format").RecordKind,
  {
    icon: import("lucide-react").LucideIcon;
    color: string;
    bg: string;
  }
> = {
  SERVICE: {
    icon: Wrench,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
  },
  INSTALLATION: {
    icon: HardDriveDownload,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
  },
  PROJECT: {
    icon: FolderKanban,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
  CSH: {
    icon: Wallet,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/50",
  },
  ASSET: {
    icon: Boxes,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/50",
  },
  STV: {
    icon: Truck,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
  },
  REP: {
    icon: Wrench,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/50",
  },
};

function DashboardView({ data, viewerRole }: DashboardViewProps) {
  const isAdmin = viewerRole === "ADMIN";
  const { stats, monthlyActivity, recentActivities, pendingEvents } = data;

  const [selectedEvent, setSelectedEvent] = useState<PendingEventRow | null>(
    null,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleViewDetails = (event: PendingEventRow) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };

  const _scopeNote = isAdmin
    ? undefined
    : "Scoped to the records assigned to you.";

  return (
    <div className="space-y-4 sm:space-y-5 p-3.5 sm:p-5 lg:p-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="ServiceDesk 360 Dashboard"
        // description={
        //   scopeNote ??
        //   "Overview of service tickets, installations, projects, users, and technicians"
        // }
      />

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 md:gap-3.5">
        <StatCard
          label="Total Services"
          value={stats.totalServices}
          icon={Wrench}
          tone="open"
        />
        <StatCard
          label="Total Installations"
          value={stats.totalInstallations}
          icon={HardDriveDownload}
          tone="closed"
        />
        <StatCard
          label="Total Projects"
          value={stats.totalProjects}
          icon={FolderKanban}
          tone="progress"
        />
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={UsersIcon}
          tone="purple"
        />
        <StatCard
          label="Total Technicians"
          value={stats.totalTechnicians}
          icon={UserCog}
          tone="info"
        />
      </div>

      {/* 3. Monthly Activity Chart Card */}
      <div className="border-border bg-card rounded-xl border p-3.5 shadow-2xs sm:p-4.5">
        <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground sm:text-[15px]">
              Monthly Activity — Services, Installations & Projects
            </h2>
            <p className="text-muted-foreground text-xs">
              Aggregated dynamic volume across the past 6 months
            </p>
          </div>
        </div>
        <MonthlyActivityChart data={monthlyActivity} />
      </div>

      {/* 4. Quick Navigate */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground sm:text-[15px]">
            Quick Navigate
          </h2>
          <span className="text-muted-foreground text-xs">
            Direct access to modules
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-3.5">
          {QUICK_LINKS.filter((link) => isAdmin || !link.adminOnly).map(
            (link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group border-border bg-card hover:border-primary/50 hover:shadow-md flex flex-col justify-between rounded-xl border p-3.5 sm:p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg shrink-0",
                        link.bg,
                        link.color,
                      )}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200">
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                  <div className="mt-3.5">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {link.label}
                    </h3>
                    <p className="text-muted-foreground mt-0.5 text-xs line-clamp-2">
                      {link.description}
                    </p>
                  </div>
                </Link>
              );
            },
          )}
        </div>
      </div>

      {/* 5. Recent Activities & Upcoming Events */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Recent Activities */}
        <div className="border-border bg-card flex flex-col rounded-xl border p-3.5 shadow-2xs sm:p-4.5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground sm:text-[15px]">
              Recent Activities
            </h2>
            <p className="text-muted-foreground text-xs">
              Live system events and assignment updates
            </p>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center py-8 text-center text-xs">
              Nothing has happened yet.
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {recentActivities.map((item) => {
                const kindMeta = KIND_ICONS[item.kind] || KIND_ICONS.SERVICE;
                const KindIcon = kindMeta.icon;

                return (
                  <li key={item.key} className="py-3 first:pt-0 last:pb-0">
                    <div className="hover:bg-muted/40 -mx-2 flex items-start gap-3 rounded-lg p-2 transition-colors">
                      <div
                        className={cn(
                          "mt-0.5 flex size-8 items-center justify-center rounded-lg shrink-0",
                          kindMeta.bg,
                          kindMeta.color,
                        )}
                      >
                        <KindIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`${RECORD_KIND_PATHS[item.kind]}?view=${item.recordUuid}`}
                          className="text-foreground hover:text-primary block text-sm font-medium truncate"
                        >
                          {item.headline}
                        </Link>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                          <Clock className="size-3 shrink-0" />
                          <span>{formatRelativeTime(item.at)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="border-border bg-card flex flex-col rounded-xl border p-4 shadow-xs sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Upcoming Events
              </h2>
              <p className="text-muted-foreground text-xs">
                Scheduled & upcoming events
              </p>
            </div>
            <Link
              href="/service-tickets/service-management"
              className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {pendingEvents.rows.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center py-8 text-center text-xs">
              No scheduled or upcoming events.
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {pendingEvents.rows.map((row) => (
                <li
                  key={`${row.kind}-${row.id}`}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <div className="hover:bg-muted/40 -mx-2 flex flex-col gap-2 rounded-lg p-2.5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-foreground text-sm font-semibold truncate">
                          {row.customerName}
                        </h4>
                        <span className="border-border bg-muted text-muted-foreground font-mono text-[11px] font-semibold rounded px-1.5 py-0.5 border mt-1 inline-block">
                          {row.recordId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={row.status} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => handleViewDetails(row)}
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {row.technicianName || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="size-3.5 shrink-0" />
                        <span>{formatDate(row.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Details Dialogs for Upcoming Events */}
      {selectedEvent?.kind === "SERVICE" && selectedEvent.serviceRecord && (
        <ServiceDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          record={selectedEvent.serviceRecord}
        />
      )}

      {selectedEvent?.kind === "INSTALLATION" &&
        selectedEvent.installationRecord && (
          <InstallationDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            record={selectedEvent.installationRecord}
          />
        )}

      {selectedEvent?.kind === "PROJECT" && selectedEvent.projectRecord && (
        <ProjectDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          record={selectedEvent.projectRecord}
        />
      )}
    </div>
  );
}

export { DashboardView };
