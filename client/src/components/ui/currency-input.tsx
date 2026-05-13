import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "./input";
import { formatCurrencyBRL, parseUserCurrencyInput } from "@/lib/currency";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /**
   * The raw numeric value in decimal reais (e.g. "1500" or "1500.50").
   * This is the "source of truth" from the parent form.
   */
  value?: string | number;
  /**
   * Callback fired when the value changes.
   * Returns the raw decimal reais string (e.g. "40000" for R$ 40.000,00).
   */
  onValueChange?: (value: string) => void;
}

/**
 * CurrencyInput
 *
 * Contract:
 * - `value` prop: decimal reais from parent (e.g. "40000" or "40000.50")
 * - `onValueChange`: emits decimal reais string
 * - While typing: dynamically masks to BRL format (e.g. "R$ 15.000") left-to-right
 * - On blur: enforces strict BRL formatting (e.g. ensures ",00" if no decimals typed)
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const isFocusedRef = useRef(false);
    const internalRef = useRef<HTMLInputElement | null>(null);
    const lastEmittedRef = useRef<string>("");

    // Sync display from parent value ONLY when not focused
    useEffect(() => {
      if (isFocusedRef.current) return;

      const incoming = value ?? "";
      const incomingStr = String(incoming);

      // Avoid re-formatting if we just emitted this same value
      if (incomingStr === lastEmittedRef.current) return;

      setDisplayValue(formatCurrencyBRL(incoming));
    }, [value]);

    // Initial format on mount
    useEffect(() => {
      if (!isFocusedRef.current) {
        setDisplayValue(formatCurrencyBRL(value ?? ""));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Keep only digits and commas
      let cleaned = raw.replace(/[^\d,]/g, "");
      
      // Enforce max one comma
      const parts = cleaned.split(",");
      if (parts.length > 2) {
        cleaned = parts[0] + "," + parts.slice(1).join("");
      }
      
      let [intPart, decPart] = cleaned.split(",");
      
      if (intPart) {
        // Remove leading zeros unless it's just "0"
        intPart = intPart.replace(/^0+(?=\d)/, "");
        if (intPart === "") intPart = "0";
        // Add thousands separators
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      }
      
      let formatted = "";
      if (cleaned === "") {
        formatted = "";
      } else if (decPart !== undefined) {
        decPart = decPart.substring(0, 2);
        formatted = `R$ ${intPart},${decPart}`;
      } else {
        formatted = `R$ ${intPart}`;
      }

      setDisplayValue(formatted);

      // Parse and emit the normalized decimal reais value
      const normalized = parseUserCurrencyInput(formatted);
      lastEmittedRef.current = normalized;
      onValueChange?.(normalized);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;

      // On blur, fully normalize and format to guarantee ",00" if no decimals were typed
      const normalized = parseUserCurrencyInput(e.target.value);
      lastEmittedRef.current = normalized;

      setDisplayValue(formatCurrencyBRL(normalized));
      onValueChange?.(normalized);

      props.onBlur?.(e);
    };

    const setRefs = (element: HTMLInputElement | null) => {
      internalRef.current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };

    return (
      <Input
        {...props}
        ref={setRefs}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
