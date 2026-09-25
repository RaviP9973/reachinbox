"use client";

import React from "react";
import Badge, { getStatusVariant } from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import Spinner from "./ui/Spinner";
import type { EmailResponse } from "@/types";

interface SentEmailsProps {
  emails: EmailResponse[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
}

export default function SentEmails({
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
}: SentEmailsProps) {
  const filteredEmails = emails.filter(
    (email) =>
      email.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[date.getDay()];
    return `${day} ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })}`;
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-white outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <button className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <button
          onClick={onRefresh}
          className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredEmails.length === 0 ? (
        <EmptyState
          title="No sent emails"
          description={
            searchQuery
              ? "No emails match your search."
              : "Sent emails will appear here after they are processed."
          }
        />
      ) : (
        <div className="flex-1 overflow-auto">
          {filteredEmails.map((email, index) => (
            <div
              key={email.id}
              className="flex items-center px-6 py-3.5 border-b border-border-light hover:bg-gray-50/50 transition-colors animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="w-48 flex-shrink-0">
                <p className="text-sm text-text-primary font-medium truncate">
                  To: {email.recipientEmail.split("@")[0]}
                </p>
              </div>
              <div className="flex-shrink-0 mr-3">
                <Badge variant={getStatusVariant(email.status)}>
                  {email.status === "SENT" ? "Sent" : "Failed"}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">
                  <span className="font-medium">{email.subject}</span>
                  <span className="text-text-muted">
                    {" · "}
                    {email.body.replace(/<[^>]*>/g, "").substring(0, 60)}
                    ...
                  </span>
                </p>
              </div>
              {email.previewUrl && (
                <a
                  href={email.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-primary hover:underline flex-shrink-0"
                >
                  Preview
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
