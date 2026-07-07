"use client";

import { useCallback, useEffect, useRef } from "react";
import { normalizeOtpInput } from "@/lib/auth/email-otp";

type OtpDigitInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function OtpDigitInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
}: OtpDigitInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const focusIndex = (index: number) => {
    const el = refs.current[Math.max(0, Math.min(5, index))];
    el?.focus();
    el?.select();
  };

  const applyValue = useCallback(
    (next: string) => {
      const normalized = normalizeOtpInput(next);
      onChange(normalized);
      if (normalized.length === 6) {
        onComplete?.(normalized);
      }
      return normalized;
    },
    [onChange, onComplete],
  );

  const setDigitAt = (index: number, raw: string) => {
    const chunk = raw.replace(/\D/g, "");
    if (!chunk) {
      const arr = digits.slice();
      arr[index] = "";
      applyValue(arr.join(""));
      return;
    }

    if (chunk.length > 1) {
      const merged = digits.slice();
      for (let i = 0; i < chunk.length && index + i < 6; i++) {
        merged[index + i] = chunk[i]!;
      }
      const next = applyValue(merged.join(""));
      focusIndex(Math.min(index + chunk.length, 5));
      if (next.length < 6) focusIndex(next.length);
      return;
    }

    const arr = digits.slice();
    arr[index] = chunk;
    const next = applyValue(arr.join(""));
    if (chunk && index < 5) focusIndex(index + 1);
    else if (next.length < 6) focusIndex(next.length);
  };

  const onKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
    if (key === "ArrowLeft" && index > 0) focusIndex(index - 1);
    if (key === "ArrowRight" && index < 5) focusIndex(index + 1);
  };

  useEffect(() => {
    if (autoFocus) focusIndex(0);
  }, [autoFocus]);

  return (
    <div className="otp-digit-row" role="group" aria-label="6-digit login code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          className={`otp-digit-cell ${digit ? "otp-digit-cell--filled" : ""}`}
          onChange={(e) => setDigitAt(index, e.target.value)}
          onKeyDown={(e) => onKeyDown(index, e.key)}
          onFocus={(e) => e.currentTarget.select()}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text");
            const next = applyValue(
              digits.slice(0, index).join("") + normalizeOtpInput(pasted),
            );
            focusIndex(Math.min(next.length, 5));
          }}
        />
      ))}
    </div>
  );
}
