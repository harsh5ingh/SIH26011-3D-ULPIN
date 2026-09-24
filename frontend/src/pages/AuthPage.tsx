import React, { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  UserRound,
  KeyRound,
  Loader2,
} from "lucide-react";

import {
  AuthMode,
  PortalType,
} from "./HomePage";

import {
  authApi,
  saveAuthSession,
} from "../services/api";

interface AuthPageProps {
  portal: PortalType;
  mode: AuthMode;
  onBack: () => void;
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  portal,
  mode: initialMode,
  onBack,
  onSuccess,
}) => {
  const [mode, setMode] =
    useState<AuthMode>(initialMode);

  const [showPassword, setShowPassword] =
    useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [officerCode, setOfficerCode] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const officer = portal === "officer";

  const submit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Full name is required.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (password.length < 8) {
        setError(
          "Password must be at least 8 characters."
        );
        return;
      }

      if (
        officer &&
        !officerCode.trim()
      ) {
        setError(
          "Officer authorization code is required."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const response =
        mode === "signin"
          ? await authApi.signin({
              email,
              password,
              role: portal,
            })
          : await authApi.signup({
              name,
              email,
              password,
              role: portal,
              ...(officer
                ? { officerCode }
                : {}),
            });

      saveAuthSession(response);

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-950 px-5 py-10 text-white sm:px-8">

      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-2">

        {/* LEFT */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-10 lg:block">

          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:36px_36px]" />

          <div className="relative flex h-full flex-col justify-between">

            <div>

              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                GeoVista
              </p>

              <h1 className="mt-5 text-4xl font-black leading-tight">
                Secure access to the{" "}
                {officer
                  ? "Officer"
                  : "Public"}{" "}
                Portal.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/80">
                {officer
                  ? "Authorized users can verify parcels, review evidence, run spatial validation and manage audit workflows."
                  : "Citizens can search permitted property information and explore the 3D cadastral environment."}
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-blue-100/80 backdrop-blur">

              <div className="flex items-center gap-3 font-bold text-white">

                <Landmark className="h-5 w-5 text-cyan-300" />

                Role-based portal access

              </div>

              <p className="mt-2 text-xs leading-5">
                Your portal selection determines
                the workspace you enter after
                authentication.
              </p>

            </div>

          </div>

        </div>

        {/* RIGHT */}
        <div className="p-7 text-slate-900 sm:p-10">

          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Home
          </button>

          <div className="mt-8">

            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                officer
                  ? "text-blue-600"
                  : "text-emerald-600"
              }`}
            >
              {officer
                ? "Officer Portal"
                : "Public Portal"}
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {mode === "signin"
                ? "Welcome back"
                : "Create your account"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {mode === "signin"
                ? "Sign in to continue to GeoVista."
                : "Create an account to access the selected portal."}
            </p>

          </div>

          <form
            className="mt-8 space-y-4"
            onSubmit={submit}
          >

            {mode === "signup" && (
              <Field
                icon={
                  <UserRound className="h-4 w-4" />
                }
                label="Full Name"
                placeholder="Enter your name"
                value={name}
                onChange={setName}
              />
            )}

            <Field
              icon={
                <Mail className="h-4 w-4" />
              }
              label="Email Address"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={setEmail}
            />

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Password
              </label>

              <div className="relative">

                <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                <input
                  required
                  minLength={8}
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (v) => !v
                    )
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>
            </div>

            {mode === "signup" && (
              <Field
                icon={
                  <LockKeyhole className="h-4 w-4" />
                }
                label="Confirm Password"
                placeholder="Re-enter password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
            )}

            {mode === "signup" &&
              officer && (
                <Field
                  icon={
                    <KeyRound className="h-4 w-4" />
                  }
                  label="Officer Authorization Code"
                  placeholder="Enter authorization code"
                  value={officerCode}
                  onChange={setOfficerCode}
                />
              )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                officer
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >

              {loading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Sign In"
                : "Create Account"}

            </button>

          </form>

          <div className="mt-6 text-center text-sm text-slate-500">

            {mode === "signin"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}

            <button
              onClick={() => {
                setError("");

                setMode(
                  mode === "signin"
                    ? "signup"
                    : "signin"
                );
              }}
              className="font-bold text-blue-600 hover:underline"
            >
              {mode === "signin"
                ? "Sign Up"
                : "Sign In"}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}> = ({
  icon,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}) => (
  <div>

    <label className="mb-1.5 block text-xs font-bold text-slate-700">
      {label}
    </label>

    <div className="relative">

      <span className="absolute left-3 top-3 text-slate-400">
        {icon}
      </span>

      <input
        required
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />

    </div>
  </div>
);