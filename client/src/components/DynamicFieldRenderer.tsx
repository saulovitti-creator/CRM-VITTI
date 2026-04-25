import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CustomFieldDefinition } from "@shared/types";

interface DynamicFieldRendererProps {
  definition: CustomFieldDefinition;
  value: string | null;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * Renders the appropriate input control based on a CustomFieldDefinition's fieldType.
 * Supports: text, textarea, number, currency, date, dropdown, checkbox, url, email, phone
 */
export function DynamicFieldRenderer({
  definition,
  value,
  onChange,
  readOnly = false,
  className,
}: DynamicFieldRendererProps) {
  const fieldId = `custom-field-${definition.id}`;
  const commonInputClass = "bg-slate-800 border-slate-600 text-slate-100 mt-1 focus:border-cyan-500 focus:ring-cyan-500/30";

  // Parse dropdown options from JSON string
  const getOptions = (): string[] => {
    if (!definition.options) return [];
    try {
      const parsed = JSON.parse(definition.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Format currency display (R$ X.XXX,XX)
  const formatCurrencyDisplay = (val: string | null): string => {
    if (!val) return "";
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (readOnly) {
    return (
      <div className={cn("space-y-1", className)}>
        <Label className="text-xs text-slate-400">{definition.name}</Label>
        <p className="text-slate-100 text-sm font-medium min-h-[1.5rem]">
          {definition.fieldType === "checkbox"
            ? value === "true" ? "✅ Sim" : "❌ Não"
            : definition.fieldType === "currency"
              ? value ? formatCurrencyDisplay(value) : "-"
              : definition.fieldType === "url" && value
                ? (
                    <a 
                      href={value.startsWith("http") ? value : `https://${value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                      {value}
                    </a>
                  )
                : value || "-"}
        </p>
      </div>
    );
  }

  switch (definition.fieldType) {
    case "text":
    case "phone":
    case "email":
    case "url":
      return (
        <div className={cn("space-y-1", className)}>
          <Label htmlFor={fieldId} className="text-xs text-slate-400">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type={definition.fieldType === "email" ? "email" : definition.fieldType === "url" ? "url" : "text"}
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={definition.placeholder || ""}
            className={commonInputClass}
            required={definition.isRequired ?? false}
          />
        </div>
      );

    case "textarea":
      return (
        <div className={cn("space-y-1", className)}>
          <Label htmlFor={fieldId} className="text-xs text-slate-400">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Textarea
            id={fieldId}
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={definition.placeholder || ""}
            className={cn(commonInputClass, "resize-y min-h-[60px]")}
            rows={3}
            required={definition.isRequired ?? false}
          />
        </div>
      );

    case "number":
      return (
        <div className={cn("space-y-1", className)}>
          <Label htmlFor={fieldId} className="text-xs text-slate-400">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={definition.placeholder || "0"}
            className={commonInputClass}
            required={definition.isRequired ?? false}
          />
        </div>
      );

    case "currency":
      return (
        <div className={cn("space-y-1", className)}>
          <Label htmlFor={fieldId} className="text-xs text-slate-400">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm mt-0.5">R$</span>
            <Input
              id={fieldId}
              type="number"
              step="0.01"
              min="0"
              value={value || ""}
              onChange={(e) => onChange(e.target.value || null)}
              placeholder={definition.placeholder || "0,00"}
              className={cn(commonInputClass, "pl-10")}
              required={definition.isRequired ?? false}
            />
          </div>
        </div>
      );

    case "date":
      return (
        <div className={cn("space-y-1", className)}>
          <Label htmlFor={fieldId} className="text-xs text-slate-400">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={commonInputClass}
            required={definition.isRequired ?? false}
          />
        </div>
      );

    case "dropdown": {
      const options = getOptions();
      return (
        <div className={cn("space-y-1", className)}>
          <Label className="text-xs text-slate-400">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Select
            value={value || "__none__"}
            onValueChange={(v) => onChange(v === "__none__" ? null : v)}
          >
            <SelectTrigger className={cn(commonInputClass, "mt-1")}>
              <SelectValue placeholder={definition.placeholder || "Selecione..."} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="__none__" className="text-slate-400">
                {definition.placeholder || "Selecione..."}
              </SelectItem>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-slate-100">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "checkbox":
      return (
        <div className={cn("flex items-center gap-3 py-2", className)}>
          <Checkbox
            id={fieldId}
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
            className="border-slate-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
          />
          <Label htmlFor={fieldId} className="text-sm text-slate-300 cursor-pointer">
            {definition.name}
            {definition.isRequired && <span className="text-red-400 ml-1">*</span>}
          </Label>
        </div>
      );

    default:
      return (
        <div className={cn("space-y-1", className)}>
          <Label htmlFor={fieldId} className="text-xs text-slate-400">
            {definition.name} (tipo não suportado: {definition.fieldType})
          </Label>
          <Input
            id={fieldId}
            value={value || ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={commonInputClass}
          />
        </div>
      );
  }
}
