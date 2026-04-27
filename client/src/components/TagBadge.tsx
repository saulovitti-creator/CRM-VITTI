import React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Tag } from "@shared/types";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: Tag;
  onRemove?: (tagId: number) => void;
  className?: string;
}

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  // Utility function to determine if text should be light or dark based on background color
  const getContrastYIQ = (hexcolor: string) => {
    // Remove hash if present
    hexcolor = hexcolor.replace("#", "");
    
    // Parse RGB
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    
    // Calculate YIQ ratio
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return appropriate text color
    return yiq >= 128 ? "text-slate-900" : "text-white";
  };

  const textColorClass = getContrastYIQ(tag.color);

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-0.5 whitespace-nowrap rounded-md font-medium border-0 transition-opacity hover:opacity-90",
        textColorClass,
        className
      )}
      style={{
        backgroundColor: tag.color,
      }}
    >
      <span className="truncate max-w-[120px]">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(tag.id);
          }}
          className={cn(
            "rounded-full p-0.5 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-black/20",
            textColorClass
          )}
          aria-label={`Remove tag ${tag.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
