"use client";

import React, { useId, useState } from "react";
import { Key, Eye, EyeOff, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordValidationResult {
  trimmed: string;
  codePoints: number;
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

export function validateTempPassword(password: string): PasswordValidationResult {
  const trimmed = (password || "").trim();
  const codePoints = [...trimmed].length;
  const hasLength = codePoints >= 8 && codePoints <= 128;
  const hasUpper = /[A-Z]/.test(trimmed);
  const hasLower = /[a-z]/.test(trimmed);
  const hasNumber = /[0-9]/.test(trimmed);
  const isValid = hasLength && hasUpper && hasLower && hasNumber;

  return {
    trimmed,
    codePoints,
    hasLength,
    hasUpper,
    hasLower,
    hasNumber,
    isValid,
  };
}

export function getSecureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let val: number;
  do {
    crypto.getRandomValues(array);
    val = array[0];
  } while (val >= limit);
  return val % max;
}

export function generateSecurePassword(): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const specials = "@#$!%*?";
  const all = uppers + lowers + digits + specials;
  const parts = [
    uppers[getSecureRandomInt(uppers.length)],
    uppers[getSecureRandomInt(uppers.length)],
    lowers[getSecureRandomInt(lowers.length)],
    lowers[getSecureRandomInt(lowers.length)],
    digits[getSecureRandomInt(digits.length)],
    digits[getSecureRandomInt(digits.length)],
    specials[getSecureRandomInt(specials.length)],
    specials[getSecureRandomInt(specials.length)],
  ];
  while (parts.length < 12) {
    parts.push(all[getSecureRandomInt(all.length)]);
  }
  for (let i = parts.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}

export interface TempPasswordControlProps {
  mode: "auto" | "manual";
  onModeChange: (mode: "auto" | "manual") => void;
  manualPassword: string;
  onManualPasswordChange: (value: string) => void;
  inputId?: string;
  disabled?: boolean;
}

export function TempPasswordControl({
  mode,
  onModeChange,
  manualPassword,
  onManualPasswordChange,
  inputId: customInputId,
  disabled = false,
}: TempPasswordControlProps) {
  const generatedId = useId();
  const inputId = customInputId || `temp-password-input-${generatedId}`;
  const [showPassword, setShowPassword] = useState(false);

  const validation = validateTempPassword(manualPassword);

  const handleSuggest = () => {
    const suggested = generateSecurePassword();
    onManualPasswordChange(suggested);
    setShowPassword(true);
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Temporary Password Generation
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModeChange("auto")}
            className={cn(
              "flex flex-col text-left p-3 rounded-xl border text-xs transition cursor-pointer",
              mode === "auto"
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="font-semibold text-foreground flex items-center justify-between">
              Auto-generate
              {mode === "auto" && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="mt-1 text-[11px] leading-relaxed">
              Creates a secure 12-char password automatically.
            </span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onModeChange("manual");
              if (!manualPassword.trim()) {
                handleSuggest();
              }
            }}
            className={cn(
              "flex flex-col text-left p-3 rounded-xl border text-xs transition cursor-pointer",
              mode === "manual"
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="font-semibold text-foreground flex items-center justify-between">
              Set Manually
              {mode === "manual" && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className="mt-1 text-[11px] leading-relaxed">
              Provide or customize a specific temporary password.
            </span>
          </button>
        </div>
      </div>

      {/* Manual Input Block */}
      {mode === "manual" && (
        <div className="space-y-3 pt-1 animate-in fade-in">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={inputId}
                className="text-xs font-medium text-foreground flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 text-primary" />
                Manual Temporary Password
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={handleSuggest}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" /> Auto-suggest strong
              </button>
            </div>

            <div className="relative">
              <input
                id={inputId}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={manualPassword}
                disabled={disabled}
                onChange={(e) => onManualPasswordChange(e.target.value)}
                placeholder="Enter temporary password..."
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono outline-none transition focus:ring-2 focus:ring-primary/20 focus:border-primary pr-20 disabled:opacity-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border/50">
            <div
              className={cn(
                "flex items-center gap-1.5",
                validation.hasLength ? "text-emerald-500 font-medium" : "text-muted-foreground"
              )}
            >
              <Check className={cn("h-3 w-3", validation.hasLength ? "text-emerald-500" : "opacity-40")} />
              8–128 characters
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5",
                validation.hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground"
              )}
            >
              <Check className={cn("h-3 w-3", validation.hasUpper ? "text-emerald-500" : "opacity-40")} />
              1 uppercase letter
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5",
                validation.hasLower ? "text-emerald-500 font-medium" : "text-muted-foreground"
              )}
            >
              <Check className={cn("h-3 w-3", validation.hasLower ? "text-emerald-500" : "opacity-40")} />
              1 lowercase letter
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5",
                validation.hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground"
              )}
            >
              <Check className={cn("h-3 w-3", validation.hasNumber ? "text-emerald-500" : "opacity-40")} />
              1 number (0-9)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
