import * as React from "react";
import { cn } from "cn";

interface AppLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "size-7",
  md: "size-8",
  lg: "size-10",
  xl: "size-12",
};

export function AppLogo({ className, size = "md", ...props }: AppLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={cn(sizeClasses[size], "shrink-0", className)}
      aria-label="Ngabsennn Logo"
      {...props}
    >
      {/* Background squircle tile */}
      <rect width="32" height="32" rx="8" className="fill-zinc-950 dark:fill-zinc-900" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        className="stroke-zinc-800 dark:stroke-zinc-700/80"
        strokeWidth="1"
      />

      {/* Geometric 'N' Monogram */}
      <path
        d="M9 22.5V9.5L23 22.5V9.5"
        stroke="#ffffff"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Active / Done status node */}
      <circle cx="23" cy="9.5" r="1.75" fill="#10b981" />
    </svg>
  );
}
