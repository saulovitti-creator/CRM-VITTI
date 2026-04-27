import { List, LayoutGrid } from "lucide-react";
import { ViewMode } from "@/hooks/useViewMode";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  const modes: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: "list", label: "Lista", icon: <List className="w-5 h-5" /> },
    { id: "kanban", label: "Kanban", icon: <LayoutGrid className="w-5 h-5" /> },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {modes.map((mode) => {
        const isActive = viewMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onViewModeChange(mode.id)}
            className={`flex items-center gap-2 px-5 py-2.5 h-10 rounded-lg font-medium text-sm transition-all duration-300 border ${
              isActive
                ? "bg-primary text-primary-foreground border-primary/60"
                : "bg-muted/40 text-foreground border-border hover:border-primary/40 hover:bg-muted/50"
            }`}
          >
            <span className={`transition-all duration-300 ${isActive ? "scale-110" : "scale-100"}`}>
              {mode.icon}
            </span>
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
