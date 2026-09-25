"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ScheduledEmails from "@/components/ScheduledEmails";
import SentEmails from "@/components/SentEmails";
import ComposeEmail from "@/components/ComposeEmail";
import Spinner from "@/components/ui/Spinner";
import apiClient from "@/lib/api";
import type { EmailResponse, EmailStats } from "@/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [view, setView] = useState<"list" | "compose">("list");
  const [scheduledEmails, setScheduledEmails] = useState<EmailResponse[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailResponse[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Set API token from session
  useEffect(() => {
    if (session) {
      const token = (session as any).backendToken;
      if (token) {
        apiClient.setToken(token);
      }
    }
  }, [session]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [scheduledRes, sentRes, statsRes] = await Promise.all([
        apiClient.getEmails("scheduled", 1, 50),
        apiClient.getEmails("sent", 1, 50),
        apiClient.getStats(),
      ]);
      setScheduledEmails(scheduledRes.data);
      setSentEmails(sentRes.data);
      setStats(statsRes);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((session as any)?.backendToken) {
      fetchData();
    }
  }, [(session as any)?.backendToken]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!(session as any)?.backendToken) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [(session as any)?.backendToken]);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) return null;

  const senderEmail = session.user?.email || "sender@domain.io";

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setView("list");
          setSearchQuery("");
        }}
        onCompose={() => setView("compose")}
        stats={stats ? { scheduled: stats.scheduled, sent: stats.sent } : null}
      />

      {/* Main content */}
      {view === "compose" ? (
        <ComposeEmail
          senderEmail={senderEmail}
          onBack={() => setView("list")}
          onSuccess={() => {
            setView("list");
            setActiveTab("scheduled");
            fetchData();
          }}
        />
      ) : activeTab === "scheduled" ? (
        <ScheduledEmails
          emails={scheduledEmails}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={fetchData}
        />
      ) : (
        <SentEmails
          emails={sentEmails}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
