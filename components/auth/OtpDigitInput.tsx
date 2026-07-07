"use client";

import { useCallback, useEffect, useRef } from "react";
import { OTP_LENGTH, normalizeOtpInput } from "@/lib/auth/otp";
import { isCompleteOtp } from "@/lib/auth/otp";

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
  const length = OTP_LENGTH;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusIndex = (index: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, index))];
    el?.focus();
    el?.select();
  };

  const applyValue = useCallback(
    (next: string) => {
      const normalized = normalizeOtpInput(next);
      onChange(normalized);
      if (isCompleteOtp(normalized)) {
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
      for (let i = 0; i < chunk.length && index + i < length; i++) {
        merged[index + i] = chunk[i]!;
      }
      const next = applyValue(merged.join(""));
      focusIndex(Math.min(index + chunk.length, length - 1));
      if (!isCompleteOtp(next)) focusIndex(Math.min(next.length, length - 1));
      return;
    }

    const arr = digits.slice();
    arr[index] = chunk;
    const next = applyValue(arr.join(""));
    if (chunk && index < length - 1) focusIndex(index + 1);
    else if (!isCompleteOtp(next)) focusIndex(Math.min(next.length, length - 1));
  };

  const onKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      focusIndex(index - 1);
    }
    if (key === "ArrowLeft" && index > 0) focusIndex(index - 1);
    if (key === "ArrowRight" && index < length - 1) focusIndex(index + 1);
  };

  useEffect(() => {
    if (autoFocus) focusIndex(0);
  }, [autoFocus]);

  return (
    <div className="otp-digit-row" role="group" aria-label="Email login code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={index === 0 ? OTP_LENGTH : 1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
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
            focusIndex(Math.min(next.length, length - 1));
          }}
        />
      ))}
    </div>
  );
}
