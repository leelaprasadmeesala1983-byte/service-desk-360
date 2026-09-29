"use client";

import * as React from "react";

export type Density = "compact" | "default" | "comfortable";

interface DensityContextType {
  density: Density;
  setDensity: (density: Density) => void;
}

const DensityContext = React.createContext<DensityContextType>({
  density: "compact",
  setDensity: () => {},
});

const STORAGE_KEY = "servicedesk-ui-density";

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = React.useState<Density>("compact");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Density | null;
      if (
        saved &&
        (saved === "compact" || saved === "default" || saved === "comfortable")
      ) {
        setDensityState(saved);
        document.documentElement.setAttribute("data-density", saved);
      } else {
        document.documentElement.setAttribute("data-density", "compact");
      }
    } catch {
      document.documentElement.setAttribute("data-density", "compact");
    }
  }, []);

  const setDensity = React.useCallback((newDensity: Density) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem(STORAGE_KEY, newDensity);
      document.documentElement.setAttribute("data-density", newDensity);
    } catch {
      // ignore
    }
  }, []);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  return React.useContext(DensityContext);
}
