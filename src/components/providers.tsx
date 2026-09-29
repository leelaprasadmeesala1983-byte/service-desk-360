"use client";

import { DensityProvider } from "./density-provider";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DensityProvider>
        {children}
        <Toaster richColors />
      </DensityProvider>
    </ThemeProvider>
  );
}
