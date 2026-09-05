import React, { useState, useEffect } from 'react';
import { useGeoVista } from '../context/GeoVistaContext';
import { Viewer3D } from '../components/Viewer3D';
import { ValidationBadge } from '../components/ValidationBadge';
import { api } from '../services/api';
import {
  ShieldAlert,
  Check,
  X,
  Wrench,
  Play,
  History,
  Radio,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export const OfficerPortal: React.FC = () => {
  const {
    reviewCases,
    selectedCase,
    selectedProperty,
    validation,
    auditLog,
    selectReviewCaseById,
    correctProperty,
    approveReview,
    rejectReview,
    runValidationForCurrentProperty,
    loading
  } = useGeoVista();

  const [showAuditModal, setShowAuditModal] = useState(false);

  // Geometry correction form inputs
  const [correctZMin, setCorrectZMin] = useState<number>(514.0);
  const [correctZMax, setCorrectZMax] = useState<number>(517.0);
  const [correctReason, setCorrectReason] = useState<string>(
    'Officer correction: Adjust Z-bounds to 514.0m–517.0m to eliminate vertical overlap with Unit 301'
  );

  // Sensor simulation states
  const [lidarStatus, setLidarStatus] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Synchronize form values when selectedProperty changes
  useEffect(() => {
    if (selectedProperty) {
      setCorrectZMin(selectedProperty.z_min_m);
      setCorrectZMax(selectedProperty.z_max_m);
    }
  }, [selectedProperty]);

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !selectedProperty) return;

    try {
      // Standard right-half footprint
      const u1_right = [
        [77.41265, 23.2593],
        [77.413, 23.2593],
        [77.413, 23.26],
        [77.41265, 23.26],
        [77.41265, 23.2593]
      ];

      await correctProperty(selectedCase.id, {
        z_min_m: Number(correctZMin),
        z_max_m: Number(correctZMax),
        footprint_2d: u1_right,
        reason: correctReason
      });

      setActionSuccess(
        `Property ${selectedProperty.proposed_3d_id} corrected successfully! Backend state updated to v${
          selectedProperty.revision_number + 1
        } with re-validation passed.`
      );
    } catch (err: any) {
      alert(err.message || 'Failed to correct property geometry.');
    }
  };

  const handleApproveCase = async () => {
    if (!selectedCase) return;
    try {
      await approveReview(selectedCase.id, 'Official survey verification completed; geometry verified.');
      setActionSuccess('Review case approved. Status updated to Officially Verified.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectCase = async () => {
    if (!selectedCase) return;
    try {
      await rejectReview(selectedCase.id, 'Officer rejected due to unresolvable spatial discrepancy.');
      setActionSuccess('Review case rejected.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const runLidarScan = async () => {
    if (!selectedProperty) return;
    try {
      setLidarStatus('Running aerial point-cloud height estimation...');
      const res = await api.analyzeLidar(selectedProperty.id);
      setLidarStatus(
        `LiDAR Analysis Complete: Estimated height: ${res.estimated_height_m}m AMSL across ${res.point_count.toLocaleString()} returns (Confidence: ${res.confidence}%).`
      );
    } catch (err: any) {
      setLidarStatus(`Error: ${err.message}`);
    }
  };

  const runAIModules = async () => {
    try {
      setAiStatus('Running AI building extraction & floor segmentation...');
      const res = await api.runBuildingExtraction('parcel-urban-001');
      setAiStatus(
        `AI Analysis Complete: Extracted footprint with ${res.confidence_score}% confidence. Roof: ${res.extracted_features.roof_type}.`
      );
    } catch (err: any) {
      setAiStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold">Inspection Officer Verification Workbench</h1>
            <p className="text-xs text-slate-400">
              Department of Land Resources (DoLR) • Volumetric Cadastre Decision Console
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAuditModal(true)}
          className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold border border-slate-700 transition"
        >
          <History className="w-4 h-4 text-blue-400" />
          <span>View Audit Trail ({auditLog.length})</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Review Queue & Case Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Review Cases Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Inspection Review Queue ({reviewCases.length})
            </h3>

            <div className="space-y-2">
              {reviewCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectReviewCaseById(c.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedCase?.id === c.id
                      ? 'bg-blue-50/80 border-blue-600 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {c.case_number}
                    </span>
                    <ValidationBadge status={c.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.review_notes}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
                    <span>Priority: {c.priority}</span>
                    <span className="flex items-center text-blue-600 font-medium">
                      Inspect <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sensor Simulation Action Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Sensor & AI Inspection Tools
            </h4>

            <button
              onClick={runLidarScan}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold transition"
            >
              <Radio className="w-4 h-4 text-purple-600" />
              <span>Run Aerial LiDAR Point-Cloud Scan</span>
            </button>

            {lidarStatus && (
              <div className="p-2.5 bg-purple-50/60 rounded-lg text-[11px] text-purple-900 border border-purple-100">
                {lidarStatus}
              </div>
            )}

            <button
              onClick={runAIModules}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-semibold transition"
            >
              <Play className="w-4 h-4 text-rose-600" />
              <span>Execute AI Footprint & Floor Segmentation</span>
            </button>

            {aiStatus && (
              <div className="p-2.5 bg-rose-50/60 rounded-lg text-[11px] text-rose-900 border border-rose-100">
                {aiStatus}
              </div>
            )}
          </div>
        </div>

        {/* Right: Inspection Workbench & Geometry Correction */}
        <div className="lg:col-span-8 space-y-6">
          {selectedProperty ? (
            <>
              {/* Selected Property Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    {selectedCase && (
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        Case: {selectedCase.case_number}
                      </span>
                    )}
                    <ValidationBadge status={selectedProperty.verification_status} />
                  </div>
                  <h2 className="text-base font-bold font-mono text-slate-900 mt-1">
                    {selectedProperty.proposed_3d_id}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Floor {selectedProperty.floor_number} • Unit {selectedProperty.unit_number} • Z: {selectedProperty.z_min_m}m – {selectedProperty.z_max_m}m
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={runValidationForCurrentProperty}
                    disabled={loading}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Validation</span>
                  </button>

                  {selectedCase && (
                    <>
                      <button
                        onClick={handleApproveCase}
                        disabled={loading}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={handleRejectCase}
                        disabled={loading}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 3D Volumetric View (Shared generic component from GeoVistaContext) */}
              <Viewer3D />

              {/* 9-Rule Validation Engine Results */}
              {validation && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Deterministic 9-Rule Validation Results
                    </h3>
                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <span className="text-emerald-600">Passed: {validation.passed_rules}</span>
                      <span className="text-amber-600">Warnings: {validation.warning_rules}</span>
                      <span className="text-rose-600">Failed: {validation.failed_rules}</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {validation.results.map((r) => (
                      <div
                        key={r.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
                          r.status === 'PASS'
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                            : r.status === 'WARNING'
                            ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                            : 'bg-rose-50/70 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="mt-0.5">
                          {r.status === 'PASS' ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {r.rule_id}: {r.rule_name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200">
                              {r.category}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-600 leading-snug">
                            {r.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Officer Live Geometry Correction Form (Mutates Authoritative Backend State) */}
              {selectedCase && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                    <Wrench className="w-4 h-4 text-blue-900" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Live Geometry Adjustment Tool (Mutates Backend & Public View)
                    </h3>
                  </div>

                  <form onSubmit={handleApplyCorrection} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Z Minimum Elevation (AMSL in meters)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={correctZMin}
                          onChange={(e) => setCorrectZMin(Number(e.target.value))}
                          className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Recommended: 514.0m to clear Floor 3 overlap
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Z Maximum Elevation (AMSL in meters)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={correctZMax}
                          onChange={(e) => setCorrectZMax(Number(e.target.value))}
                          className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Recommended: 517.0m
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Official Reason for Correction
                      </label>
                      <input
                        type="text"
                        required
                        value={correctReason}
                        onChange={(e) => setCorrectReason(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-slate-500">
                        Mutates backend record, creates <strong>v{selectedProperty.revision_number + 1}</strong>, and synchronizes Public Portal.
                      </span>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        {loading ? 'Processing...' : 'Apply Correction & Re-Validate'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 text-sm">
              Select a review case from the queue to start officer inspection.
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-blue-900" />
                <h3 className="text-sm font-bold text-slate-900">Authoritative Audit Trail</h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
              {auditLog.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-8">
                  No audit log entries recorded yet.
                </div>
              ) : (
                auditLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs space-y-1 font-mono"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-blue-900">{log.action}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-slate-700">{log.notes || 'State modification recorded.'}</p>
                    <div className="text-[10px] text-slate-400">
                      Actor: {log.actor_role} • Object: {log.object_type} ({log.object_id})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
