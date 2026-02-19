import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import toast, { messages } from "../../utils/toast";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { EXAM_PATTERNS } from "../../utils/examPatterns";
import { ThemeToggle, AuthAuroraCanvas, BottomNav, TopNav } from "../../components";
import logger from "../../utils/logger";

const createCroppedImage = async (imageSrc, pixelCrop, maxSize = 200, quality = 0.8) => {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = maxSize;
  canvas.height = maxSize;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, maxSize, maxSize);
  return new Promise((resolve) => {
    let q = quality;
    const tryCompress = () => {
      const base64 = canvas.toDataURL("image/jpeg", q);
      if ((base64.length * 0.75) / 1024 > 100 && q > 0.3) { q -= 0.1; tryCompress(); }
      else resolve(base64);
    };
    tryCompress();
  });
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 14 } } };

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, userDetails, refreshUserDetails } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ name: "", targetExam: "CDS" });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (userDetails) {
      setFormData({ name: userDetails.name || "", targetExam: userDetails.targetExam || "CDS" });
      if (userDetails.photoURL) setPreviewUrl(userDetails.photoURL);
    }
  }, [userDetails]);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(messages.INVALID_IMAGE); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(messages.IMAGE_TOO_LARGE); return; }
    setShowPhotoOptions(false);
    const reader = new FileReader();
    reader.onload = () => { setImageToCrop(reader.result); setShowCropper(true); setCrop({ x: 0, y: 0 }); setZoom(1); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onCropComplete = useCallback((_, px) => setCroppedAreaPixels(px), []);

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels || !currentUser) return;
    try {
      setUploadingPhoto(true);
      const cropped = await createCroppedImage(imageToCrop, croppedAreaPixels);
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL: cropped, updatedAt: new Date().toISOString() });
      setPreviewUrl(cropped); setShowCropper(false); setImageToCrop(null);
      await refreshUserDetails();
      toast.success(messages.PHOTO_UPDATED);
    } catch (err) { logger.error("Crop save error:", err); toast.error(messages.PHOTO_SAVE_FAILED); }
    finally { setUploadingPhoto(false); }
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;
    try {
      setUploadingPhoto(true); setShowPhotoOptions(false);
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL: null, updatedAt: new Date().toISOString() });
      setPreviewUrl(null); await refreshUserDetails(); toast.success(messages.PHOTO_REMOVED);
    } catch (err) { logger.error("Remove photo error:", err); toast.error(messages.PHOTO_REMOVE_FAILED); }
    finally { setUploadingPhoto(false); }
  };

  const handleSave = async () => {
    if (!currentUser) { toast.error(messages.LOGIN_REQUIRED); return; }
    try {
      setSaving(true);
      await updateDoc(doc(db, "users", currentUser.uid), { name: formData.name.trim(), targetExam: formData.targetExam, updatedAt: new Date().toISOString() });
      await refreshUserDetails(); toast.success(messages.PROFILE_UPDATED); navigate("/dashboard");
    } catch (err) { logger.error("Save error:", err); toast.error(messages.PROFILE_UPDATE_FAILED); }
    finally { setSaving(false); }
  };

  const initial = userDetails?.name?.charAt(0)?.toUpperCase() || "U";
  const memberSince = userDetails?.createdAt ? new Date(userDetails.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : null;

  return (
    <div className="min-h-screen relative overflow-hidden pb-20 md:pb-0">
      <AuthAuroraCanvas />
      <TopNav />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

      {/* Cropper Modal */}
      <AnimatePresence>
        {showCropper && imageToCrop && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-black/80">
              <button onClick={() => { setShowCropper(false); setImageToCrop(null); }} className="text-white font-medium px-4 py-2">Cancel</button>
              <h3 className="text-white font-semibold">Crop Photo</h3>
              <button onClick={handleCropSave} disabled={uploadingPhoto} className="text-blue-400 font-semibold px-4 py-2 disabled:opacity-50">{uploadingPhoto ? "Saving..." : "Done"}</button>
            </div>
            <div className="flex-1 relative">
              <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className="p-6 bg-black/80">
              <div className="flex items-center gap-4 max-w-xs mx-auto">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Options Modal */}
      <AnimatePresence>
        {showPhotoOptions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowPhotoOptions(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Profile Photo</h3>
              </div>
              <div className="p-2">
                <button onClick={() => { setShowPhotoOptions(false); fileInputRef.current?.click(); }} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="text-left"><p className="font-semibold text-gray-900 dark:text-white">Choose from Gallery</p><p className="text-sm text-gray-500 dark:text-gray-400">Select and crop your photo</p></div>
                </button>
                {previewUrl && (
                  <button onClick={handleRemovePhoto} disabled={uploadingPhoto} className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </div>
                    <div className="text-left"><p className="font-semibold text-red-600 dark:text-red-400">Remove Photo</p></div>
                  </button>
                )}
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setShowPhotoOptions(false)} className="w-full p-4 text-gray-500 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 md:top-14 z-40 backdrop-blur-xl bg-white/60 dark:bg-gray-900/60 border-b border-white/20 dark:border-gray-700/30">
        <div className="px-4 py-3 max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate("/dashboard")} className="p-2 -ml-2 rounded-xl hover:bg-white/40 dark:hover:bg-gray-700/40 transition-colors md:hidden" aria-label="Back">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </motion.button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Profile</h1>
          </div>
          <ThemeToggle className="md:hidden" />
        </div>
      </header>

      <main className="relative z-10 px-4 py-8 max-w-2xl mx-auto">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">

          {/* Hero Card — Avatar + Info */}
          <motion.div variants={fadeUp} className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-gray-700/40 shadow-2xl shadow-purple-500/5 overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.2),transparent_70%)]" />
            </div>

            <div className="px-6 pb-6 -mt-14 flex flex-col items-center">
              <motion.div className="relative cursor-pointer group" whileHover={{ scale: 1.05 }} onClick={() => setShowPhotoOptions(true)}>
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-white dark:ring-gray-900 overflow-hidden">
                  {previewUrl ? <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" /> : initial}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                    <svg className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                </div>
                <motion.div className="absolute -bottom-1 -right-1 w-9 h-9 bg-blue-500 rounded-full border-[3px] border-white dark:border-gray-900 flex items-center justify-center shadow-lg" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </motion.div>
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{userDetails?.name}</h2>

              <div className="flex items-center gap-6 mt-4">
                {userDetails?.targetExam && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    {EXAM_PATTERNS[userDetails.targetExam]?.name || userDetails.targetExam}
                  </div>
                )}
                {memberSince && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Joined {memberSince}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Email Card (read-only, shows Google email) */}
          <motion.div variants={fadeUp} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-gray-700/40 shadow-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Google Account</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userDetails?.email}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 dark:text-green-400 mt-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Verified
                  </span>
                </div>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Edit Details Card */}
          <motion.div variants={fadeUp} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-gray-700/40 shadow-xl overflow-hidden">
            {/* Full Name */}
            <div className="p-5 border-b border-gray-100/80 dark:border-gray-700/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Display Name</span>
              </div>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-600/40 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none text-gray-900 dark:text-white transition-all placeholder:text-gray-400"
                placeholder="Your display name" />
            </div>

            {/* Target Exam */}
            <div className="p-5 border-b border-gray-100/80 dark:border-gray-700/40">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Target Exam</span>
              </div>
              <div className="relative">
                <select name="targetExam" value={formData.targetExam} onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-600/40 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none text-gray-900 dark:text-white appearance-none cursor-pointer transition-all">
                  {Object.keys(EXAM_PATTERNS).map((key) => (
                    <option key={key} value={key}>{EXAM_PATTERNS[key].name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>


          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={fadeUp} className="space-y-3 pb-4">
            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  Saving...
                </span>
              ) : "Save Changes"}
            </motion.button>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => navigate("/dashboard")}
              className="w-full py-3.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-600 dark:text-gray-300 rounded-2xl font-semibold hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all border border-gray-200/50 dark:border-gray-700/40">
              Cancel
            </motion.button>
          </motion.div>

        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
