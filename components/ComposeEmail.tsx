"use client";

import React, { useState, useCallback } from "react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import FileUpload from "./ui/FileUpload";
import { useToast } from "./ui/Toast";
import apiClient from "@/lib/api";

interface ComposeEmailProps {
  onBack: () => void;
  onSuccess: () => void;
  senderEmail: string;
}

export default function ComposeEmail({
  onBack,
  onSuccess,
  senderEmail,
}: ComposeEmailProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [emailCount, setEmailCount] = useState(0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [delayBetween, setDelayBetween] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("200");

  // Send Later picker state
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleFileSelect = useCallback((file: File, count: number) => {
    setCsvFile(file);
    setEmailCount(count);
  }, []);

  const handleSchedule = async () => {
    // Validate
    if (!subject.trim()) {
      addToast("error", "Subject is required");
      return;
    }
    if (!body.trim()) {
      addToast("error", "Email body is required");
      return;
    }
    if (!csvFile && !recipient.trim()) {
      addToast("error", "Add recipients via CSV upload or enter an email address");
      return;
    }
    if (!scheduledAt) {
      addToast("error", "Please pick a date and time to schedule");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("senderEmail", senderEmail);
      formData.append("scheduledAt", new Date(scheduledAt).toISOString());
      formData.append("delayBetweenEmailsMs", String(parseInt(delayBetween) * 1000));
      formData.append("hourlyLimit", hourlyLimit);

      if (csvFile) {
        formData.append("csvFile", csvFile);
      }
      if (recipient.trim()) {
        formData.append("recipients", JSON.stringify([recipient.trim()]));
      }

      const result = await apiClient.scheduleEmails(formData);
      addToast("success", result.message);
      onSuccess();
    } catch (error: any) {
      addToast("error", error.message || "Failed to schedule emails");
    } finally {
      setLoading(false);
    }
  };

  // Quick schedule options
  const getQuickOptions = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
      {
        label: "Tomorrow",
        value: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          9,
          0
        ).toISOString(),
      },
      {
        label: "Tomorrow, 10:00 AM",
        value: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          10,
          0
        ).toISOString(),
      },
      {
        label: "Tomorrow, 11:00 AM",
        value: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          11,
          0
        ).toISOString(),
      },
      {
        label: "Tomorrow, 3:00 PM",
        value: new Date(
          tomorrow.getFullYear(),
          tomorrow.getMonth(),
          tomorrow.getDate(),
          15,
          0
        ).toISOString(),
      },
    ];
  };

  return (
    <div className="flex-1 flex flex-col animate-fade-in bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-text-primary">
            Compose New Email
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Attachment icon */}
          <button className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          {/* Schedule icon */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 w-[280px] p-4 border border-border rounded-lg bg-white shadow-xl z-50 animate-slide-up">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  Send Later
                </h3>
                <div className="mb-3">
                  <label className="text-xs text-text-muted mb-1 block">
                    Pick date & time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  {getQuickOptions().map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        const d = new Date(opt.value);
                        const local = new Date(
                          d.getTime() - d.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16);
                        setScheduledAt(local);
                      }}
                      className="text-left px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-50 rounded transition-colors cursor-pointer"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDatePicker(false);
                      setScheduledAt("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSchedule}
            loading={loading}
          >
            Send Later
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl">
          {/* From */}
          <div className="flex items-center px-6 py-3 border-b border-border-light">
            <label className="text-sm text-text-secondary w-20 flex-shrink-0">
              From
            </label>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-sm text-text-primary">{senderEmail}</span>
              <svg
                className="w-3 h-3 text-text-muted"
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

          {/* To */}
          <div className="flex items-center px-6 py-3 border-b border-border-light">
            <label className="text-sm text-text-secondary w-20 flex-shrink-0">
              To
            </label>
            <div className="flex-1 flex items-center gap-3">
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 text-sm outline-none bg-transparent text-text-primary placeholder:text-text-muted"
              />
              <FileUpload
                onFileSelect={handleFileSelect}
                className="flex-shrink-0"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-center px-6 py-3 border-b border-border-light">
            <label className="text-sm text-text-secondary w-20 flex-shrink-0">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-sm outline-none bg-transparent text-text-primary placeholder:text-text-muted"
            />
          </div>

          {/* Delay & Hourly limit */}
          <div className="flex items-center gap-6 px-6 py-3 border-b border-border-light">
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary whitespace-nowrap">
                Delay between 2 emails
              </label>
              <input
                type="number"
                min="1"
                value={delayBetween}
                onChange={(e) => setDelayBetween(e.target.value)}
                className="w-16 px-2 py-1 text-sm border border-border rounded-md text-center outline-none focus:border-primary transition-colors"
              />
              <span className="text-xs text-text-muted">sec</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary whitespace-nowrap">
                Hourly Limit
              </label>
              <input
                type="number"
                min="1"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
                className="w-16 px-2 py-1 text-sm border border-border rounded-md text-center outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your email here..."
              rows={12}
              className="w-full text-sm outline-none bg-transparent text-text-primary placeholder:text-text-muted resize-none leading-relaxed"
            />
          </div>

          {/* Bottom toolbar with formatting icons (visual only) */}
          <div className="px-6 py-2 border-t border-border-light flex items-center gap-1">
            {["B", "I", "U", "S"].map((fmt) => (
              <button
                key={fmt}
                className="w-8 h-8 flex items-center justify-center text-sm font-medium text-text-muted hover:bg-gray-100 rounded transition-colors cursor-pointer"
              >
                {fmt}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            {[
              "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33",
              "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101",
              "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
            ].map((path, i) => (
              <button
                key={i}
                className="w-8 h-8 flex items-center justify-center text-text-muted hover:bg-gray-100 rounded transition-colors cursor-pointer"
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
                    d={path}
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
