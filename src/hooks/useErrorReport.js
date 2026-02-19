import { useCallback, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import toast, { messages } from "../utils/toast";
import { db } from "../config/firebase";
import logger from "../utils/logger";

/**
 * Shared error-report submission logic for test pages.
 *
 * @param {string} userId   – current user UID
 * @param {string} examType – exam type string
 */
export const useErrorReport = (userId, examType) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const openReport = useCallback(() => setShowReportModal(true), []);
  const closeReport = useCallback(() => {
    setShowReportModal(false);
    setReportText("");
  }, []);

  const submitReport = useCallback(
    async (questionId) => {
      if (!reportText.trim()) {
        toast.error(messages.REPORT_EMPTY);
        return;
      }
      try {
        setReportSubmitting(true);
        await addDoc(collection(db, "errorReports"), {
          userId,
          questionId,
          examType,
          reportText: reportText.trim(),
          createdAt: new Date().toISOString(),
          status: "pending",
        });
        toast.success(messages.REPORT_SUBMITTED);
        closeReport();
      } catch (error) {
        logger.error("Error submitting report:", error);
        toast.error(messages.REPORT_FAILED);
      } finally {
        setReportSubmitting(false);
      }
    },
    [userId, examType, reportText, closeReport]
  );

  return {
    showReportModal,
    reportText,
    setReportText,
    reportSubmitting,
    openReport,
    closeReport,
    submitReport,
  };
};

export default useErrorReport;
