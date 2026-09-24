import { Router } from "express";
import { repository } from "../repository.js";
import { uuid, now } from "../utils.js";

const router = Router();

const getProperty = (propertyId) =>
  repository.units[propertyId] ||
  Object.values(repository.units).find(
    (unit) =>
      unit.proposed_3d_id === propertyId
  );

// Get all issue reports
router.get("/", (_req, res) => {
  return res.json(
    repository.issue_reports
  );
});

// Get single issue report
router.get(
  "/:report_id",
  (req, res) => {
    const report =
      repository.issue_reports.find(
        (item) =>
          item.id ===
          req.params.report_id
      );

    if (!report) {
      return res.status(404).json({
        detail: `Issue report '${req.params.report_id}' not found.`,
      });
    }

    return res.json(report);
  }
);

// Create issue report
router.post("/", (req, res) => {
  const body = req.body || {};

  if (!body.property_id) {
    return res.status(400).json({
      detail: "property_id is required.",
    });
  }

  const property = getProperty(
    body.property_id
  );

  if (!property) {
    return res.status(404).json({
      detail: `Target property '${body.property_id}' not found.`,
    });
  }

  const reportId = uuid();

  const report = {
    id: reportId,

    property_id: property.id,

    report_code: `REP-${uuid()
      .replaceAll("-", "")
      .slice(0, 6)
      .toUpperCase()}`,

    reporter_type: "PUBLIC_USER",

    category:
      body.category ||
      "DATA_DISCREPANCY",

    title: String(
      body.title || ""
    ).trim(),

    description: String(
      body.description || ""
    ).trim(),

    contact_email: String(
      body.contact_email || ""
    ).trim(),

    status: "OPEN",

    submitted_at: now(),
  };

  repository.issue_reports.push(
    report
  );

  return res.status(201).json(
    report
  );
});

export default router;