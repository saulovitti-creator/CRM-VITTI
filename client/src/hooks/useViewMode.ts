import { useState, useEffect } from "react";

export type ViewMode = "list" | "kanban";

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("crm-view-mode") as ViewMode | null;
    if (saved && (saved === "list" || saved === "kanban")) {
      setViewMode(saved);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when viewMode changes
  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("crm-view-mode", mode);
  };

  return {
    viewMode,
    changeViewMode,
    isLoaded,
  };
}
