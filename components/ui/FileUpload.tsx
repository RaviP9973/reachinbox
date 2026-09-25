"use client";

import React, { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File, emailCount: number) => void;
  accept?: string;
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  accept = ".csv,.txt",
  className = "",
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [emailCount, setEmailCount] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseEmails = (content: string): number => {
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
    const matches = content.match(emailRegex);
    return matches ? new Set(matches.map((e) => e.toLowerCase())).size : 0;
  };

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const count = parseEmails(content);
        setEmailCount(count);
        onFileSelect(file, count);
      };
      reader.readAsText(file);
    },
    [onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    },
    [processFile]
  );

  return (
    <div className={className}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
          ${
            dragActive
              ? "border-primary bg-primary-lightest"
              : "border-border hover:border-primary/50 hover:bg-gray-50"
          }`}
      >
        <svg
          className="w-5 h-5 text-primary flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <div className="flex-1 min-w-0">
          {fileName ? (
            <div>
              <p className="text-sm font-medium text-text-primary truncate">
                {fileName}
              </p>
              <p className="text-xs text-primary font-medium">
                {emailCount} email{emailCount !== 1 ? "s" : ""} detected
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              <span className="text-primary font-medium">Upload List</span>
              {" "}— CSV or text file
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
