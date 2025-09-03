import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AppState = {
  activePractitionerId?: string;
  setActivePractitionerId: (id?: string) => void;
  activePatientId?: string;
  setActivePatientId: (id?: string) => void;
};

const Ctx = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [activePractitionerId, _setActivePractitionerId] = useState<
    string | undefined
  >(() => {
    try {
      return localStorage.getItem("activePractitionerId") || undefined;
    } catch {
      return undefined;
    }
  });

  const [activePatientId, _setActivePatientId] = useState<string | undefined>(
    () => {
      try {
        return localStorage.getItem("activePatientId") || undefined;
      } catch {
        return undefined;
      }
    }
  );

  // Clear patient when practitioner changes
  useEffect(() => {
    if (!activePractitionerId) {
      _setActivePatientId(undefined);
      try {
        localStorage.removeItem("activePatientId");
      } catch {}
    }
  }, [activePractitionerId]);

  const value = useMemo(
    () => ({
      activePractitionerId,
      setActivePractitionerId: (id?: string) => {
        _setActivePractitionerId(id);
        try {
          if (id) localStorage.setItem("activePractitionerId", id);
          else localStorage.removeItem("activePractitionerId");
        } catch {}
      },
      activePatientId,
      setActivePatientId: (id?: string) => {
        _setActivePatientId(id);
        try {
          if (id) localStorage.setItem("activePatientId", id);
          else localStorage.removeItem("activePatientId");
        } catch {}
      },
    }),
    [activePractitionerId, activePatientId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
