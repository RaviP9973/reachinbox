"use client";

import React from "react";
import { signOut, useSession } from "next-auth/react";

interface SidebarProps {
  activeTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  onCompose: () => void;
  stats: { scheduled: number; sent: number } | null;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  onCompose,
  stats,
}: SidebarProps) {
  const { data: session } = useSession();

  return (
    <aside className="w-64 h-screen bg-sidebar-bg border-r border-border flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          ONB
        </h1>
      </div>

      {/* User profile */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white border border-border">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-xs text-text-muted truncate">
              {session?.user?.email || ""}
            </p>
          </div>
          <svg
            className="w-4 h-4 text-text-muted flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Compose button */}
      <div className="px-4 mb-6">
        <button
          onClick={onCompose}
          className="w-full py-2.5 px-4 bg-white border-2 border-primary text-primary font-medium text-sm rounded-lg hover:bg-primary-lightest transition-colors duration-200 cursor-pointer"
        >
          Compose
        </button>
      </div>

      {/* Navigation */}
      <div className="px-4">
        <p className="px-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
          Core
        </p>
        <nav className="flex flex-col gap-0.5">
          <button
            onClick={() => onTabChange("scheduled")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer w-full text-left
              ${
                activeTab === "scheduled"
                  ? "bg-primary-light text-primary font-medium"
                  : "text-text-secondary hover:bg-gray-100"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex-1">Scheduled</span>
            {stats && (
              <span className="text-xs text-text-muted">{stats.scheduled}</span>
            )}
          </button>

          <button
            onClick={() => onTabChange("sent")}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer w-full text-left
              ${
                activeTab === "sent"
                  ? "bg-primary-light text-primary font-medium"
                  : "text-text-secondary hover:bg-gray-100"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            <span className="flex-1">Sent</span>
            {stats && (
              <span className="text-xs text-text-muted">{stats.sent}</span>
            )}
          </button>
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <div className="px-4 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
