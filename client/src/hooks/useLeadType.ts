import { useState, useEffect } from "react";

export type LeadType = "CRM" | "Site";

const STORAGE_KEY = "activeLeadType";

export function useLeadType() {
  const [activeType, setActiveType] = useState<LeadType>("CRM");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LeadType | null;
    if (stored && (stored === "CRM" || stored === "Site")) {
      setActiveType(stored);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when activeType changes
  const setType = (type: LeadType) => {
    setActiveType(type);
    localStorage.setItem(STORAGE_KEY, type);
  };

  return { activeType, setType, isLoaded };
}
