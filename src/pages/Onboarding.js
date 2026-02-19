import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { AuthAuroraCanvas } from "../components";
import { EXAM_PATTERNS } from "../utils/examPatterns";
import toast, { messages } from "../utils/toast";

const STEPS = [
  { id: "name", title: "What should we call you?", subtitle: "This will be your display name" },
  { id: "exam", title: "What are you preparing for?", subtitle: "Pick your target exam" },
];

const examCards = Object.keys(EXAM_PATTERNS).map((key) => ({
  value: key,
  name: EXAM_PATTERNS[key].name,
  icon: key === "CDS" ? "🎖️" : key === "CSAT" ? "🧮" : key === "IAS-GS" ? "📜" : "📊",
  color: key === "CDS" ? "from-emerald-500 to-teal-600" : key === "CSAT" ? "from-orange-500 to-amber-600" : key === "IAS-GS" ? "from-blue-500 to-indigo-600" : "from-purple-500 to-pink-600",
}));

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [saving, setSaving] = useState(false);
  const { currentUser, refreshUserDetails } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 0) {
      if (!displayName.trim() || displayName.trim().length < 2) {
        toast.error(messages.NAME_REQUIRED);
        return;
      }
      setStep(1);
    }
  };

  const handleFinish = async () => {
    if (!selectedExam) {
      toast.error(messages.EXAM_REQUIRED);
      return;
    }
    if (!currentUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: displayName.trim(),
        targetExam: selectedExam,
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserDetails();
      toast.success(messages.ONBOARDING_SUCCESS);
      navigate("/dashboard");
    } catch {
      toast.error(messages.ONBOARDING_FAILED);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AuthAuroraCanvas />

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-3 mb-8">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-10 bg-gradient-to-r from-blue-500 to-purple-500" : i < step ? "w-2 bg-blue-400" : "w-2 bg-gray-300 dark:bg-gray-600"
              }`}
              layoutId={`dot-${i}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-name"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-lg opacity-25" />
                <div className="relative bg-white/85 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
                  {/* Greeting icon */}
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/30"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <span className="text-4xl">👋</span>
                  </motion.div>

                  <motion.h2
                    className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {STEPS[0].title}
                  </motion.h2>
                  <motion.p
                    className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {STEPS[0].subtitle}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-lg text-center font-medium transition-all"
                      placeholder="Your name"
                      autoFocus
                      maxLength={50}
                      onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    />
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                  >
                    Continue
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-exam"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl blur-lg opacity-25" />
                <div className="relative bg-white/85 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/50">
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl shadow-purple-500/30"
                    initial={{ scale: 0, rotate: 20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <span className="text-4xl">🎯</span>
                  </motion.div>

                  <motion.h2
                    className="text-2xl font-extrabold text-center text-gray-900 dark:text-white mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {STEPS[1].title}
                  </motion.h2>
                  <motion.p
                    className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {STEPS[1].subtitle}
                  </motion.p>

                  <div className="grid grid-cols-2 gap-3">
                    {examCards.map((exam, i) => (
                      <motion.button
                        key={exam.value}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.08 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedExam(exam.value)}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedExam === exam.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/20"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {selectedExam === exam.value && (
                          <motion.div
                            layoutId="exam-selected"
                            className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${exam.color} flex items-center justify-center mb-2 shadow-md`}>
                          <span className="text-lg">{exam.icon}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{exam.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{exam.name.split(" - ")[1]}</p>
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep(0)}
                      className="px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold transition-all"
                    >
                      Back
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFinish}
                      disabled={!selectedExam || saving}
                      className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? "Setting up..." : "Let's Go! 🚀"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
