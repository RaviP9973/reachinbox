"use client";

import React from "react";

type BadgeVariant = "scheduled" | "sent" | "failed" | "processing";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  scheduled: "bg-badge-scheduled-bg text-badge-scheduled-text",
  sent: "bg-badge-sent-bg text-badge-sent-text",
  failed: "bg-badge-failed-bg text-badge-failed-text",
  processing: "bg-badge-processing-bg text-badge-processing-text",
};

const dotColors: Record<BadgeVariant, string> = {
  scheduled: "bg-badge-scheduled-text",
  sent: "bg-badge-sent-text",
  failed: "bg-badge-failed-text",
  processing: "bg-badge-processing-text",
};

export default function Badge({
  variant,
  children,
  dot = true,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${
            variant === "processing" ? "animate-pulse" : ""
          }`}
        />
      )}
      {children}
    </span>
  );
}

export function getStatusVariant(
  status: string
): BadgeVariant {
  switch (status.toUpperCase()) {
    case "SCHEDULED":
      return "scheduled";
    case "SENT":
      return "sent";
    case "FAILED":
      return "failed";
    case "PROCESSING":
      return "processing";
    default:
      return "scheduled";
  }
}
