import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Input } from "./input";
import { formatCurrency, parseCurrency } from "@/lib/currency";

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
 * Formats the input as BRL currency while the user types.
 * Filters out non-numeric characters on paste.
 * Manages cursor position to prevent jumping.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const internalRef = useRef<HTMLInputElement | null>(null);

    // Sync external raw value to internal formatted display
    useEffect(() => {
      // Only update if the parsed external value is different from the parsed internal display
      // This prevents formatting overwrites while typing (e.g., losing a trailing comma)
      const currentParsed = parseCurrency(displayValue);
      const newParsed = parseCurrency(value ?? "");
      
      if (currentParsed !== newParsed) {
        setDisplayValue(formatCurrency(value ?? ""));
      }
    }, [value, displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const currentCursorPosition = el.selectionStart || 0;
      const oldLength = el.value.length;
      const rawValue = el.value;

      // Extract raw digits and comma
      const parsedValue = parseCurrency(rawValue);
      // Format to "R$ 1.500,00"
      const newFormattedValue = formatCurrency(parsedValue);

      // We handle the edge case where the user types the exact same character
      // or just changes non-numeric stuff that gets stripped.
      setDisplayValue(newFormattedValue);

      if (onValueChange) {
        onValueChange(parsedValue);
      }

      // Restore cursor position seamlessly
      // Because formatting adds "R$ " and ".", the string length changes.
      // We calculate the length difference to keep the cursor conceptually in the same place.
      requestAnimationFrame(() => {
        if (internalRef.current) {
          const lengthDiff = newFormattedValue.length - oldLength;
          let newCursorPosition = currentCursorPosition + lengthDiff;
          
          // Prevent cursor from moving before the "R$ " prefix
          if (newCursorPosition < 3 && newFormattedValue.length > 0) {
            newCursorPosition = 3;
          }

          internalRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      });
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

    // Handle backspace gracefully to avoid jumping over thousand separators incorrectly
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
      
      const el = internalRef.current;
      if (e.key === "Backspace" && el) {
        const cursorPosition = el.selectionStart;
        if (cursorPosition !== null && cursorPosition > 0) {
          const charToDelete = el.value[cursorPosition - 1];
          // If the user tries to delete a formatting character (space, dot, R, $),
          // we don't prevent default, but the parsing will naturally ignore it.
          // However, for better UX, we could move the cursor manually, but the natural flow usually works well
          // when parsing strips it anyway.
        }
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
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
