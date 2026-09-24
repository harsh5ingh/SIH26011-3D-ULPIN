import React, { useState } from "react";
import { useGeoVista } from "../context/GeoVistaContext";
import { Map2D } from "../components/Map2D";
import { Viewer3D } from "../components/Viewer3D";
import { EvidenceList } from "../components/EvidenceList";
import { ConfidenceMeter } from "../components/ConfidenceMeter";
import { ValidationBadge } from "../components/ValidationBadge";
import { IssueReportModal } from "../components/IssueReportModal";
import { GuidedAssistant } from "../components/GuidedAssistant";

import {
  Search,
  MapPin,
  Building2,
  Flag,
  AlertCircle,
  Info,
  Trees,
  Layers,
  ShieldCheck,
  Database,
  Activity,
  ChevronRight,
} from "lucide-react";

export const PublicPortal: React.FC = () => {
  const {
    parcels,
    selectedParcel,
    selectedBuilding,
    selectedProperty,
    evidence,
    confidence,
    validation,
    candidates,
    underground,
    elevated,
    selectParcelById,
    searchCadastre,
    loading,
  } = useGeoVista();

  const [searchQuery, setSearchQuery] = useState("P001");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) return;

    await searchCadastre(query);
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc]">

      {/* =========================================================
          PORTAL HEADER
      ========================================================= */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1450px] px-5 py-5 lg:px-8">

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
                <Database className="h-4 w-4" />
                Public Property Discovery
              </div>

              <h1 className="mt-1 text-2xl font-black text-[#071d35]">
                3D Cadastral Property Portal
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Search parcels, explore 3D property volumes and review
                available spatial evidence.
              </p>
            </div>

            <div className="flex items-center gap-3">

              <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:block">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  Spatial Data System
                </div>

                <div className="mt-1 text-sm font-bold text-slate-800">
                  Operational
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Public Access
                </div>

                <div className="mt-1 text-sm font-bold text-emerald-800">
                  Read Only
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      <main className="mx-auto max-w-[1450px] space-y-5 px-5 py-5 lg:px-8">

        {/* =======================================================
            INFORMATION BANNER
        ======================================================= */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">

          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />

          <p className="leading-relaxed">
            <strong>Public Property Discovery Portal:</strong>{" "}
            Displays proposed 3D volumetric cadastre identifiers,
            multi-sensor spatial evidence and technical confidence
            for citizen transparency. This system generates prototype
            spatial candidates and does not certify legal land titles.
          </p>
        </div>

        {/* =======================================================
            SEARCH
        ======================================================= */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="mb-3 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />

            <div>
              <h2 className="text-sm font-bold text-[#071d35]">
                Search Cadastral Records
              </h2>

              <p className="text-xs text-slate-500">
                Search using parcel code, 3D identifier, locality or building.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">

              <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400" />

              <input
                type="text"
                placeholder="Search P001, P002, 3D ID, locality or building..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" />

              {loading ? "Searching..." : "Search Cadastre"}

              {!loading && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </form>

          {/* SAMPLE PARCELS */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">

            <span className="shrink-0 text-xs font-semibold text-slate-400">
              Sample Parcels:
            </span>

            {parcels.map((parcel) => (
              <button
                key={parcel.id}
                type="button"
                onClick={() => selectParcelById(parcel.id)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedParcel?.id === parcel.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {parcel.parcel_code}
                {" · "}
                {parcel.locality}
              </button>
            ))}
          </div>
        </section>

        {/* =======================================================
            MAIN GRID
        ======================================================= */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

          {/* =====================================================
              LEFT: MAP / 3D VIEW
          ===================================================== */}
          <div className="space-y-5 lg:col-span-8">

            {/* 3D VIEWER HEADER */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <Layers className="h-5 w-5 text-blue-600" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#071d35]">
                      3D Volumetric Cadastre
                    </h2>

                    <p className="text-xs text-slate-500">
                      Interactive property and vertical spatial view
                    </p>
                  </div>
                </div>

                <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 sm:block">
                  3D VIEW
                </span>
              </div>

              <Viewer3D />
            </div>

            {/* 2D MAP */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-[#071d35]">
                      2D Cadastral Footprint
                    </h2>

                    <p className="text-xs text-slate-500">
                      Parcel and building footprint reference
                    </p>
                  </div>
                </div>

                <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700 sm:block">
                  2D CADASTRE
                </span>
              </div>

              <Map2D
                parcel={selectedParcel}
                building={selectedBuilding}
                selectedUnit={selectedProperty}
              />
            </div>
          </div>

          {/* =====================================================
              RIGHT: INSPECTOR
          ===================================================== */}
          <div className="space-y-5 lg:col-span-4">

            {/* ===================================================
                PROPERTY SELECTED
            =================================================== */}
            {selectedProperty ? (
              <>
                {/* REVIEW ALERT */}
                {selectedProperty.verification_status ===
                  "UNDER_REVIEW" && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">

                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                    <p className="leading-relaxed">
                      <strong>Under Official Review:</strong>{" "}
                      This property is currently under official review.
                      Some spatial values may be updated after survey
                      verification.
                    </p>
                  </div>
                )}

                {/* PROPERTY CARD */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <span className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-blue-900">
                        <ShieldCheck className="h-3 w-3" />
                        Proposed 3D Spatial Identifier
                      </span>

                      <h2 className="mt-2 break-all font-mono text-sm font-bold text-slate-900">
                        {selectedProperty.proposed_3d_id}
                      </h2>
                    </div>

                    <ValidationBadge
                      status={selectedProperty.verification_status}
                      size="sm"
                    />
                  </div>

                  {/* DETAILS */}
                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-slate-100 py-4">

                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Floor Level
                      </span>

                      <span className="mt-1 block text-sm font-bold text-slate-800">
                        Floor {selectedProperty.floor_number}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Unit Number
                      </span>

                      <span className="mt-1 block text-sm font-bold text-slate-800">
                        {selectedProperty.unit_number}
                      </span>

                      <span className="text-[10px] text-slate-500">
                        {selectedProperty.unit_type}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Vertical Elevation
                      </span>

                      <span className="mt-1 block font-mono text-sm font-bold text-slate-800">
                        {selectedProperty.z_min_m}m –{" "}
                        {selectedProperty.z_max_m}m
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Footprint Area
                      </span>

                      <span className="mt-1 block text-sm font-bold text-slate-800">
                        {selectedProperty.area_sqm.toFixed(1)} m²
                      </span>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="flex items-center justify-between gap-3 pt-4">

                    <span className="text-xs text-slate-500">
                      Revision Version:{" "}
                      <strong className="text-slate-800">
                        v{selectedProperty.revision_number}
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setIsReportModalOpen(true)
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Report Issue
                    </button>
                  </div>
                </div>

                {/* CONFIDENCE */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <ConfidenceMeter confidence={confidence} />
                </div>

                {/* EVIDENCE */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <EvidenceList evidences={evidence} />
                </div>
              </>
            ) : selectedParcel ? (
              /* =================================================
                 PARCEL INSPECTOR
              ================================================= */
              <div className="space-y-5">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-900">
                        {selectedParcel.area_type} Cadastral Parcel
                      </span>

                      <h2 className="mt-2 font-mono text-sm font-bold text-slate-900">
                        {selectedParcel.parcel_code}
                      </h2>

                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedParcel.locality}
                      </p>
                    </div>

                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                      {selectedParcel.land_use}
                    </span>
                  </div>

                  {/* PARCEL DETAILS */}
                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-slate-100 py-4">

                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        District / State
                      </span>

                      <span className="mt-1 block text-sm font-semibold text-slate-800">
                        {selectedParcel.district},{" "}
                        {selectedParcel.state}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Surface Area
                      </span>

                      <span className="mt-1 block text-sm font-semibold text-slate-800">
                        {selectedParcel.area_sqm.toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 1,
                          },
                        )}{" "}
                        m²
                      </span>
                    </div>

                    {/* STRUCTURE CANDIDATE */}
                    {candidates.length > 0 && (
                      <div className="col-span-2 rounded-xl border border-amber-100 bg-amber-50 p-3">

                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-amber-700" />

                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Detected Structure Candidate
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-bold text-amber-900">
                          {candidates.length} Candidate
                        </p>

                        <p className="mt-1 text-xs text-amber-800">
                          {candidates[0].permanence_classification}
                          {" · "}
                          Estimated Height:{" "}
                          {candidates[0].estimated_height_m}m
                        </p>
                      </div>
                    )}

                    {/* ELEVATED */}
                    {elevated.length > 0 && (
                      <div className="col-span-2 rounded-xl border border-sky-100 bg-sky-50 p-3">

                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-sky-700" />

                          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                            Elevated Transit Infrastructure
                          </span>
                        </div>

                        <p className="mt-1 text-sm font-bold text-sky-900">
                          {elevated[0].name}
                        </p>

                        <p className="mt-1 font-mono text-xs text-sky-800">
                          Z: {elevated[0].z_min_m}m –{" "}
                          {elevated[0].z_max_m}m
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CONTEXT */}
                  <div className="mt-4 flex items-start gap-2">

                    {selectedParcel.area_type === "RURAL" ? (
                      <Trees className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    )}

                    <p className="text-xs leading-relaxed text-slate-500">
                      {selectedParcel.area_type === "RURAL"
                        ? "Agricultural parcel mapped under the SVAMITVA / Digital India Land Records Modernization Programme. 3D candidate assists support rural structure verification."
                        : "Urban right-of-way volumetric parcel supporting multi-layer elevated and subsurface transportation infrastructure."}
                    </p>
                  </div>
                </div>

                {/* CONFIDENCE */}
                {confidence && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <ConfidenceMeter confidence={confidence} />
                  </div>
                )}

                {/* EVIDENCE */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <EvidenceList evidences={evidence} />
                </div>

                {/* UNDERGROUND */}
                {underground.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-slate-600" />

                      <h3 className="text-sm font-bold text-[#071d35]">
                        Underground Infrastructure
                      </h3>
                    </div>

                    <div className="mt-3 space-y-2">
                      {underground.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg bg-slate-50 p-3"
                        >
                          <p className="text-xs font-bold text-slate-800">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* =================================================
                 EMPTY STATE
              ================================================= */
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <MapPin className="h-8 w-8 text-blue-500" />
                </div>

                <h3 className="mt-4 text-base font-bold text-[#071d35]">
                  Select a Property
                </h3>

                <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">
                  Search for a parcel or select one of the sample
                  cadastral records above to inspect its spatial
                  information.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =======================================================
            GUIDED ASSISTANT
        ======================================================= */}
        <GuidedAssistant
          selectedProperty={selectedProperty}
          validation={validation}
          confidence={confidence}
        />
      </main>

      {/* =========================================================
          ISSUE REPORT
      ========================================================= */}
      {selectedProperty && (
        <IssueReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          property={selectedProperty}
        />
      )}
    </div>
  );
};