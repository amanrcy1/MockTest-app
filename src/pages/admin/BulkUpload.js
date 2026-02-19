import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import toast, { messages } from "../../utils/toast";
import Papa from "papaparse";
import { sanitizeForStorage } from "../../utils/testUtils";
import { useAuth } from "../../context/AuthContext";
import { logAdminAction } from "../../utils/auditLog";
import logger from "../../utils/logger";

const BulkUpload = () => {
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Defense-in-depth: guard against non-admin access even if route protection is bypassed
  if (!userDetails?.isAdmin) return <Navigate to="/dashboard" replace />;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split(".").pop().toLowerCase();
      if (fileType !== "csv") {
        toast.error(messages.CSV_REQUIRED);
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file) => {
    // Parse CSV only (secure alternative to xlsx)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processData(results.data);
      },
      error: (error) => {
        logger.error("CSV Parse Error:", error);
        toast.error(messages.CSV_PARSE_FAILED);
      },
    });
  };

  const processData = (data) => {
    // Validate and format data
    const formattedData = data.map((row, index) => {
      // Check required fields
      const requiredFields = [
        "examType",
        "subject",
        "topic",
        "questionText",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
        "correctAnswer",
        "solution",
      ];

      const missingFields = requiredFields.filter((field) => !row[field]);

      if (missingFields.length > 0) {
        return {
          row: index + 2, // +2 because CSV rows start at 1 and we have header
          error: `Missing fields: ${missingFields.join(", ")}`,
          valid: false,
        };
      }

      // Validate correct answer
      if (!["A", "B", "C", "D"].includes(row.correctAnswer?.toUpperCase())) {
        return {
          row: index + 2,
          error: "Correct answer must be A, B, C, or D",
          valid: false,
        };
      }

      return {
        row: index + 2,
        examType: row.examType,
        subject: row.subject,
        topic: row.topic,
        subtopic: row.subtopic || "",
        difficulty: row.difficulty || "Medium",
        questionText: sanitizeForStorage(row.questionText),
        options: {
          A: sanitizeForStorage(row.optionA),
          B: sanitizeForStorage(row.optionB),
          C: sanitizeForStorage(row.optionC),
          D: sanitizeForStorage(row.optionD),
        },
        correctAnswer: row.correctAnswer.toUpperCase(),
        solution: sanitizeForStorage(row.solution),
        tags: row.tags ? row.tags.split(",").map((tag) => tag.trim()) : [],
        valid: true,
      };
    });

    setPreview(formattedData);
    setShowPreview(true);
  };

  const handleUpload = async () => {
    const validQuestions = preview.filter((q) => q.valid);

    if (validQuestions.length === 0) {
      toast.error(messages.NO_VALID_QUESTIONS);
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const question of validQuestions) {
        try {
          // eslint-disable-next-line no-unused-vars
          const { row, valid, ...questionData } = question;
          await addDoc(collection(db, "questions"), {
            ...questionData,
            createdAt: new Date().toISOString(),
            createdBy: "admin",
            isActive: true,
          });
          successCount++;
        } catch (error) {
          logger.error(`Error uploading question from row ${question.row}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        logAdminAction({ adminId: userDetails?.userId, action: "bulkUploadQuestions", details: { successCount, errorCount } });
        toast.success(messages.BULK_UPLOAD_SUCCESS(successCount));
      }
      if (errorCount > 0) {
        toast.warning(messages.BULK_UPLOAD_PARTIAL(errorCount));
      }

      // Reset state
      setFile(null);
      setPreview([]);
      setShowPreview(false);
    } catch (error) {
      logger.error("Bulk upload error:", error);
      toast.error(messages.BULK_UPLOAD_FAILED);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        examType: "CDS",
        subject: "English",
        topic: "Grammar",
        subtopic: "Tenses",
        difficulty: "Medium",
        questionText:
          'Which tense is used in: "I have been working here for 5 years"?',
        optionA: "Simple Present",
        optionB: "Present Perfect Continuous",
        optionC: "Past Perfect",
        optionD: "Future Continuous",
        correctAnswer: "B",
        solution:
          "Present Perfect Continuous tense is used for actions that started in the past and are still continuing.",
        tags: "grammar, tenses, important",
      },
      {
        examType: "IAS-GS",
        subject: "Indian Polity and Governance",
        topic: "Constitution",
        subtopic: "Fundamental Rights",
        difficulty: "Easy",
        questionText:
          "Which article of the Indian Constitution deals with the Right to Equality?",
        optionA: "Article 14",
        optionB: "Article 19",
        optionC: "Article 21",
        optionD: "Article 32",
        correctAnswer: "A",
        solution:
          "Article 14 of the Indian Constitution guarantees equality before law and equal protection of laws.",
        tags: "polity, constitution, fundamental-rights",
      },
    ];

    // Convert to CSV format
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'questions_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(messages.TEMPLATE_DOWNLOADED);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Bulk Upload Questions
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload multiple questions via CSV
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Admin
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Instructions</h2>
          <div className="space-y-3 text-gray-600 dark:text-gray-400">
            <p>1. Download the template file by clicking the button below</p>
            <p>2. Fill in the questions following the template format</p>
            <p>
              3. Make sure all required fields are filled:
              <span className="font-semibold">
                {" "}
                examType, subject, topic, questionText, optionA-D,
                correctAnswer, solution
              </span>
            </p>
            <p>4. correctAnswer must be A, B, C, or D (case-insensitive)</p>
            <p>
              5. difficulty should be Easy, Medium, or Hard (default: Medium)
            </p>
            <p>6. Tags should be comma-separated (optional)</p>
            <p>7. Upload the completed file (CSV format)</p>
          </div>

          <button
            onClick={downloadTemplate}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Template
          </button>
        </div>

        {/* File Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Upload File</h2>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                CSV format only (Max 5MB)
              </p>
            </label>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                  setShowPreview(false);
                }}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                disabled={uploading}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        {showPreview && preview.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Preview & Validation
            </h2>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {preview.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Rows</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {preview.filter((q) => q.valid).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Valid Questions</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {preview.filter((q) => !q.valid).length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              </div>
            </div>

            {/* Error List */}
            {preview.some((q) => !q.valid) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
                  Errors Found:
                </h3>
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {preview
                    .filter((q) => !q.valid)
                    .map((question, index) => (
                      <div key={index} className="mb-2 text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-semibold">
                          Row {question.row}:
                        </span>{" "}
                        {question.error}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Valid Questions Preview */}
            {preview.some((q) => q.valid) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">
                  Valid Questions Preview (First 3):
                </h3>
                <div className="space-y-4">
                  {preview
                    .filter((q) => q.valid)
                    .slice(0, 3)
                    .map((question, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex gap-2 mb-2">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                            {question.examType}
                          </span>
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded">
                            {question.subject}
                          </span>
                          <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded">
                            {question.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">
                          {question.questionText}
                        </p>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Correct Answer:{" "}
                          <span className="font-semibold">
                            {question.correctAnswer}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {preview.filter((q) => q.valid).length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    ... and {preview.filter((q) => q.valid).length - 3} more
                    valid questions
                  </p>
                )}
              </div>
            )}

            {/* Upload Button */}
            {preview.some((q) => q.valid) && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Uploading...
                  </span>
                ) : (
                  `Upload ${preview.filter((q) => q.valid).length} Valid Questions`
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUpload;
