import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag } from "@shared/types";
import { TagBadge } from "./TagBadge";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#f43f5e", // rose
  "#64748b", // slate
];

export function TagSelector({
  selectedTagIds,
  onChange,
  placeholder = "Selecionar tags...",
  className,
  maxTags,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  
  const { data: allTags = [], isLoading } = trpc.tags.list.useQuery();
  const createTagMutation = trpc.tags.create.useMutation({
    onSuccess: (newTag) => {
      utils.tags.list.invalidate();
      onChange([...selectedTagIds, (newTag as any).id || (newTag as any).insertId]);
      setSearch("");
    },
  });

  const selectedTags = useMemo(() => {
    return selectedTagIds
      .map(id => allTags.find(t => t.id === id))
      .filter((t): t is Tag => t !== undefined);
  }, [allTags, selectedTagIds]);

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      if (maxTags && selectedTagIds.length >= maxTags) return;
      onChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreateNewTag = () => {
    if (!search.trim()) return;
    
    // Pick a random color
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    
    createTagMutation.mutate({
      name: search.trim(),
      color: randomColor
    });
  };

  const showCreateOption = search.trim() !== "" && 
    !allTags.some(t => t.name.toLowerCase() === search.toLowerCase());

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "justify-between border-border bg-muted/50 hover:bg-muted/50 h-auto min-h-10 px-3 py-2",
              !selectedTagIds.length && "text-muted-foreground",
              className
            )}
          >
            <div className="flex flex-wrap gap-1.5 items-center justify-start flex-1 text-left w-full overflow-hidden">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <TagBadge 
                    key={tag.id} 
                    tag={tag} 
                    onRemove={(id) => {
                      onChange(selectedTagIds.filter(t => t !== id));
                    }} 
                  />
                ))
              ) : (
                <span className="truncate">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[300px] p-0 border-border bg-muted shadow-[var(--shadow-lg)]" align="start">
          <Command className="bg-transparent" shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar ou criar tag..." 
              value={search}
              onValueChange={setSearch}
              className="text-foreground"
            />
            <CommandList className="max-h-[220px] overflow-y-auto custom-scrollbar">
              <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
                {isLoading ? "Carregando tags..." : "Busque ou crie uma tag."}
              </CommandEmpty>
              
              <CommandGroup>
                {allTags
                  .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
                  .map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    const disabled = !isSelected && maxTags !== undefined && selectedTagIds.length >= maxTags;
                    
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => toggleTag(tag.id)}
                        disabled={disabled}
                        className={cn(
                          "flex items-center justify-between cursor-pointer text-foreground data-[selected=true]:bg-muted/50",
                          disabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0 outline outline-1 outline-white/20" 
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="truncate" title={tag.name}>{tag.name}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </CommandItem>
                    );
                })}
              </CommandGroup>
              
              {showCreateOption && (
                <>
                  <CommandSeparator className="bg-muted" />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateNewTag}
                      className="cursor-pointer font-medium text-primary data-[selected=true]:bg-muted/50 data-[selected=true]:text-primary flex items-center justify-between"
                      disabled={createTagMutation.isPending}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Plus className="h-4 w-4 shrink-0" />
                        <span className="truncate">Criar "{search}"</span>
                      </div>
                      {createTagMutation.isPending && (
                        <span className="text-xs opacity-70 shrink-0">Criando...</span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {maxTags && (
        <p className="text-xs text-muted-foreground">
          Você pode selecionar até {maxTags} tags. ({selectedTagIds.length}/{maxTags} selecionadas)
        </p>
      )}
    </div>
  );
}
