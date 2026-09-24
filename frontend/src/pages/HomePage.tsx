import React from "react";

import {
  ArrowRight,
  Play,
  UserRound,
  Landmark,
  Box,
  MapPin,
  Layers,
  FileText,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  Users,
  Building2,
  Activity,
  Gavel,
  Instagram,
  Linkedin,
  Youtube,
  MapPinned,
} from "lucide-react";

/* ==========================================================================
   TYPES
========================================================================== */

interface HomePageProps {
  onPublic: () => void;
  onOfficer: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

/* ==========================================================================
   HERO FEATURES
========================================================================== */

const heroFeatures = [
  {
    label: "3D Cadastral Mapping",
    icon: Box,
  },
  {
    label: "ULPIN-based Identification",
    icon: MapPin,
  },
  {
    label: "AI-powered Validation",
    icon: Layers,
  },
  {
    label: "Evidence & Audit Trail",
    icon: FileText,
  },
  {
    label: "Land Governance Analytics",
    icon: BarChart3,
  },
];

/* ==========================================================================
   KEY FEATURES
========================================================================== */

const features = [
  {
    icon: Box,
    title: "3D Visualization",
    description:
      "Interactive 3D cadastral maps with building models",
  },
  {
    icon: MapPin,
    title: "ULPIN Integration",
    description:
      "Unique property identification and detailed information",
  },
  {
    icon: Layers,
    title: "AI-Assisted Validation",
    description:
      "Automated spatial and regulatory checks",
  },
  {
    icon: FileText,
    title: "Evidence Management",
    description:
      "Store and track documents and imagery",
  },
  {
    icon: ShieldCheck,
    title: "Transparency & Audit",
    description:
      "Complete audit trail for trust and accountability",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description:
      "Generate insights for better decision making",
  },
];

/* ==========================================================================
   USE CASES
========================================================================== */

const useCases = [
  {
    title: "Citizens",
    subtitle: "Property Information",
    icon: Users,
    image: "/assets/usecase-citizens.jpg",
  },
  {
    title: "Government Departments",
    subtitle: "Land Administration",
    icon: Landmark,
    image: "/assets/usecase-government.jpg",
  },
  {
    title: "Urban Planning",
    subtitle: "Smart City Development",
    icon: Building2,
    image: "/assets/usecase-urban-planning.jpg",
  },
  {
    title: "Disaster Management",
    subtitle: "Risk Assessment",
    icon: Activity,
    image: "/assets/usecase-disaster-management.jpg",
  },
  {
    title: "Infrastructure Projects",
    subtitle: "Project Planning",
    icon: MapPinned,
    image: "/assets/usecase-infrastructure.jpg",
  },
  {
    title: "Policy Making",
    subtitle: "Data-Driven Decisions",
    icon: Gavel,
    image: "/assets/usecase-policy-making.jpg",
  },
];

/* ==========================================================================
   HOMEPAGE
========================================================================== */

export const HomePage: React.FC<HomePageProps> = ({
  onPublic,
  onOfficer,
  onSignIn,
  onSignUp,
}) => {
  return (
    <div className="min-h-screen bg-white text-[#071d35]">

      {/* =========================================================
          HERO
      ========================================================= */}

      <section
        id="home"
        className="relative min-h-[570px] overflow-hidden bg-[#031b33]"
      >
        {/* BACKGROUND IMAGE */}

        <div className="absolute inset-0">
          <img
            src="/assets/hero-background.jpg"
            alt="GeoVista 3D city visualization"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#031b33]/95 via-[#031b33]/78 to-[#031b33]/25" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#031b33]/75 via-transparent to-transparent" />
        </div>

        {/* HERO CONTENT */}

        <div className="relative mx-auto max-w-[1450px] px-6 py-16 lg:px-12 lg:py-20">

          <div className="max-w-[620px] text-white">

            {/* BADGE */}

            <div className="mb-5 inline-flex items-center rounded-full border border-blue-300/20 bg-[#0b4c79]/70 px-5 py-2 text-sm font-medium backdrop-blur-md">
              A Smart, Transparent and Digital Land Governance Platform
            </div>

            {/* TITLE */}

            <h1 className="text-[58px] font-black leading-none tracking-tight sm:text-[68px] lg:text-[76px]">
              Geo
              <span className="text-blue-500">
                Vista
              </span>
            </h1>

            {/* SUBTITLE */}

            <h2 className="mt-4 text-[27px] font-bold leading-tight sm:text-[32px] lg:text-[35px]">
              3D Spatial Intelligence for
              <br />
              Smarter Land Governance
            </h2>

            {/* DESCRIPTION */}

            <p className="mt-5 max-w-[570px] text-[16px] leading-relaxed text-slate-200 sm:text-lg">
              A unified 3D cadastral platform for property visualization,
              ULPIN-based identification, spatial validation and
              evidence-driven land administration.
            </p>

            {/* HERO BUTTONS */}

            <div className="mt-7 flex flex-wrap gap-5">

              <button
                type="button"
                onClick={onSignIn}
                className="flex items-center gap-3 rounded-xl bg-blue-600 px-7 py-4 font-bold text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500"
              >
                <UserRound className="h-5 w-5" />

                Get Started

                <ArrowRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                className="flex items-center gap-3 rounded-xl border-2 border-white/80 px-7 py-4 font-bold text-white transition hover:bg-white hover:text-slate-900"
              >
                <Play className="h-5 w-5 fill-current" />

                Watch Video
              </button>

            </div>

          </div>

          {/* =======================================================
              ULPIN CARD
          ======================================================= */}

          <div className="absolute right-8 top-24 hidden xl:block 2xl:right-16">

            <div className="w-[310px] rounded-2xl border border-white/40 bg-slate-900/70 p-5 text-white shadow-2xl backdrop-blur-xl">

              <div className="flex gap-4">

                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-700/80">
                  <img
                    src="/assets/ulpin-card-building.png"
                    alt="ULPIN property building"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div>

                  <p className="text-lg font-bold">
                    ULPIN
                  </p>

                  <p className="text-sm font-semibold">
                    UP-14-27-003-01234
                  </p>

                  <div className="mt-4 space-y-1 text-xs text-slate-200">

                    <p>
                      Property Type&nbsp;&nbsp;
                      <span className="text-white">
                        Residential
                      </span>
                    </p>

                    <p>
                      Area&nbsp;&nbsp;
                      <span className="text-white">
                        320 m²
                      </span>
                    </p>

                    <p>
                      Floors&nbsp;&nbsp;
                      <span className="text-white">
                        G + 4
                      </span>
                    </p>

                  </div>

                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* =======================================================
              HERO FEATURE STRIP
          ======================================================= */}

          <div className="mt-14 grid grid-cols-2 gap-5 text-white md:grid-cols-3 lg:grid-cols-5">

            {heroFeatures.map(
              ({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3"
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                    <Icon className="h-4 w-4" />
                  </div>

                  <span className="text-xs font-semibold sm:text-sm">
                    {label}
                  </span>

                </div>
              ),
            )}

          </div>

        </div>

      </section>

      {/* =========================================================
          PORTALS
      ========================================================= */}

      <section className="mx-auto max-w-[1400px] px-6 py-5 lg:py-7">

        <div className="grid gap-5 lg:grid-cols-2">

          {/* =======================================================
              PUBLIC PORTAL
          ======================================================= */}

          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-sm sm:p-5">

            <div className="flex gap-5">

              {/* IMAGE */}

              <div className="hidden h-[138px] w-[185px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 sm:flex">

                <div className="relative h-full w-full">

                  <img
                    src="/assets/public-portal-banner.jpg"
                    alt="Public portal"
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-emerald-900/25" />

                  <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 p-2">
                    <Users className="h-7 w-7 text-emerald-600" />
                  </div>

                </div>

              </div>

              {/* CONTENT */}

              <div className="flex-1">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <h2 className="text-2xl font-bold text-[#10284b]">
                    Public Portal
                  </h2>

                </div>

                <p className="mt-3 max-w-[480px] text-sm leading-relaxed text-slate-600">
                  Access property information, search parcels,
                  explore 3D maps and view permitted public records.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={onPublic}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <UserRound className="h-4 w-4" />

                    Sign In

                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onSignUp}
                    className="rounded-lg border border-emerald-500 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Create Account
                  </button>

                </div>

              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
              <span>✓ Search Properties</span>
              <span>✓ 3D Map Visualization</span>
              <span>✓ View Public Records</span>
              <span>✓ Track Applications</span>
            </div>

          </div>

          {/* =======================================================
              OFFICER PORTAL
          ======================================================= */}

          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm sm:p-5">

            <div className="flex gap-5">

              {/* IMAGE */}

              <div className="hidden h-[138px] w-[185px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-100 sm:flex">

                <div className="relative h-full w-full">

                  <img
                    src="/assets/officer-portal-banner.jpg"
                    alt="Officer portal"
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-blue-900/30" />

                  <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 p-2">
                    <Landmark className="h-7 w-7 text-blue-600" />
                  </div>

                </div>

              </div>

              {/* CONTENT */}

              <div className="flex-1">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                    <Landmark className="h-5 w-5" />
                  </div>

                  <h2 className="text-2xl font-bold text-[#10284b]">
                    Officer Portal
                  </h2>

                </div>

                <p className="mt-3 max-w-[480px] text-sm leading-relaxed text-slate-600">
                  Property verification, parcel validation,
                  evidence management, spatial analysis and audit reports.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={onOfficer}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <UserRound className="h-4 w-4" />

                    Sign In

                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onSignUp}
                    className="rounded-lg border border-blue-500 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                  >
                    Create Account
                  </button>

                </div>

              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
              <span>✓ Verify & Validate</span>
              <span>✓ Manage Parcels</span>
              <span>✓ View LiDAR Data</span>
              <span>✓ Generate Reports</span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          KEY FEATURES
      ========================================================= */}

      <section
        id="features"
        className="mx-auto max-w-[1400px] px-6 py-8 lg:py-10"
      >

        <div className="mb-9 text-center">

          <h2 className="text-3xl font-black text-[#071d35]">
            Key Features
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Integrated geospatial intelligence for efficient land governance.
          </p>

        </div>

        <div className="grid grid-cols-2 gap-y-8 md:grid-cols-3 lg:grid-cols-6">

          {features.map(
            ({
              icon: Icon,
              title,
              description,
            }, index) => (
              <div
                key={title}
                className={`px-5 text-center ${
                  index !== features.length - 1
                    ? "lg:border-r lg:border-slate-100"
                    : ""
                }`}
              >

                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>

                <h3 className="text-sm font-bold text-[#071d35]">
                  {title}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {description}
                </p>

              </div>
            ),
          )}

        </div>

      </section>

      {/* =========================================================
          USE CASES
      ========================================================= */}

      <section
        id="use-cases"
        className="mx-auto max-w-[1400px] px-6 pb-14 pt-6"
      >

        <div className="mb-7 text-center">

          <h2 className="text-3xl font-black text-[#071d35]">
            Use Cases
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Enabling multiple stakeholders for a smarter and more transparent
            land ecosystem.
          </p>

        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">

          {useCases.map(
            ({
              title,
              subtitle,
              icon: Icon,
              image,
            }) => (
              <div
                key={title}
                className="group relative h-[120px] overflow-hidden rounded-xl shadow-md"
              >

                <img
                  src={image}
                  alt={title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#031b33]/95 via-[#031b33]/45 to-transparent" />

                <div className="relative flex h-full flex-col justify-end p-4 text-white">

                  <div className="mb-auto">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                      <Icon className="h-4 w-4 text-white" />
                    </div>

                  </div>

                  <h3 className="text-sm font-bold leading-tight">
                    {title}
                  </h3>

                  <p className="mt-1 text-[10px] text-slate-200">
                    {subtitle}
                  </p>

                </div>

              </div>
            ),
          )}

        </div>

      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer
        id="contact"
        className="bg-[#031b33] text-white"
      >

        {/* MAIN FOOTER */}
        <div className="mx-auto max-w-[1450px] px-6 py-4 lg:px-12">

          <div className="grid items-start gap-5 lg:grid-cols-[1.55fr_0.8fr_0.8fr_1.15fr_0.8fr]">

            {/* =====================================================
                SURVEY OF INDIA / GOVERNMENT
            ===================================================== */}

            <div className="min-w-0">
              <div className="flex items-center gap-3">

                <div className="flex h-[82px] w-[92px] shrink-0 items-center justify-center">
                  <img
                    src="/assets/survey-of-india-emblem.png"
                    alt="Survey of India emblem"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0 leading-tight">
                  <p className="text-[15px] font-semibold text-white">
                    भारतीय सर्वेक्षण विभाग
                  </p>

                  <p className="mt-0.5 text-[18px] font-bold tracking-tight text-white">
                    Survey of India
                  </p>

                  <p className="mt-1 text-[10px] text-slate-300">
                    Ministry of Science &amp; Technology
                  </p>

                  <p className="text-[10px] text-slate-300">
                    Government of India
                  </p>
                </div>

              </div>
            </div>

            {/* =====================================================
                ABOUT
            ===================================================== */}

            <div>
              <h3 className="mb-2 text-[13px] font-bold tracking-wide text-white">
                About
              </h3>

              <div className="space-y-1 text-[10px] leading-4 text-slate-300">
                <a
                  href="#home"
                  className="block transition-colors hover:text-white"
                >
                  About GeoVista
                </a>

                <a
                  href="#contact"
                  className="block transition-colors hover:text-white"
                >
                  Ministry of Science &amp; Technology
                </a>

                <a
                  href="#contact"
                  className="block transition-colors hover:text-white"
                >
                  Survey of India
                </a>

                <a
                  href="#"
                  className="block transition-colors hover:text-white"
                >
                  Terms of Use
                </a>

                <a
                  href="#"
                  className="block transition-colors hover:text-white"
                >
                  Privacy Policy
                </a>

                <a
                  href="#"
                  className="block transition-colors hover:text-white"
                >
                  Accessibility
                </a>
              </div>
            </div>

            {/* =====================================================
                QUICK LINKS
            ===================================================== */}

            <div>
              <h3 className="mb-2 text-[13px] font-bold tracking-wide text-white">
                Quick Links
              </h3>

              <div className="space-y-1 text-[10px] leading-4 text-slate-300">
                <button
                  type="button"
                  onClick={onPublic}
                  className="block transition-colors hover:text-white"
                >
                  Public Portal
                </button>

                <button
                  type="button"
                  onClick={onOfficer}
                  className="block transition-colors hover:text-white"
                >
                  Officer Portal
                </button>

                <a
                  href="#contact"
                  className="block transition-colors hover:text-white"
                >
                  Contact Us
                </a>

                <a
                  href="#"
                  className="block transition-colors hover:text-white"
                >
                  Help &amp; Support
                </a>

                <a
                  href="#"
                  className="block transition-colors hover:text-white"
                >
                  FAQs
                </a>

                <a
                  href="#"
                  className="block transition-colors hover:text-white"
                >
                  Sitemap
                </a>
              </div>
            </div>

            {/* =====================================================
                CONNECT WITH US
            ===================================================== */}

            <div className="min-w-0">
              <h3 className="mb-2 text-[13px] font-bold tracking-wide text-white">
                Connect With Us
              </h3>

              <div className="mb-3 flex items-center gap-2">

                {/* X */}
                <a
                  href="https://x.com/india_soi"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Survey of India on X"
                  title="Survey of India - X"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] text-[11px] font-bold text-white transition-all hover:border-white/40 hover:bg-white/10"
                >
                  X
                </a>

                {/* LINKEDIN */}
                <a
                  href="https://www.linkedin.com/company/surveyofindia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Survey of India on LinkedIn"
                  title="Survey of India - LinkedIn"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] text-white transition-all hover:border-white/40 hover:bg-white/10"
                >
                  <Linkedin className="h-4 w-4" />
                </a>

                {/* YOUTUBE */}
                <a
                  href="https://www.youtube.com/@surveyofindia1767"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Survey of India on YouTube"
                  title="Survey of India - YouTube"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] text-white transition-all hover:border-white/40 hover:bg-white/10"
                >
                  <Youtube className="h-4 w-4" />
                </a>

                {/* INSTAGRAM */}
                <a
                  href="https://www.instagram.com/surveyofindia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Survey of India on Instagram"
                  title="Survey of India - Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] text-white transition-all hover:border-white/40 hover:bg-white/10"
                >
                  <Instagram className="h-4 w-4" />
                </a>

              </div>

              <div className="flex max-w-[310px] items-start gap-2 text-[10px] leading-4 text-slate-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-200" />

                <span>
                  Survey of India, Hathibarkala Estate
                  <br />
                  Dehradun - 248001, Uttarakhand, India
                </span>
              </div>
            </div>

            {/* =====================================================
                AZADI KA AMRIT MAHOTSAV
            ===================================================== */}

            <div className="flex items-start justify-start lg:justify-end">
              <div className="flex h-[82px] w-[150px] items-center justify-center">
                <img
                  src="/assets/azadi-amrit-mahotsav-75.png"
                  alt="75 Azadi Ka Amrit Mahotsav"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

          </div>
        </div>

        {/* =======================================================
            COPYRIGHT / GOVERNMENT INITIATIVE BAR
        ======================================================= */}

        <div className="border-t border-white/15">

          <div className="mx-auto flex max-w-[1450px] flex-col gap-1 px-6 py-2 text-[10px] leading-4 text-slate-300 md:flex-row md:items-center md:justify-between lg:px-12">

            <span>
              © 2026 GeoVista - 3D ULPIN Platform. All rights reserved.
            </span>

            <span className="text-center">
              A Digital Initiative under Ministry of Science &amp; Technology,
              Government of India
            </span>

            <span className="text-right">
              Developed in collaboration with Survey of India
            </span>

          </div>

        </div>

      </footer>

    </div>
  );
};

export default HomePage;