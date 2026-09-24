import React, {
  useEffect,
  useState,
} from "react";

import { GeoVistaProvider } from "./context/GeoVistaContext";
import { Navbar } from "./components/Navbar";

import { PublicPortal } from "./pages/PublicPortal";
import { OfficerPortal } from "./pages/OfficerPortal";
import { ScenariosPage } from "./pages/ScenariosPage";
import { HomePage } from "./pages/HomePage";

import {
  api,
  AuthUser,
} from "./services/api";

/* ==========================================================================
   TYPES
========================================================================== */

type View =
  | "home"
  | "public"
  | "officer"
  | "scenarios";

type AuthMode =
  | "signin"
  | "signup"
  | null;

type PortalRole =
  | "public"
  | "officer"
  | null;

/* ==========================================================================
   DEMO OFFICER
   Must match backend demo credentials.
========================================================================== */

const DEMO_OFFICER_EMAIL =
  "demo.officer@geovista.demo";

const DEMO_OFFICER_PASSWORD =
  "GeoVista@Demo2026";

/* ==========================================================================
   APP CONTENT
========================================================================== */

const AppContent: React.FC = () => {
  const [view, setView] =
    useState<View>("home");

  const [authMode, setAuthMode] =
    useState<AuthMode>(null);

  const [authRole, setAuthRole] =
    useState<PortalRole>(null);

  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(null);

  /* ------------------------------------------------------------------------
     RESTORE SESSION
  ------------------------------------------------------------------------ */

  useEffect(() => {
    const restoreSession =
      async () => {
        if (
          !api.isAuthenticated()
        ) {
          return;
        }

        try {
          const response =
            await api.me();

          setCurrentUser(
            response.user,
          );

          if (
            response.user.role ===
            "officer"
          ) {
            setView("officer");
          } else {
            setView("public");
          }
        } catch {
          api.logout();

          setCurrentUser(null);
          setView("home");
        }
      };

    void restoreSession();
  }, []);

  /* ------------------------------------------------------------------------
     AUTH
  ------------------------------------------------------------------------ */

  const openAuth = (
    role: PortalRole,
    mode: AuthMode = "signin",
  ) => {
    setAuthRole(role);
    setAuthMode(mode);
  };

  const closeAuth = () => {
    setAuthMode(null);
    setAuthRole(null);
  };

  /* ------------------------------------------------------------------------
     AUTH SUCCESS
  ------------------------------------------------------------------------ */

  const handleAuthenticated = (
    user: AuthUser,
  ) => {
    setCurrentUser(user);
    closeAuth();

    if (
      user.role === "officer"
    ) {
      setView("officer");
    } else {
      setView("public");
    }
  };

  /* ------------------------------------------------------------------------
     PUBLIC PORTAL
  ------------------------------------------------------------------------ */

  const openPublicPortal = () => {
    if (
      currentUser?.role ===
      "public"
    ) {
      setView("public");
      return;
    }

    if (
      currentUser?.role ===
      "officer"
    ) {
      openAuth(
        "public",
        "signin",
      );
      return;
    }

    openAuth(
      "public",
      "signin",
    );
  };

  /* ------------------------------------------------------------------------
     OFFICER PORTAL
  ------------------------------------------------------------------------ */

  const openOfficerPortal = () => {
    if (
      currentUser?.role ===
      "officer"
    ) {
      setView("officer");
      return;
    }

    if (
      currentUser?.role ===
      "public"
    ) {
      alert(
        "Public accounts cannot access the Officer Portal.",
      );
      return;
    }

    openAuth(
      "officer",
      "signin",
    );
  };

  /* ------------------------------------------------------------------------
     LOGOUT
  ------------------------------------------------------------------------ */

  const handleLogout = () => {
    api.logout();

    setCurrentUser(null);
    setView("home");
    closeAuth();
  };

  /* ------------------------------------------------------------------------
     PORTAL AUTH ACTIONS
  ------------------------------------------------------------------------ */

  const openPublicSignIn =
    () => {
      openAuth(
        "public",
        "signin",
      );
    };

  const openPublicSignUp =
    () => {
      openAuth(
        "public",
        "signup",
      );
    };

  const openOfficerSignIn =
    () => {
      openAuth(
        "officer",
        "signin",
      );
    };

  const openOfficerSignUp =
    () => {
      openAuth(
        "officer",
        "signup",
      );
    };

  /* ------------------------------------------------------------------------
     PROFILE
  ------------------------------------------------------------------------ */

  const openProfile = () => {
    alert(
      "Profile page will be available soon.",
    );
  };

  /* ------------------------------------------------------------------------
     SETTINGS
  ------------------------------------------------------------------------ */

  const openSettings = () => {
    alert(
      "Settings will be available soon.",
    );
  };

  /* ------------------------------------------------------------------------
     HELP
  ------------------------------------------------------------------------ */

  const openHelp = () => {
    alert(
      "GeoVista Help & Support will be available soon.",
    );
  };

  /* ------------------------------------------------------------------------
     HOME SIGN IN
  ------------------------------------------------------------------------ */

  const handleHomeSignIn =
    () => {
      if (currentUser) {
        if (
          currentUser.role ===
          "officer"
        ) {
          setView("officer");
        } else {
          setView("public");
        }

        return;
      }

      openAuth(
        "public",
        "signin",
      );
    };

  /* ------------------------------------------------------------------------
     HOME SIGN UP
  ------------------------------------------------------------------------ */

  const handleHomeSignUp =
    () => {
      openAuth(
        "public",
        "signup",
      );
    };

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ==================================================================
          NAVBAR
      ================================================================== */}

      <Navbar
        currentView={view}
        currentUser={currentUser}

        onHome={() =>
          setView("home")
        }

        onPublic={
          openPublicPortal
        }

        onOfficer={
          openOfficerPortal
        }

        onPublicSignIn={
          openPublicSignIn
        }

        onPublicSignUp={
          openPublicSignUp
        }

        onOfficerSignIn={
          openOfficerSignIn
        }

        onOfficerSignUp={
          openOfficerSignUp
        }

        onProfile={
          openProfile
        }

        onSettings={
          openSettings
        }

        onHelp={
          openHelp
        }

        onLogout={
          handleLogout
        }
      />

      {/* ==================================================================
          PAGE CONTENT
      ================================================================== */}

      <main>

        {/* HOME */}

        {view === "home" && (
          <HomePage
            onPublic={
              openPublicPortal
            }
            onOfficer={
              openOfficerPortal
            }
            onSignIn={
              handleHomeSignIn
            }
            onSignUp={
              handleHomeSignUp
            }
          />
        )}

        {/* PUBLIC */}

        {view === "public" && (
          currentUser?.role ===
          "public" ? (
            <PublicPortal />
          ) : (
            <AccessDenied
              expectedRole="public"
              onBack={() =>
                setView("home")
              }
            />
          )
        )}

        {/* OFFICER */}

        {view === "officer" && (
          currentUser?.role ===
          "officer" ? (
            <OfficerPortal />
          ) : (
            <AccessDenied
              expectedRole="officer"
              onBack={() =>
                setView("home")
              }
            />
          )
        )}

        {/* SCENARIOS */}

        {view === "scenarios" && (
          <ScenariosPage />
        )}

      </main>

      {/* ==================================================================
          AUTH MODAL
      ================================================================== */}

      {authMode && (
        <AuthModal
          mode={authMode}
          role={authRole}
          onClose={
            closeAuth
          }
          onModeChange={
            setAuthMode
          }
          onSuccess={
            handleAuthenticated
          }
        />
      )}

      {/* ==================================================================
          FOOTER
      ================================================================== */}

      {view !== "home" && (
        <footer className="bg-[#031b33] text-white">

          <div className="mx-auto max-w-7xl px-6 py-10">

            <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

              {/* GOVERNMENT */}

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
                    🇮🇳
                  </div>

                  <div>

                    <div className="text-lg font-semibold">
                      भारतीय सर्वेक्षण विभाग
                    </div>

                    <div className="text-xl font-bold">
                      Survey of India
                    </div>

                  </div>

                </div>

                <p className="mt-3 text-sm text-slate-300">
                  Ministry of Science &
                  Technology
                </p>

                <p className="text-sm text-slate-400">
                  Government of India
                </p>

              </div>

              {/* ABOUT */}

              <div>

                <h3 className="mb-4 font-bold">
                  About
                </h3>

                <div className="space-y-2 text-sm text-slate-300">

                  <p>
                    About GeoVista
                  </p>

                  <p>
                    Ministry of Science &
                    Technology
                  </p>

                  <p>
                    Survey of India
                  </p>

                  <p>
                    Terms of Use
                  </p>

                  <p>
                    Privacy Policy
                  </p>

                  <p>
                    Accessibility
                  </p>

                </div>

              </div>

              {/* QUICK LINKS */}

              <div>

                <h3 className="mb-4 font-bold">
                  Quick Links
                </h3>

                <div className="space-y-2 text-sm text-slate-300">

                  <button
                    type="button"
                    onClick={
                      openPublicPortal
                    }
                    className="block transition hover:text-white"
                  >
                    Public Portal
                  </button>

                  <button
                    type="button"
                    onClick={
                      openOfficerPortal
                    }
                    className="block transition hover:text-white"
                  >
                    Officer Portal
                  </button>

                  {!currentUser && (
                    <button
                      type="button"
                      onClick={() =>
                        openAuth(
                          "public",
                          "signin",
                        )
                      }
                      className="block transition hover:text-white"
                    >
                      Sign In
                    </button>
                  )}

                  {currentUser && (
                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="block transition hover:text-white"
                    >
                      Sign Out
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={
                      openHelp
                    }
                    className="block transition hover:text-white"
                  >
                    Help & Support
                  </button>

                  <p>
                    FAQs
                  </p>

                  <p>
                    Sitemap
                  </p>

                </div>

              </div>

              {/* CONNECT */}

              <div>

                <h3 className="mb-4 font-bold">
                  Connect With Us
                </h3>

                <div className="mb-5 flex gap-4 text-xl">
                  <span>𝕏</span>
                  <span>in</span>
                  <span>▶</span>
                  <span>◎</span>
                </div>

                <p className="text-sm leading-relaxed text-slate-300">
                  📍 Survey of India,
                  Hathibarkala Estate
                  <br />
                  Dehradun - 248001,
                  Uttarakhand, India
                </p>

              </div>

            </div>

            <div className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-700 pt-5 text-xs text-slate-400 md:flex-row">

              <span>
                © 2026 GeoVista - 3D
                ULPIN Platform. All
                rights reserved.
              </span>

              <span>
                A Digital Initiative under
                Ministry of Science &
                Technology, Government of
                India
              </span>

            </div>

          </div>

        </footer>
      )}

    </div>
  );
};

/* ==========================================================================
   ACCESS DENIED
========================================================================== */

interface AccessDeniedProps {
  expectedRole:
    | "public"
    | "officer";

  onBack: () => void;
}

const AccessDenied: React.FC<
  AccessDeniedProps
> = ({
  expectedRole,
  onBack,
}) => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">

      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
          🔒
        </div>

        <h2 className="text-2xl font-bold text-slate-900">
          Access Restricted
        </h2>

        <p className="mt-3 text-slate-600">
          This portal requires a{" "}
          <strong>
            {expectedRole}
          </strong>{" "}
          account.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Home
        </button>

      </div>

    </div>
  );
};

/* ==========================================================================
   AUTH MODAL
========================================================================== */

interface AuthModalProps {
  mode:
    | "signin"
    | "signup";

  role:
    | "public"
    | "officer"
    | null;

  onClose: () => void;

  onModeChange: (
    mode:
      | "signin"
      | "signup",
  ) => void;

  onSuccess: (
    user: AuthUser,
  ) => void;
}

/* ==========================================================================
   EMAIL VALIDATION
========================================================================== */

const isValidEmail = (
  email: string,
): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email.trim(),
  );
};

/* ==========================================================================
   OFFICIAL OFFICER EMAIL
========================================================================== */

const isOfficialOfficerEmail = (
  email: string,
): boolean => {
  const normalizedEmail =
    email.trim().toLowerCase();

  const parts =
    normalizedEmail.split("@");

  if (parts.length !== 2) {
    return false;
  }

  const domain =
    parts[1];

  return (
    domain === "gov.in" ||
    domain.endsWith(".gov.in") ||
    domain === "nic.in" ||
    domain.endsWith(".nic.in")
  );
};

/* ==========================================================================
   AUTH MODAL
========================================================================== */

const AuthModal: React.FC<
  AuthModalProps
> = ({
  mode,
  role,
  onClose,
  onModeChange,
  onSuccess,
}) => {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [officerCode, setOfficerCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const portalTitle =
    role === "officer"
      ? "Officer Portal"
      : "Public Portal";

  /* ------------------------------------------------------------------------
     SWITCH MODE
  ------------------------------------------------------------------------ */

  const switchMode = (
    nextMode:
      | "signin"
      | "signup",
  ) => {
    setError(null);
    setName("");
    setOfficerCode("");
    setEmail("");
    setPassword("");

    onModeChange(
      nextMode,
    );
  };

  /* ------------------------------------------------------------------------
     DEMO OFFICER LOGIN
  ------------------------------------------------------------------------ */

  const handleDemoOfficerLogin =
    async () => {
      setError(null);
      setLoading(true);

      try {
        const response =
          await api.signin({
            email:
              DEMO_OFFICER_EMAIL,
            password:
              DEMO_OFFICER_PASSWORD,
            role: "officer",
          });

        if (
          response.user.role !==
          "officer"
        ) {
          throw new Error(
            "Demo account does not have Officer Portal access.",
          );
        }

        onSuccess(
          response.user,
        );
      } catch (
        err: any
      ) {
        console.error(
          "Demo Officer login failed:",
          err,
        );

        setError(
          err?.message ||
            "Demo Officer login failed. Please make sure the backend is running.",
        );
      } finally {
        setLoading(false);
      }
    };

  /* ------------------------------------------------------------------------
     NORMAL SUBMIT
  ------------------------------------------------------------------------ */

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setError(null);

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanOfficerCode =
      officerCode.trim();

    /* ==============================================================
       EMAIL
    ============================================================== */

    if (
      !isValidEmail(
        cleanEmail,
      )
    ) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    /* ==============================================================
       OFFICER EMAIL
       Demo login is handled separately above.
    ============================================================== */

    if (
      role === "officer" &&
      !isOfficialOfficerEmail(
        cleanEmail,
      )
    ) {
      setError(
        "Officer Portal requires an official government email ending in @gov.in or @nic.in. For SIH evaluation, use the Try Demo Officer option below.",
      );
      return;
    }

    /* ==============================================================
       PASSWORD
    ============================================================== */

    if (!password) {
      setError(
        "Please enter your password.",
      );
      return;
    }

    /* ==============================================================
       SIGNUP VALIDATION
    ============================================================== */

    if (
      mode === "signup"
    ) {
      if (!cleanName) {
        setError(
          "Please enter your full name.",
        );
        return;
      }

      if (
        password.length < 8
      ) {
        setError(
          "Password must be at least 8 characters.",
        );
        return;
      }

      if (
        role === "officer" &&
        !cleanOfficerCode
      ) {
        setError(
          "Officer authorization code is required.",
        );
        return;
      }
    }

    setLoading(true);

    try {
      /* ==============================================================
         SIGNUP
      ============================================================== */

      if (
        mode === "signup"
      ) {
        const signupRole =
          role === "officer"
            ? "officer"
            : "public";

        const response =
          await api.signup({
            name: cleanName,
            email: cleanEmail,
            password,
            role: signupRole,

            ...(signupRole ===
              "officer" && {
              officer_code:
                cleanOfficerCode,
            }),
          });

        onSuccess(
          response.user,
        );

        return;
      }

      /* ==============================================================
         SIGNIN
      ============================================================== */

      const signinRole =
        role === "officer"
          ? "officer"
          : "public";

      const response =
        await api.signin({
          email: cleanEmail,
          password,
          role: signinRole,
        });

      if (
        response.user.role !==
        signinRole
      ) {
        api.logout();

        throw new Error(
          `This account does not have ${signinRole} portal access.`,
        );
      }

      onSuccess(
        response.user,
      );
    } catch (
      err: any
    ) {
      console.error(
        "Authentication failed:",
        err,
      );

      setError(
        err?.message ||
          "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">

      {/* ================================================================
          MODAL
      ================================================================ */}

      <div className="flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ==============================================================
            HEADER
        ============================================================== */}

        <div className="shrink-0 bg-gradient-to-r from-[#071d35] to-[#1261d8] px-7 py-5 text-white">

          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close"
            className="float-right flex h-8 w-8 items-center justify-center rounded-full text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>

          <div className="text-sm font-medium text-blue-200">
            GeoVista • 3D ULPIN Platform
          </div>

          <h2 className="mt-1 text-[27px] font-bold leading-tight">
            {mode === "signin"
              ? "Welcome Back"
              : "Create Account"}
          </h2>

          <p className="mt-1 text-sm text-blue-100">
            {portalTitle}
          </p>

        </div>

        {/* ==============================================================
            BODY
        ============================================================== */}

        <div className="overflow-y-auto">

          <form
            onSubmit={
              handleSubmit
            }
            className="px-7 py-6"
          >

            {/* ==========================================================
                FULL NAME
            ========================================================== */}

            {mode === "signup" && (
              <div className="mb-4">

                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(
                    event,
                  ) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />

              </div>
            )}

            {/* ==========================================================
                EMAIL
            ========================================================== */}

            <div className="mb-4">

              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder={
                  role === "officer"
                    ? "name@department.gov.in"
                    : "you@example.com"
                }
                autoComplete="email"
                className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />

              {role ===
                "officer" && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Official Officer accounts
                  require{" "}
                  <span className="font-semibold text-blue-600">
                    @gov.in
                  </span>{" "}
                  or{" "}
                  <span className="font-semibold text-blue-600">
                    @nic.in
                  </span>{" "}
                  email.
                </p>
              )}

            </div>

            {/* ==========================================================
                PASSWORD
            ========================================================== */}

            <div className="mb-4">

              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="Enter your password"
                autoComplete={
                  mode === "signin"
                    ? "current-password"
                    : "new-password"
                }
                className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />

              {mode ===
                "signup" && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Minimum 8 characters.
                </p>
              )}

            </div>

            {/* ==========================================================
                OFFICER AUTHORIZATION
            ========================================================== */}

            {mode === "signup" &&
              role === "officer" && (
                <div className="mb-4">

                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Officer Authorization Code
                  </label>

                  <input
                    type="password"
                    value={
                      officerCode
                    }
                    onChange={(
                      event,
                    ) =>
                      setOfficerCode(
                        event.target.value,
                      )
                    }
                    placeholder="Enter authorization code"
                    autoComplete="off"
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Required for authorized
                    government Officer registration.
                  </p>

                </div>
              )}

            {/* ==========================================================
                OFFICER INFO
            ========================================================== */}

            {role ===
              "officer" && (
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">

                <p className="font-semibold">
                  Officer Portal
                </p>

                <p className="mt-1">
                  Restricted to authorized
                  government personnel.
                </p>

              </div>
            )}

            {/* ==========================================================
                DEMO OFFICER
            ========================================================== */}

            {mode === "signin" &&
              role === "officer" && (
                <div className="mb-4">

                  <div className="relative my-4 flex items-center">
                    <div className="h-px flex-1 bg-slate-200" />

                    <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      SIH Evaluation
                    </span>

                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleDemoOfficerLogin
                    }
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      🎯
                    </span>

                    <span>
                      {loading
                        ? "Opening Demo..."
                        : "Try Demo Officer"}
                    </span>
                  </button>

                  <p className="mt-2 text-center text-[11px] text-slate-500">
                    No registration required for
                    SIH evaluation.
                  </p>

                </div>
              )}

            {/* ==========================================================
                ERROR
            ========================================================== */}

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                {error}
              </div>
            )}

            {/* ==========================================================
                SUBMIT
            ========================================================== */}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-blue-600 px-5 font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign In →"
                  : "Create Account →"}
            </button>

            {/* ==========================================================
                MODE SWITCH
            ========================================================== */}

            <div className="mt-5 pb-1 text-center text-sm text-slate-500">

              {mode ===
              "signin" ? (
                <>
                  Don't have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchMode(
                        "signup",
                      )
                    }
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      switchMode(
                        "signin",
                      )
                    }
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Sign In
                  </button>
                </>
              )}

            </div>

          </form>

        </div>

      </div>

    </div>
  );
};

/* ==========================================================================
   APP ROOT
========================================================================== */

export const App: React.FC =
  () => {
    return (
      <GeoVistaProvider>
        <AppContent />
      </GeoVistaProvider>
    );
  };

export default App;