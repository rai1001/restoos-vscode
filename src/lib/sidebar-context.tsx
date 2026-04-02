"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, useState, type ReactNode } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  setMobileOpen: (v: boolean) => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
  setMobileOpen: () => {},
  toggleMobile: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

const STORAGE_KEY = "restoos-sidebar-collapsed";
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const getSnapshot = () => localStorage.getItem(STORAGE_KEY) === "true";
const getServerSnapshot = () => false;

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = useCallback((v: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(v));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  function toggleCollapsed() {
    setCollapsed(!collapsed);
  }

  function toggleMobile() {
    setMobileOpen((v) => !v);
  }

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        setCollapsed,
        toggleCollapsed,
        setMobileOpen,
        toggleMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
