import React, { useState } from 'react';
import { useGeoVista } from '../context/GeoVistaContext';
import { Map2D } from '../components/Map2D';
import { Viewer3D } from '../components/Viewer3D';
import { EvidenceList } from '../components/EvidenceList';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { ValidationBadge } from '../components/ValidationBadge';
import { IssueReportModal } from '../components/IssueReportModal';
import { GuidedAssistant } from '../components/GuidedAssistant';
import { Search, MapPin, Building2, Flag, AlertCircle, Info, Trees, Layers } from 'lucide-react';

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
    loading
  } = useGeoVista();

  const [searchQuery, setSearchQuery] = useState('P001');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    await searchCadastre(searchQuery.trim());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-blue-900 shadow-2xs">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Public Property Discovery Portal:</strong> Displays proposed 3D volumetric cadastre identifiers, multi-sensor spatial evidence, and technical confidence for citizen transparency. This system generates prototype spatial candidates and does not certify legal land titles.
        </p>
      </div>

      {/* Search Bar & Locality Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Parcel (P001, P002, P003, R001, R002), 3D ID, Locality, or Building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Searching...' : 'Search Cadastre'}</span>
          </button>
        </form>

        {/* Generic Sample Parcels Pills (Goal 4) */}
        <div className="flex items-center space-x-2 mt-3 text-xs overflow-x-auto pb-1">
          <span className="text-slate-400 font-medium shrink-0">Sample Parcels:</span>
          {parcels.map((p) => (
            <button
              key={p.id}
              onClick={() => selectParcelById(p.id)}
              className={`px-3 py-1 rounded-lg border font-medium transition shrink-0 ${
                selectedParcel?.id === p.id
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {p.parcel_code} ({p.locality} - {p.area_type})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Volumetric Viewer & 2D Cadastre */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3D Viewer (uses single source of truth from GeoVistaContext) */}
          <Viewer3D />

          {/* 2D Cadastral Footprint Map */}
          <Map2D
            parcel={selectedParcel}
            building={selectedBuilding}
            selectedUnit={selectedProperty}
          />
        </div>

        {/* Right Column: Property Inspection & Evidence Panel */}
        <div className="lg:col-span-4 space-y-6">
          {selectedProperty ? (
            <>
              {/* Review Latency Banner */}
              {selectedProperty.verification_status === 'UNDER_REVIEW' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Under Official Review:</strong> This property is currently under official review. Some spatial values may be updated after survey verification.
                  </p>
                </div>
              )}

              {/* Property Details Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      Proposed 3D Spatial Identifier
                    </span>
                    <h2 className="text-base font-bold font-mono text-slate-900 mt-1">
                      {selectedProperty.proposed_3d_id}
                    </h2>
                  </div>
                  <ValidationBadge status={selectedProperty.verification_status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Floor Level</span>
                    <span className="font-semibold text-slate-800">
                      Floor {selectedProperty.floor_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Unit Number</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProperty.unit_number} ({selectedProperty.unit_type})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Vertical Elevation Range</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      Z: {selectedProperty.z_min_m}m – {selectedProperty.z_max_m}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Footprint Area</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProperty.area_sqm.toFixed(1)} m²
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Revision Version: <strong>v{selectedProperty.revision_number}</strong>
                  </span>
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Issue</span>
                  </button>
                </div>
              </div>

              {/* Confidence Meter */}
              <ConfidenceMeter confidence={confidence} />

              {/* Attached Evidence List */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <EvidenceList evidences={evidence} />
              </div>
            </>
          ) : selectedParcel ? (
            /* Parcel-Level Inspector when parcel has no units (Rural / Transport Corridor) */
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {selectedParcel.area_type} Cadastral Parcel
                    </span>
                    <h2 className="text-base font-bold font-mono text-slate-900 mt-1">
                      {selectedParcel.parcel_code} ({selectedParcel.locality})
                    </h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedParcel.land_use}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">District / State</span>
                    <span className="font-semibold text-slate-800">
                      {selectedParcel.district}, {selectedParcel.state}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Surface Area</span>
                    <span className="font-semibold text-slate-800">
                      {selectedParcel.area_sqm.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                    </span>
                  </div>
                  {candidates.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Detected Structure Candidates</span>
                      <span className="font-bold text-amber-700">
                        {candidates.length} Candidate ({candidates[0].permanence_classification}, H: {candidates[0].estimated_height_m}m)
                      </span>
                    </div>
                  )}
                  {elevated.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Elevated Transit Infrastructure</span>
                      <span className="font-bold text-sky-700">
                        {elevated[0].name} (Z: {elevated[0].z_min_m}m – {elevated[0].z_max_m}m)
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {selectedParcel.area_type === 'RURAL'
                    ? 'Agricultural parcel mapped under the SVAMITVA / Digital India Land Records Modernization Programme. 3D candidate assists support rural structure verification.'
                    : 'Urban right-of-way volumetric parcel supporting multi-layer elevated and subsurface transportation infrastructure.'}
                </p>
              </div>

              {/* Confidence Meter if available */}
              {confidence && <ConfidenceMeter confidence={confidence} />}

              {/* Attached Evidence List */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <EvidenceList evidences={evidence} />
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
              Select a parcel or property unit from the cadastre to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Guided Assistant */}
      <GuidedAssistant
        selectedProperty={selectedProperty}
        validation={validation}
        confidence={confidence}
      />

      {/* Citizen Report Modal */}
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
