import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "./input";
import { formatCurrencyBRL, parseUserCurrencyInput } from "@/lib/currency";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  /**
   * The raw numeric value (e.g. "1500" or "1500.50").
   */
  value?: string | number;
  /**
   * Callback fired when the value changes.
   * Returns the raw numeric string without formatting.
   */
  onValueChange?: (value: string) => void;
}

/**
 * CurrencyInput
 * 
 * Keeps typing fluid and emits decimal reais for the backend.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => formatCurrencyBRL(value ?? ""));
    const isFocusedRef = useRef(false);
    const internalRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (!isFocusedRef.current) {
        setDisplayValue(formatCurrencyBRL(value ?? ""));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const normalizedValue = parseUserCurrencyInput(rawValue);

      setDisplayValue(rawValue);
      onValueChange?.(normalizedValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;
      const normalizedValue = parseUserCurrencyInput(e.target.value);
      setDisplayValue(formatCurrencyBRL(normalizedValue));
      onValueChange?.(normalizedValue);
      props.onBlur?.(e);
    };

    // Combine external ref and internal ref
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
        type="text" // Must be text to support "R$", "." and ","
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
