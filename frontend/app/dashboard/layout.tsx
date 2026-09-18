"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  PieChart,
  Sparkles,
  Target,
  Wallet,
  FileText,
  BarChart3,
  Bell,
  Settings,
  Upload,
  LogOut,
  Search,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import OCRUploadModal from "@/components/OCRUploadModal";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
  { name: "Budgets", href: "/dashboard/budgets", icon: PiggyBank },
  { name: "Insights", href: "/dashboard/insights", icon: PieChart },
  { name: "AI Advisor", href: "/dashboard/advisor", icon: Sparkles, isAi: true },
  { name: "Goals", href: "/dashboard/goals", icon: Target },
  { name: "Accounts", href: "/dashboard/accounts", icon: Wallet },
  { name: "Receipts", href: "/dashboard/receipts", icon: FileText },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell, badge: "3" },
  { name: "Profile", href: "/dashboard/profile", icon: UserCircle },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

/** Two-letter monogram from the user's name, falling back to their email. */
function initials(name?: string | null, email?: string | null): string {
  const parts = (name?.trim() || email || "").split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "XP";
  const chars = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return chars.toUpperCase();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user, logout, fetchUser } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !token) {
      router.replace("/login");
    }
  }, [token, isMounted, router]);

  // Refresh the cached profile so the sidebar reflects server-side changes.
  useEffect(() => {
    if (isMounted && token) {
      fetchUser();
    }
  }, [isMounted, token, fetchUser]);

  if (!isMounted || !token) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const isAdvisorRoute = pathname === "/dashboard/advisor";

  return (
    <div className="app-canvas min-h-screen text-white flex flex-col md:flex-row antialiased">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex md:w-[272px] md:flex-col md:fixed md:inset-y-0 z-30 glass border-y-0 border-l-0 rounded-none">
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-7 border-b border-white/[0.08]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#93C5FD] group-hover:scale-105 transition-transform shadow-lg shadow-[#3B82F6]/10">
              <Sparkles size={18} className="text-[#3B82F6]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
                <span className="tracking-[-0.04em]">Xpense</span>
                <span className="rounded-full bg-[#38BDF8]/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#38BDF8] border border-[#38BDF8]/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#8B94A6]">Personal finance, clarified</p>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 pb-3 text-[10px] font-mono font-semibold uppercase tracking-[.14em] text-[#7E8799]">
            Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#3B82F6]/15 text-[#BFDBFE] border border-[#3B82F6]/25 font-semibold shadow-[inset_0_1px_rgba(255,255,255,.06)]"
                    : "text-[#9BA4B5] hover:text-white hover:bg-white/[0.05] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={
                      isActive
                        ? "text-[#3B82F6]"
                        : item.isAi
                        ? "text-[#38BDF8]"
                        : "text-[#9BA4B5]"
                    }
                  />
                  <span>{item.name}</span>
                </div>
                {item.isAi && (
                  <span className="text-[9px] font-mono bg-[#38BDF8]/20 text-[#38BDF8] px-1.5 py-0.5 rounded-full border border-[#38BDF8]/30">
                    AI
                  </span>
                )}
                {item.badge && (
                  <span className="text-[10px] font-mono bg-[#F3B45B]/20 text-[#F3B45B] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Footer Profile */}
        <div className="p-5 border-t border-white/[0.08] bg-black/10">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 min-w-0 rounded-lg hover:opacity-80 transition-opacity"
              title="View profile"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#BFDBFE] to-[#2563EB] text-[#0F172A] flex items-center justify-center font-mono text-xs font-bold shadow-lg shadow-[#3B82F6]/20">
                {initials(user?.full_name, user?.email)}
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.full_name || "My Account"}
                </p>
                <p className="text-[10px] font-mono text-[#9BA4B5] truncate">
                  {user?.email ?? "—"}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#9BA4B5] hover:text-white hover:bg-[#1B2130] rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Container ──────────────────────────── */}
      <div className="flex-1 md:pl-[272px] flex flex-col min-h-screen">
        {/* Topbar Header */}
        <header className="sticky top-0 z-20 h-20 bg-[#0B0D12]/70 backdrop-blur-2xl border-b border-white/[0.08] px-4 md:px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#9BA4B5] hover:text-white rounded-lg"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Global Search Input */}
            <div className="relative hidden sm:block w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA4B5]" />
              <input
                type="text"
                placeholder="Search transactions, budgets, insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.045] border border-white/[0.1] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#7E8799] focus:outline-none focus:border-[#3B82F6]/50 font-sans"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Sync Status */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#45D6A5]/10 border border-[#45D6A5]/25 text-[#45D6A5] text-[11px] font-mono">
              <ShieldCheck size={12} />
              <span>Live Sync</span>
            </div>

            {/* Quick Upload Receipt Action */}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload size={14} />}
              onClick={() => setOcrOpen(true)}
            >
              <span className="hidden sm:inline">Upload </span>Receipt
            </Button>

            {/* Notifications Bell */}
            <Link
              href="/dashboard/alerts"
              className="relative p-2 text-[#9BA4B5] hover:text-white hover:bg-[#141824] rounded-lg transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#F3B45B]" />
            </Link>
          </div>
        </header>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-[#0B0D12]/95 backdrop-blur-xl pt-16 px-6 pb-6 overflow-y-auto">
            <div className="space-y-1 mt-4">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30"
                        : "text-[#9BA4B5] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={item.isAi ? "text-[#38BDF8]" : ""} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight size={16} className="text-[#2A3140]" />
                  </Link>
                );
              })}
            </div>
            <div className="mt-8 pt-6 border-t border-[#2A3140]">
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main
          className={`flex-1 w-full max-w-[1480px] mx-auto p-4 md:p-10 ${
            isAdvisorRoute ? "flex flex-col min-h-0 overflow-hidden pb-20 md:pb-10" : "space-y-6 pb-24 md:pb-12"
          }`}
        >
          {children}
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="md:hidden fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-white/[0.1] bg-[#141824]/85 p-1.5 shadow-2xl backdrop-blur-2xl">
        {NAV_ITEMS.filter((item) => ["Dashboard", "Transactions", "Budgets", "AI Advisor", "Alerts"].includes(item.name)).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-medium transition-colors ${
                isActive ? "bg-[#3B82F6]/16 text-[#BFDBFE]" : "text-[#9BA4B5]"
              }`}
            >
              <span className="relative">
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
                {item.name === "Alerts" && <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-[#F3B45B]" />}
              </span>
              <span>{item.name === "AI Advisor" ? "Advisor" : item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* OCR Receipt Upload Modal */}
      <OCRUploadModal
        open={ocrOpen}
        onClose={() => setOcrOpen(false)}
        onSuccess={() => {
          // Trigger global refresh if needed
        }}
      />
    </div>
  );
}
