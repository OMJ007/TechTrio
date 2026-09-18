"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import {
  User as UserIcon,
  Mail,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAuthStore, type UserRead } from "@/store/useAuthStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { StatCardSkeleton } from "@/components/ui/Skeleton";

const CURRENCIES = [
  { code: "INR", label: "INR — Indian Rupee (₹)" },
  { code: "USD", label: "USD — US Dollar ($)" },
  { code: "EUR", label: "EUR — Euro (€)" },
  { code: "GBP", label: "GBP — British Pound (£)" },
  { code: "AED", label: "AED — UAE Dirham (د.إ)" },
  { code: "SGD", label: "SGD — Singapore Dollar (S$)" },
];

const inputClass =
  "w-full rounded-lg border border-[#2A3140] bg-[#1B2130] px-4 py-2.5 text-white font-mono text-xs placeholder-[#5C6675] focus:outline-none focus:border-[#3B82F6]/60 transition-colors";

/** Two-letter monogram from the user's name, falling back to their email. */
function initials(user: UserRead | null): string {
  const source = user?.full_name?.trim() || user?.email || "";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "XP";
  const chars = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return chars.toUpperCase();
}

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
};

function SectionHeader({ icon, title, subtitle }: SectionProps) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-[#2A3140]">
      <div className="p-2.5 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-white text-base">{title}</h2>
        <p className="text-xs font-mono text-[#9BA4B5]">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();

  const [profile, setProfile] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Personal info form ──────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // ── Email form ──────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // ── Password form ───────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const applyProfile = useCallback(
    (data: UserRead) => {
      setProfile(data);
      setUser(data);
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setOccupation(data.occupation ?? "");
      setCurrency(data.currency ?? "INR");
    },
    [setUser],
  );

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      applyProfile(await apiFetch<UserRead>("/api/v1/auth/me"));
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleSaveInfo = async (e: FormEvent) => {
    e.preventDefault();
    setInfoMsg(null);
    setInfoError(null);

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^[\d+\-\s()]{6,20}$/.test(trimmedPhone)) {
      setInfoError("Enter a valid phone number — digits, spaces, +, - and () only.");
      return;
    }

    setSavingInfo(true);
    try {
      const updated = await apiFetch<UserRead>("/api/v1/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: trimmedPhone,
          occupation: occupation.trim(),
          currency,
        }),
      });
      applyProfile(updated);
      setInfoMsg("Personal information updated.");
    } catch (e: unknown) {
      setInfoError(e instanceof Error ? e.message : "Failed to update personal info");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangeEmail = async (e: FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMsg(null);
    setEmailError(null);

    try {
      const updated = await apiFetch<UserRead>("/api/v1/auth/me/email", {
        method: "PUT",
        body: JSON.stringify({
          new_email: newEmail.trim(),
          current_password: emailPassword,
        }),
      });
      applyProfile(updated);
      setNewEmail("");
      setEmailPassword("");
      setEmailMsg(`Login email changed to ${updated.email}.`);
    } catch (e: unknown) {
      setEmailError(e instanceof Error ? e.message : "Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await apiFetch<void>("/api/v1/auth/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password changed. Use it the next time you sign in.");
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <StatCardSkeleton />;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Profile</h1>
        <p className="text-xs font-mono text-[#9BA4B5]">
          Update your personal details and manage the credentials you sign in with.
        </p>
      </div>

      {loadError && <Alert variant="error" message={loadError} />}

      {/* ── Identity summary ──────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-[#BFDBFE] to-[#2563EB] text-[#0F172A] flex items-center justify-center font-mono text-xl font-bold shadow-lg shadow-[#3B82F6]/20">
            {initials(profile ?? user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-white truncate">
              {profile?.full_name || "Unnamed account"}
            </p>
            <p className="text-xs font-mono text-[#9BA4B5] truncate">{profile?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#45D6A5]/10 border border-[#45D6A5]/25 px-2.5 py-1 text-[#45D6A5]">
                <ShieldCheck size={11} /> Active
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] px-2.5 py-1 text-[#9BA4B5]">
                <CalendarDays size={11} /> Member since {memberSince}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] px-2.5 py-1 text-[#9BA4B5]">
                {profile?.currency ?? "INR"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Personal information ──────────────────────────────────── */}
      <Card className="p-6 space-y-6">
        <SectionHeader
          icon={<UserIcon size={20} />}
          title="Personal Information"
          subtitle="How your account is identified across Xpense AI"
        />

        {infoMsg && <Alert variant="success" message={infoMsg} />}
        {infoError && <Alert variant="error" message={infoError} />}

        <form onSubmit={handleSaveInfo} className="space-y-4 text-xs font-mono">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="full-name" className="block text-[#9BA4B5] mb-1">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alice Sharma"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-[#9BA4B5] mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="occupation" className="block text-[#9BA4B5] mb-1">
                Occupation
              </label>
              <input
                id="occupation"
                type="text"
                maxLength={120}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Product Designer"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="currency" className="block text-[#9BA4B5] mb-1">
                Preferred Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={savingInfo}
            leftIcon={<Check size={14} />}
          >
            Save Personal Info
          </Button>
        </form>
      </Card>

      {/* ── Login email ───────────────────────────────────────────── */}
      <Card className="p-6 space-y-6">
        <SectionHeader
          icon={<Mail size={20} />}
          title="Login Email"
          subtitle={`Currently signing in as ${profile?.email ?? "—"}`}
        />

        {emailMsg && <Alert variant="success" message={emailMsg} />}
        {emailError && <Alert variant="error" message={emailError} />}

        <form onSubmit={handleChangeEmail} className="space-y-4 text-xs font-mono">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-email" className="block text-[#9BA4B5] mb-1">
                New Email Address
              </label>
              <input
                id="new-email"
                type="email"
                required
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email-password" className="block text-[#9BA4B5] mb-1">
                Confirm With Current Password
              </label>
              <input
                id="email-password"
                type="password"
                required
                autoComplete="current-password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={savingEmail}
            leftIcon={<Mail size={14} />}
          >
            Update Email
          </Button>
        </form>
      </Card>

      {/* ── Password ──────────────────────────────────────────────── */}
      <Card className="p-6 space-y-6">
        <SectionHeader
          icon={<KeyRound size={20} />}
          title="Password"
          subtitle="Use at least 8 characters you don't reuse elsewhere"
        />

        {passwordMsg && <Alert variant="success" message={passwordMsg} />}
        {passwordError && <Alert variant="error" message={passwordError} />}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-mono">
          <div>
            <label htmlFor="current-password" className="block text-[#9BA4B5] mb-1">
              Current Password
            </label>
            <input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-password" className="block text-[#9BA4B5] mb-1">
                New Password
              </label>
              <input
                id="new-password"
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[#9BA4B5] mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[#9BA4B5] hover:text-white transition-colors"
          >
            {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={savingPassword}
              leftIcon={<KeyRound size={14} />}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
