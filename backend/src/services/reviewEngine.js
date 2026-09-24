import { repository } from "../repository.js";
import { uuid, now } from "../utils.js";

export const reviewEngine = {
  logAudit({
    actor_role,
    object_id,
    object_type,
    action,
    previous_state = null,
    new_state = null,
    notes = null,
  }) {
    const entry = {
      id: uuid(),
      timestamp: now(),
      actor_role,
      object_id,
      object_type,
      action,
      previous_state,
      new_state,
      notes,
    };

    repository.audit_log.push(entry);

    return entry;
  },

  createRevision({
    property_id,
    revision_number,
    actor_role,
    changed_fields,
    previous_values,
    new_values,
    reason,
  }) {
    const revision = {
      id: uuid(),
      property_id,
      revision_number,
      timestamp: now(),
      actor_role,
      changed_fields,
      previous_values,
      new_values,
      reason,
    };

    repository.revisions.push(revision);

    return revision;
  },

  updateReviewStatus(
    caseObj,
    newStatus,
    officerName,
    notes = ""
  ) {
    if (!caseObj) {
      throw new Error("Review case not found");
    }

    const oldStatus = caseObj.status;

    caseObj.status = newStatus;
    caseObj.updated_at = now();
    caseObj.review_notes = notes;

    caseObj.history = Array.isArray(caseObj.history)
      ? caseObj.history
      : [];

    caseObj.history.push({
      timestamp: now(),
      from_status: oldStatus,
      to_status: newStatus,
      officer: officerName,
      notes,
    });

    this.logAudit({
      actor_role: "INSPECTION_OFFICER",
      object_id: caseObj.property_id,
      object_type: "PropertyUnit",
      action: `REVIEW_STATUS_CHANGED_${newStatus}`,
      previous_state: {
        status: oldStatus,
      },
      new_state: {
        status: newStatus,
      },
      notes: `Officer ${officerName}: ${notes}`,
    });

    return caseObj;
  },
};