import React from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  filled?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, required, error, filled, children }: FormFieldProps) {
  return (
    <div>
      <label className="vatech-label flex items-center gap-1.5">
        <span>{label}</span>
        {required && <span className="text-vatech-red">*</span>}
        {filled && !error && (
          <span className="ml-0.5 inline-flex items-center animate-scale-in">
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path
                d="M1.5 5.5L5.5 9.5L12.5 1.5"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </label>
      {children}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
