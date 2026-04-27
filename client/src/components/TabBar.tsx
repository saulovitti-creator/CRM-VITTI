import { useState } from "react";
import { Settings, Globe } from "lucide-react";

export type LeadType = "CRM" | "Site";

interface TabBarProps {
  activeTab: LeadType;
  onTabChange: (tab: LeadType) => void;
  crmCount: number;
  siteCount: number;
}

export default function TabBar({
  activeTab,
  onTabChange,
  crmCount,
  siteCount,
}: TabBarProps) {
  const [hoveredTab, setHoveredTab] = useState<LeadType | null>(null);

  const tabs: Array<{ id: LeadType; label: string; icon: React.ReactNode; count: number }> = [
    { id: "CRM", label: "CRM", icon: <Settings className="w-5 h-5" />, count: crmCount },
    { id: "Site", label: "Site", icon: <Globe className="w-5 h-5" />, count: siteCount },
  ];

  return (
    <div className="flex gap-3 mb-8 pb-6 border-b border-border">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isHovered = hoveredTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            className="relative group"
          >
            {/* Background glow effect */}
            <div
              className={`absolute inset-0 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-primary/20 opacity-100"
                  : isHovered
                    ? "bg-primary/10 opacity-75"
                    : "bg-primary/5 opacity-0"
              }`}
            ></div>

            {/* Button content */}
            <div
              className={`relative flex items-center gap-3 px-6 py-3 h-12 rounded-xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary/60"
                  : "bg-muted/40 text-foreground border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {/* Icon with animation */}
              <span
                className={`transition-all duration-300 ${
                  isActive ? "scale-110 text-white" : "scale-100 text-foreground"
                }`}
              >
                {tab.icon}
              </span>

              {/* Label */}
              <span className="font-semibold">{tab.label}</span>

              {/* Counter badge */}
              <span
                className={`ml-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted/50 text-foreground"
                }`}
              >
                {tab.count}
              </span>

              {/* Active underline animation */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/60 rounded-full animate-pulse"></div>
              )}
            </div>

            {/* Ripple effect on click */}
            {isActive && (
              <div className="absolute inset-0 rounded-xl bg-white/10 animate-ping opacity-75"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
