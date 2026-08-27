import { useCallback, useEffect, useRef } from "react";
import { OTP_LENGTH, normalizeOtpInput, isCompleteOtp } from "@/lib/auth/otp";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

/** Same 6-cell OTP UX as web OtpDigitInput — no Next/i18n deps. */
export function NativeOtpDigitInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
}: Props) {
  const length = OTP_LENGTH;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusIndex = useCallback(
    (index: number) => {
      const el = refs.current[Math.max(0, Math.min(length - 1, index))];
      el?.focus();
      el?.select();
    },
    [length],
  );

  const applyValue = useCallback(
    (next: string) => {
      const normalized = normalizeOtpInput(next);
      onChange(normalized);
      if (isCompleteOtp(normalized)) onComplete?.(normalized);
      return normalized;
    },
    [onChange, onComplete],
  );

  useEffect(() => {
    if (autoFocus) focusIndex(0);
  }, [autoFocus, focusIndex]);

  return (
    <div
      className="otp-digit-row"
      role="group"
      aria-label="Email login code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className={`otp-digit-cell${digit ? " otp-digit-cell--filled" : ""}`}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => {
            const chunk = e.target.value.replace(/\D/g, "");
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
              if (!isCompleteOtp(next)) {
                focusIndex(Math.min(next.length, length - 1));
              }
              return;
            }
            const arr = digits.slice();
            arr[index] = chunk;
            applyValue(arr.join(""));
            if (index < length - 1) focusIndex(index + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[index] && index > 0) {
              focusIndex(index - 1);
            }
            if (e.key === "ArrowLeft" && index > 0) focusIndex(index - 1);
            if (e.key === "ArrowRight" && index < length - 1) {
              focusIndex(index + 1);
            }
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
