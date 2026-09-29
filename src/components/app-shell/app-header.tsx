"use client";

import { ChevronDown, KeyRound, LogOut, Menu, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItem } from "@/db/queries/notifications";
import { logout } from "@/lib/actions/auth";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/format";
import { getModuleFromPath } from "@/lib/modules";
import type { CurrentUser } from "@/lib/session";

import { ChangePasswordModal } from "./change-password-modal";
import { NotificationBell } from "./notification-bell";
import { ProfileModal } from "./profile-modal";
import { ServiceDeskLogo } from "./service-desk-logo";
import { useShell } from "./shell-context";

type ActiveModal = "profile" | "changePassword" | null;

type AppHeaderProps = {
  user: CurrentUser;
  notifications: NotificationItem[];
  unreadCount: number;
  variant?: "admin" | "account" | "light";
};

function AppHeader({
  user,
  notifications,
  unreadCount,
  variant,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { openMobileNav } = useShell();

  // Single mutually-exclusive modal state — only one modal is ever shown at a time.
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Support ?modal=profile and ?modal=change-password URL params (e.g. from redirected routes).
  useEffect(() => {
    const modalParam = searchParams?.get("modal");
    if (modalParam === "profile") {
      setActiveModal("profile");
    } else if (modalParam === "change-password") {
      setActiveModal("changePassword");
    }
  }, [searchParams]);

  const closeModal = () => {
    setActiveModal(null);
    // Clean up query param if present.
    if (searchParams?.get("modal")) {
      router.replace(pathname, { scroll: false });
    }
  };

  // Header dark/light variant logic.
  const isLightVariant =
    variant === "account" || variant === "light"
      ? true
      : variant === "admin"
        ? false
        : pathname === "/profile" ||
          pathname === "/change-password" ||
          pathname === "/settings" ||
          pathname.startsWith("/profile/") ||
          pathname.startsWith("/change-password/") ||
          pathname.startsWith("/settings/");
  const headerVariant = isLightVariant ? "light" : "admin";

  const activeModule = getModuleFromPath(pathname);
  const subtitle = activeModule?.shortName ?? "SERVICE PLATFORM";
  const displayName =
    `${user.firstName} ${user.lastName}`.trim() || user.name || user.email;

  const onLogout = () => {
    startTransition(async () => {
      await logout();
      router.replace("/login");
    });
  };

  // ── User dropdown ────────────────────────────────────────────────────────────
  const userDropdownMenu = (
    <DropdownMenuContent
      align="end"
      className="w-56 rounded-xl border border-border bg-popover p-1.5 shadow-lg"
    >
      <div className="px-2.5 py-2">
        <p className="text-foreground truncate text-sm font-semibold">
          {displayName}
        </p>
        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        <span className="bg-muted text-muted-foreground mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium">
          {USER_ROLE_LABELS[user.role]}
        </span>
      </div>
      <DropdownMenuSeparator />
      {/* Profile — independent; does NOT chain to Change Password */}
      <DropdownMenuItem
        onClick={() => setActiveModal("profile")}
        className="cursor-pointer"
      >
        <User className="mr-2 size-4" />
        My Profile
      </DropdownMenuItem>
      {/* Change Password — independent; does NOT open Profile */}
      <DropdownMenuItem
        onClick={() => setActiveModal("changePassword")}
        className="cursor-pointer"
      >
        <KeyRound className="mr-2 size-4" />
        Change Password
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onClick={onLogout}
        disabled={isPending}
        className="cursor-pointer text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 size-4" />
        Logout
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  // ── Modals — only one renders at a time ─────────────────────────────────────
  const modals = (
    <>
      {/* Profile modal — no link to Change Password */}
      <ProfileModal
        user={user}
        open={activeModal === "profile"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      />

      {/* Change Password modal — Cancel → dashboard (not back to Profile) */}
      <ChangePasswordModal
        open={activeModal === "changePassword"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        onCancel={closeModal}
      />
    </>
  );

  // ── Light header (account/settings pages) ────────────────────────────────────
  if (headerVariant === "light") {
    return (
      <>
        <header className="bg-card border-border sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 sm:px-6 lg:h-[68px] lg:px-8">
          <ServiceDeskLogo variant="light" subtitle="SERVICE PLATFORM" />

          {/* Desktop */}
          <div className="hidden flex-1 items-center justify-end gap-3 px-4 lg:flex lg:px-6">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors outline-none">
                <span className="bg-brand flex size-8 items-center justify-center rounded-full text-xs font-bold text-white">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                <span className="text-left">
                  <span className="text-foreground block max-w-40 truncate text-sm font-semibold">
                    {displayName}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </span>
                <ChevronDown className="text-muted-foreground size-3.5" />
              </DropdownMenuTrigger>
              {userDropdownMenu}
            </DropdownMenu>
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-2 text-foreground lg:hidden">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Open profile menu"
                className="bg-brand flex size-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white"
              >
                {getInitials(user.firstName, user.lastName)}
              </DropdownMenuTrigger>
              {userDropdownMenu}
            </DropdownMenu>
          </div>
        </header>
        {modals}
      </>
    );
  }

  // ── Admin / default dark header ───────────────────────────────────────────────
  return (
    <>
      <header className="bg-card border-border sticky top-0 z-40 flex h-14 items-stretch border-b lg:h-[68px]">
        <div className="bg-shell text-shell-foreground flex w-full shrink-0 items-center gap-2 px-3 pr-24 sm:gap-3 sm:px-4 sm:pr-28 lg:w-70 lg:px-6 lg:pr-6">
          {activeModule && (
            <button
              type="button"
              onClick={openMobileNav}
              aria-label="Open navigation menu"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-white/10 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          )}
          <ServiceDeskLogo variant="admin" subtitle={subtitle} />
        </div>

        {/* Desktop controls */}
        <div className="hidden flex-1 items-center justify-end gap-2 px-4 lg:flex lg:px-6">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors outline-none">
              <span className="bg-brand flex size-8.5 items-center justify-center rounded-full text-xs font-bold text-white">
                {getInitials(user.firstName, user.lastName)}
              </span>
              <span className="text-left">
                <span className="text-foreground block max-w-40 truncate text-sm font-semibold">
                  {displayName}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {USER_ROLE_LABELS[user.role]}
                </span>
              </span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </DropdownMenuTrigger>
            {userDropdownMenu}
          </DropdownMenu>
        </div>

        {/* Mobile compact controls — sit over the navy panel */}
        <div className="absolute inset-y-0 right-2 flex items-center gap-1 text-white lg:hidden">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open profile menu"
              className="bg-brand flex size-8.5 cursor-pointer items-center justify-center rounded-full text-xs font-bold"
            >
              {getInitials(user.firstName, user.lastName)}
            </DropdownMenuTrigger>
            {userDropdownMenu}
          </DropdownMenu>
        </div>
      </header>
      {modals}
    </>
  );
}

export { AppHeader };
