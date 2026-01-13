import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import logger from "./logger";

/**
 * Write an entry to the auditLogs Firestore collection.
 *
 * @param {Object} params
 * @param {string} params.adminId    – UID of the admin performing the action
 * @param {string} params.action     – short verb, e.g. "deleteUser", "toggleAdmin", "deleteQuestion"
 * @param {string} [params.targetId] – ID of the affected resource (user, question, report…)
 * @param {Object} [params.details]  – any extra context (old/new values, etc.)
 */
export const logAdminAction = async ({ adminId, action, targetId = null, details = {} }) => {
  try {
    await addDoc(collection(db, "auditLogs"), {
      adminId,
      action,
      targetId,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Never let audit logging break the actual operation
    logger.error("Failed to write audit log:", error);
  }
};
