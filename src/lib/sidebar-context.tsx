"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("restoos-sidebar-collapsed");
    if (stored === "true") setCollapsedState(true);
  }, []);

  function setCollapsed(v: boolean) {
    setCollapsedState(v);
    localStorage.setItem("restoos-sidebar-collapsed", String(v));
  }

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
