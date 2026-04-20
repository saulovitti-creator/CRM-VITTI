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
    <div className="flex gap-3 mb-8 pb-6 border-b border-cyan-500/20">
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
                  ? "bg-gradient-to-r from-cyan-500/40 to-blue-500/40 opacity-100"
                  : isHovered
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-75"
                    : "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0"
              }`}
            ></div>

            {/* Button content */}
            <div
              className={`relative flex items-center gap-3 px-6 py-3 h-12 rounded-xl font-medium text-sm transition-all duration-300 border backdrop-blur-sm ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400/60 shadow-lg shadow-cyan-500/50"
                  : "bg-slate-700/40 text-slate-300 border-cyan-500/20 hover:border-cyan-400/40 hover:bg-slate-600/50"
              }`}
            >
              {/* Icon with animation */}
              <span
                className={`transition-all duration-300 ${
                  isActive ? "scale-110 text-white" : "scale-100 text-slate-300"
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
                    : "bg-slate-600/50 text-slate-200"
                }`}
              >
                {tab.count}
              </span>

              {/* Active underline animation */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-300 to-blue-300 rounded-full animate-pulse"></div>
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
