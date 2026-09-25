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

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    // If we've loaded the session but we don't have a backendToken after 3 seconds, show the diagnostic error
    const timer = setTimeout(() => {
      if (session && !(session as any).backendToken) {
        setLoadingTimeout(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [session, status]);

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadingTimeout) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-xl p-8 border border-red-100">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-6">Your frontend Vercel app failed to get the login token from your Render backend. This means your requests will get a 401 Unauthorized error.</p>
          
          <h3 className="font-semibold text-gray-900 mb-2">How to fix this:</h3>
          <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-700">
            <li><strong>Did you redeploy Vercel?</strong> Even if you added <code className="bg-gray-100 px-1 py-0.5 rounded">NEXT_PUBLIC_API_URL</code> in Vercel settings, you MUST go to Deployments - Redeploy to apply it.</li>
            <li><strong>Did you add the Client ID to Render?</strong> Make sure <code className="bg-gray-100 px-1 py-0.5 rounded">GOOGLE_CLIENT_ID</code> is saved in your <strong>Render</strong> environment variables so it can verify the login.</li>
            <li><strong>After fixing those:</strong> Click the button below to clear your broken session and try again!</li>
          </ol>
          
          <button 
            onClick={() => {
              document.cookie = "next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
              window.location.href = "/";
            }}
            className="mt-8 w-full bg-red-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear Session & Log Out
          </button>
        </div>
      </div>
    );
  }

  // If there's no backend token, don't try to render the rest of the dashboard which relies on it
  if (session && !(session as any).backendToken) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Connecting to backend...</p>
        </div>
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
