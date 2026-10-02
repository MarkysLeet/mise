"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored) {
      // Just initialize once without setting state in effect directly if it causes hydration mismatches or cascades.
      // Eslint is throwing an error for setState synchronously within an effect.
      // NextJS recommends delaying the state change slightly or initializing lazily
      const isCol = stored === "true";
      if (isCol !== isCollapsed) {
          queueMicrotask(() => setIsCollapsed(isCol));
      }
    }
  }, [isCollapsed]);

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  };

  const toggleSidebar = () => {
    setCollapsed(!isCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
