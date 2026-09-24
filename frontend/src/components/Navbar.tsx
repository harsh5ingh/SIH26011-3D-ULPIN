import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  UserRound,
  Landmark,
  MapPin,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Languages,
  Settings,
  CircleHelp,
  LogOut,
  UserCircle2,
  Menu,
  X,
  Home,
  Map,
  ShieldCheck,
} from "lucide-react";

import { AuthUser } from "../services/api";

/* ==========================================================================
   TYPES
========================================================================== */

interface NavbarProps {
  currentView:
    | "home"
    | "public"
    | "officer"
    | "scenarios";

  currentUser: AuthUser | null;

  onHome: () => void;
  onPublic: () => void;
  onOfficer: () => void;

  onPublicSignIn: () => void;
  onPublicSignUp: () => void;

  onOfficerSignIn: () => void;
  onOfficerSignUp: () => void;

  onProfile: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onLogout: () => void;
}

/* ==========================================================================
   DATA
========================================================================== */

const locations = [
  "India",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const languages = [
  "English",
  "हिन्दी",
  "मराठी",
  "বাংলা",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "ગુજરાતી",
  "ਪੰਜਾਬੀ",
];

/* ==========================================================================
   COMPONENT
========================================================================== */

export const Navbar: React.FC<
  NavbarProps
> = ({
  currentView,
  currentUser,

  onHome,
  onPublic,
  onOfficer,

  onPublicSignIn,
  onPublicSignUp,

  onOfficerSignIn,
  onOfficerSignUp,

  onProfile,
  onSettings,
  onHelp,
  onLogout,
}) => {
  const [locationOpen, setLocationOpen] =
    useState(false);

  const [themeOpen, setThemeOpen] =
    useState(false);

  const [languageOpen, setLanguageOpen] =
    useState(false);

  const [publicOpen, setPublicOpen] =
    useState(false);

  const [officerOpen, setOfficerOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [selectedLocation, setSelectedLocation] =
    useState("India");

  const [selectedLanguage, setSelectedLanguage] =
    useState("English");

  const [selectedTheme, setSelectedTheme] =
    useState<
      "dark" | "system" | "light"
    >("system");

  const navbarRef =
    useRef<HTMLDivElement>(null);

  /* ==========================================================================
     CLOSE ALL MENUS
  ========================================================================== */

  const closeAllMenus = () => {
    setLocationOpen(false);
    setThemeOpen(false);
    setLanguageOpen(false);
    setPublicOpen(false);
    setOfficerOpen(false);
    setProfileOpen(false);
  };

  /* ==========================================================================
     OUTSIDE CLICK
  ========================================================================== */

  useEffect(() => {
    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(
          event.target as Node,
        )
      ) {
        closeAllMenus();
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  /* ==========================================================================
     APPLY THEME
  ========================================================================== */

  useEffect(() => {
    const root =
      document.documentElement;

    root.classList.remove("dark");

    if (
      selectedTheme === "dark"
    ) {
      root.classList.add("dark");
      return;
    }

    if (
      selectedTheme === "system"
    ) {
      const prefersDark =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;

      if (prefersDark) {
        root.classList.add("dark");
      }
    }
  }, [selectedTheme]);

  /* ==========================================================================
     MOBILE
  ========================================================================== */

  const closeMobile = () => {
    setMobileOpen(false);
  };

  /* ==========================================================================
     LOCATION
  ========================================================================== */

  const handleLocationChange = (
    location: string,
  ) => {
    setSelectedLocation(
      location,
    );

    closeAllMenus();
  };

  /* ==========================================================================
     LANGUAGE
  ========================================================================== */

  const handleLanguageChange = (
    language: string,
  ) => {
    setSelectedLanguage(
      language,
    );

    closeAllMenus();
  };

  /* ==========================================================================
     THEME
  ========================================================================== */

  const handleThemeChange = (
    theme:
      | "dark"
      | "system"
      | "light",
  ) => {
    setSelectedTheme(theme);
    closeAllMenus();
  };

  /* ==========================================================================
     PUBLIC PORTAL
  ========================================================================== */

  const handlePublicPortal = () => {
    closeAllMenus();
    closeMobile();

    onPublic();
  };

  /* ==========================================================================
     OFFICER PORTAL
  ========================================================================== */

  const handleOfficerPortal = () => {
    closeAllMenus();
    closeMobile();

    onOfficer();
  };

  /* ==========================================================================
     OFFICER DEMO
  ========================================================================== */

  const handleDemoOfficer = () => {
    closeAllMenus();
    closeMobile();

    /*
      App.tsx opens Officer Sign In.
      The AuthModal contains the actual
      Try Demo Officer login action.
    */

    onOfficerSignIn();
  };

  /* ==========================================================================
     NAV ITEM
  ========================================================================== */

  const navItemClass = (
    active = false,
  ) =>
    [
      "relative",
      "flex",
      "h-full",
      "items-center",
      "px-2",
      "text-[14px]",
      "font-semibold",
      "transition-colors",
      active
        ? "text-blue-600"
        : "text-slate-700 hover:text-blue-600",
    ].join(" ");

  return (
    <header
      ref={navbarRef}
      className="sticky top-0 z-[90] border-b border-slate-200 bg-white/95 shadow-[0_1px_10px_rgba(15,23,42,0.05)] backdrop-blur-xl"
    >

      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">

        {/* ==================================================================
            DESKTOP
        ================================================================== */}

        <div className="hidden h-[74px] items-center lg:flex">

          {/* ================================================================
              LOGO
          ================================================================ */}

          <button
            type="button"
            onClick={onHome}
            className="flex shrink-0 items-center gap-3"
            aria-label="GeoVista Home"
          >

            <div className="relative h-10 w-10">

              <div className="absolute bottom-0 left-1 h-4 w-7 rounded-sm bg-blue-700" />

              <div className="absolute bottom-2 left-1 h-4 w-7 rotate-45 rounded-sm bg-blue-600" />

              <div className="absolute bottom-4 left-1 h-4 w-7 -rotate-45 rounded-sm bg-emerald-500" />

              <div className="absolute left-2 top-0 h-3 w-6 rounded-sm bg-emerald-400" />

            </div>

            <div className="text-left leading-none">

              <div className="text-[24px] font-black tracking-tight text-[#10284b]">
                Geo
                <span className="text-blue-600">
                  Vista
                </span>
              </div>

              <div className="mt-1 text-[8px] font-bold tracking-[0.22em] text-slate-500">
                3D ULPIN PLATFORM
              </div>

            </div>

          </button>

          {/* ================================================================
              MAIN NAV
          ================================================================ */}

          <nav className="ml-10 flex h-full items-center gap-6">

            <button
              type="button"
              onClick={onHome}
              className={navItemClass(
                currentView === "home",
              )}
            >
              Home

              {currentView ===
                "home" && (
                <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-blue-600" />
              )}
            </button>

            <a
              href="#about"
              className={navItemClass()}
            >
              About
            </a>

            <a
              href="#features"
              className={navItemClass()}
            >
              Features
            </a>

            <a
              href="#use-cases"
              className={navItemClass()}
            >
              Use Cases
            </a>

            <a
              href="#contact"
              className={navItemClass()}
            >
              Contact
            </a>

          </nav>

          {/* ================================================================
              RIGHT CONTROLS
          ================================================================ */}

          <div className="ml-auto flex items-center gap-2">

            {/* ============================================================
                LOCATION
            ============================================================ */}

            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  const next =
                    !locationOpen;

                  closeAllMenus();
                  setLocationOpen(
                    next,
                  );
                }}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-slate-50"
              >

                <MapPin className="h-4 w-4 text-blue-600" />

                <span className="max-w-[75px] truncate">
                  {selectedLocation}
                </span>

                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition ${
                    locationOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </button>

              {locationOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Select Region
                  </div>

                  <div className="max-h-80 overflow-y-auto">

                    {locations.map(
                      (location) => (
                        <button
                          key={
                            location
                          }
                          type="button"
                          onClick={() =>
                            handleLocationChange(
                              location,
                            )
                          }
                          className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                            selectedLocation ===
                            location
                              ? "bg-blue-50 font-semibold text-blue-600"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {location}
                        </button>
                      ),
                    )}

                  </div>

                </div>
              )}

            </div>

            {/* ============================================================
                THEME
            ============================================================ */}

            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  const next =
                    !themeOpen;

                  closeAllMenus();
                  setThemeOpen(
                    next,
                  );
                }}
                className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-700 transition hover:border-blue-200 hover:bg-slate-50"
                aria-label="Theme"
              >

                {selectedTheme ===
                "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : selectedTheme ===
                  "light" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}

                <ChevronDown className="h-3 w-3 text-slate-400" />

              </button>

              {themeOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Appearance
                  </div>

                  {[
                    {
                      value:
                        "dark" as const,
                      label:
                        "Dark",
                      icon: Moon,
                    },
                    {
                      value:
                        "system" as const,
                      label:
                        "System",
                      icon: Monitor,
                    },
                    {
                      value:
                        "light" as const,
                      label:
                        "Light",
                      icon: Sun,
                    },
                  ].map(
                    ({
                      value,
                      label,
                      icon: Icon,
                    }) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          handleThemeChange(
                            value,
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                          selectedTheme ===
                          value
                            ? "bg-blue-50 font-semibold text-blue-600"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ),
                  )}

                </div>
              )}

            </div>

            {/* ============================================================
                LANGUAGE
            ============================================================ */}

            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  const next =
                    !languageOpen;

                  closeAllMenus();
                  setLanguageOpen(
                    next,
                  );
                }}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-slate-50"
              >

                <Languages className="h-4 w-4 text-emerald-600" />

                <span>
                  {selectedLanguage ===
                  "English"
                    ? "EN"
                    : selectedLanguage}
                </span>

                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />

              </button>

              {languageOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Regional Language
                  </div>

                  {languages.map(
                    (language) => (
                      <button
                        key={
                          language
                        }
                        type="button"
                        onClick={() =>
                          handleLanguageChange(
                            language,
                          )
                        }
                        className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          selectedLanguage ===
                          language
                            ? "bg-emerald-50 font-semibold text-emerald-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {language}
                      </button>
                    ),
                  )}

                </div>
              )}

            </div>

            {/* ============================================================
                PUBLIC PORTAL
            ============================================================ */}

            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  const next =
                    !publicOpen;

                  closeAllMenus();
                  setPublicOpen(
                    next,
                  );
                }}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
              >

                <UserRound className="h-4 w-4 text-emerald-600" />

                Public

                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition ${
                    publicOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </button>

              {publicOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                  {currentUser?.role ===
                  "public" ? (
                    <>
                      <button
                        type="button"
                        onClick={
                          handlePublicPortal
                        }
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Map className="h-4 w-4 text-emerald-600" />
                        Open Public Portal
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          closeAllMenus();
                          onLogout();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          closeAllMenus();
                          onPublicSignIn();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <UserRound className="h-4 w-4 text-emerald-600" />
                        Sign In
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          closeAllMenus();
                          onPublicSignUp();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <UserCircle2 className="h-4 w-4 text-emerald-600" />
                        Create Account
                      </button>
                    </>
                  )}

                </div>
              )}

            </div>

            {/* ============================================================
                OFFICER PORTAL
            ============================================================ */}

            <div className="relative">

              <button
                type="button"
                onClick={() => {
                  const next =
                    !officerOpen;

                  closeAllMenus();
                  setOfficerOpen(
                    next,
                  );
                }}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
              >

                <Landmark className="h-4 w-4 text-blue-600" />

                Officer

                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition ${
                    officerOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </button>

              {officerOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                  {currentUser?.role ===
                  "officer" ? (
                    <>
                      <button
                        type="button"
                        onClick={
                          handleOfficerPortal
                        }
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        Open Officer Portal
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          closeAllMenus();
                          onLogout();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          closeAllMenus();
                          onOfficerSignIn();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Landmark className="h-4 w-4 text-blue-600" />
                        Sign In
                      </button>

                      {/* ==================================================
                          DEMO OFFICER
                      ================================================== */}

                      <button
                        type="button"
                        onClick={
                          handleDemoOfficer
                        }
                        className="flex w-full items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <span className="flex h-5 w-5 items-center justify-center">
                          🎯
                        </span>

                        <span className="flex flex-col">
                          <span>
                            Try Demo Officer
                          </span>

                          <span className="text-[10px] font-medium text-blue-500">
                            SIH evaluation • No registration
                          </span>
                        </span>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          closeAllMenus();
                          onOfficerSignUp();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <UserCircle2 className="h-4 w-4 text-blue-600" />
                        Create Account
                      </button>
                    </>
                  )}

                </div>
              )}

            </div>

            {/* ============================================================
                PROFILE
            ============================================================ */}

            {currentUser && (
              <div className="relative ml-1">

                <button
                  type="button"
                  onClick={() => {
                    const next =
                      !profileOpen;

                    closeAllMenus();
                    setProfileOpen(
                      next,
                    );
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100"
                  aria-label="Account menu"
                >
                  <UserRound className="h-5 w-5" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[100] w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">

                    <div className="mb-1 border-b border-slate-100 px-3 py-3">

                      <p className="truncate text-sm font-bold text-slate-800">
                        {currentUser.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {currentUser.email}
                      </p>

                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-600">
                        {currentUser.role}
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        onProfile();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserCircle2 className="h-4 w-4 text-slate-500" />
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        onSettings();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        onHelp();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <CircleHelp className="h-4 w-4 text-slate-500" />
                      Help & Support
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        onLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

        {/* ==================================================================
            MOBILE NAVBAR
        ================================================================== */}

        <div className="flex h-[68px] items-center justify-between lg:hidden">

          {/* MOBILE LOGO */}

          <button
            type="button"
            onClick={() => {
              onHome();
              closeMobile();
            }}
            className="flex items-center gap-2.5"
          >

            <div className="relative h-9 w-9">

              <div className="absolute bottom-0 left-1 h-3.5 w-6 rounded-sm bg-blue-700" />

              <div className="absolute bottom-1.5 left-1 h-3.5 w-6 rotate-45 rounded-sm bg-blue-600" />

              <div className="absolute bottom-3 left-1 h-3.5 w-6 -rotate-45 rounded-sm bg-emerald-500" />

              <div className="absolute left-1.5 top-0 h-2.5 w-5 rounded-sm bg-emerald-400" />

            </div>

            <div className="text-left leading-none">

              <div className="text-[21px] font-black tracking-tight text-[#10284b]">
                Geo
                <span className="text-blue-600">
                  Vista
                </span>
              </div>

              <div className="mt-1 text-[7px] font-bold tracking-[0.2em] text-slate-500">
                3D ULPIN PLATFORM
              </div>

            </div>

          </button>

          {/* MOBILE ACTIONS */}

          <div className="flex items-center gap-2">

            {currentUser && (
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    !profileOpen,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-100 bg-blue-50 text-blue-600"
              >
                <UserRound className="h-5 w-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  !mobileOpen,
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

          </div>

        </div>

        {/* ==================================================================
            MOBILE MENU
        ================================================================== */}

        {mobileOpen && (
          <div className="border-t border-slate-100 py-4 lg:hidden">

            <div className="space-y-1">

              <button
                type="button"
                onClick={() => {
                  onHome();
                  closeMobile();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold ${
                  currentView ===
                  "home"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-700"
                }`}
              >
                <Home className="h-4 w-4" />
                Home
              </button>

              <a
                href="#about"
                onClick={
                  closeMobile
                }
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700"
              >
                <Map className="h-4 w-4" />
                About
              </a>

              <a
                href="#features"
                onClick={
                  closeMobile
                }
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700"
              >
                <Map className="h-4 w-4" />
                Features
              </a>

              <a
                href="#use-cases"
                onClick={
                  closeMobile
                }
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700"
              >
                <MapPin className="h-4 w-4" />
                Use Cases
              </a>

              <a
                href="#contact"
                onClick={
                  closeMobile
                }
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700"
              >
                <CircleHelp className="h-4 w-4" />
                Contact
              </a>

            </div>

            <div className="my-3 border-t border-slate-100" />

            {/* ==============================================================
                PUBLIC
            ============================================================== */}

            <div className="space-y-1">

              <button
                type="button"
                onClick={
                  handlePublicPortal
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50"
              >
                <UserRound className="h-4 w-4 text-emerald-600" />

                {currentUser?.role ===
                "public"
                  ? "Open Public Portal"
                  : "Public Portal"}
              </button>

              {!currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    onPublicSignUp();
                  }}
                  className="ml-7 flex w-[calc(100%-1.75rem)] items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700"
                >
                  Create Public Account
                </button>
              )}

            </div>

            {/* ==============================================================
                OFFICER
            ============================================================== */}

            <div className="mt-1 space-y-1">

              <button
                type="button"
                onClick={
                  handleOfficerPortal
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50"
              >
                <Landmark className="h-4 w-4 text-blue-600" />

                {currentUser?.role ===
                "officer"
                  ? "Open Officer Portal"
                  : "Officer Portal"}
              </button>

              {!currentUser && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      onOfficerSignIn();
                    }}
                    className="ml-7 flex w-[calc(100%-1.75rem)] items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-blue-700"
                  >
                    Sign In
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDemoOfficer
                    }
                    className="ml-7 flex w-[calc(100%-1.75rem)] items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-left text-xs font-bold text-blue-700"
                  >
                    🎯
                    <span>
                      Try Demo Officer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeMobile();
                      onOfficerSignUp();
                    }}
                    className="ml-7 flex w-[calc(100%-1.75rem)] items-center rounded-lg px-3 py-2 text-left text-xs font-semibold text-blue-700"
                  >
                    Create Officer Account
                  </button>
                </>
              )}

            </div>

            {/* ==============================================================
                MOBILE SETTINGS
            ============================================================== */}

            <div className="mt-3 border-t border-slate-100 pt-3">

              <div className="grid grid-cols-3 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    handleThemeChange(
                      "system",
                    )
                  }
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-[10px] font-semibold text-slate-600"
                >
                  <Monitor className="h-4 w-4" />
                  System
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleLocationChange(
                      "India",
                    )
                  }
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-[10px] font-semibold text-slate-600"
                >
                  <MapPin className="h-4 w-4" />
                  India
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleLanguageChange(
                      "English",
                    )
                  }
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-[10px] font-semibold text-slate-600"
                >
                  <Languages className="h-4 w-4" />
                  English
                </button>

              </div>

            </div>

          </div>
        )}

      </div>

    </header>
  );
};

export default Navbar;