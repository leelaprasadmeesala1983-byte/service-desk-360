"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ShellContextValue = {
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

function ShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const value = useMemo(
    () => ({
      mobileNavOpen,
      openMobileNav: () => setMobileNavOpen(true),
      closeMobileNav: () => setMobileNavOpen(false),
    }),
    [mobileNavOpen],
  );

  return <ShellContext value={value}>{children}</ShellContext>;
}

function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside ShellProvider");
  return context;
}

export { ShellProvider, useShell };
