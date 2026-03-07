import { useRef } from "react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

/** Formats stored "+7XXXXXXXXXX" → "+7 (XXX) XXX-XX-XX" for display */
function toDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  const d = digits.startsWith("7") ? digits.slice(1) : digits;
  const s = d.slice(0, 10);
  if (!s) return "+7";
  if (s.length <= 3) return `+7 (${s}`;
  if (s.length <= 6) return `+7 (${s.slice(0, 3)}) ${s.slice(3)}`;
  if (s.length <= 8) return `+7 (${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6)}`;
  return `+7 (${s.slice(0, 3)}) ${s.slice(3, 6)}-${s.slice(6, 8)}-${s.slice(8, 10)}`;
}

/** Parses any typed/pasted input → stored "+7XXXXXXXXXX" */
function toStored(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Normalise leading 8 → 7
  const norm = digits.startsWith("8")
    ? "7" + digits.slice(1)
    : digits.startsWith("7")
    ? digits
    : "7" + digits;
  return "+" + norm.slice(0, 11); // "+7" + up to 10 digits
}

export function PhoneInput({ value, onChange, onBlur, className }: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(toStored(e.target.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    // Block backspace/delete when cursor would eat into "+7"
    if ((e.key === "Backspace" || e.key === "Delete") && start <= 2 && end <= 2) {
      e.preventDefault();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const len = e.target.value.length;
    setTimeout(() => e.target.setSelectionRange(len, len), 0);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    setTimeout(() => {
      if ((input.selectionStart ?? 0) < 2) input.setSelectionRange(2, 2);
    }, 0);
  };

  return (
    <input
      ref={inputRef}
      type="tel"
      value={toDisplay(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onClick={handleClick}
      onBlur={onBlur}
      className={className}
      placeholder="+7 (___) ___-__-__"
    />
  );
}
