import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { EXAM_PATTERNS } from "../../utils/examPatterns";
import { ThemeToggle } from "../../components";
import { BottomNav } from "../../components";
import logger from "../../utils/logger";

// Create cropped image from canvas
const createCroppedImage = async (imageSrc, pixelCrop, maxSize = 200, quality = 0.8) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size to desired output size
  canvas.width = maxSize;
  canvas.height = maxSize;

  // Draw cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    maxSize,
    maxSize
  );

  // Convert to base64 with compression
  return new Promise((resolve) => {
    // Try different quality levels to get under 100KB
    let currentQuality = quality;
    const tryCompress = () => {
      const base64 = canvas.toDataURL("image/jpeg", currentQuality);
      const sizeKB = (base64.length * 0.75) / 1024;
      
      if (sizeKB > 100 && currentQuality > 0.3) {
        currentQuality -= 0.1;
        tryCompress();
      } else {
        resolve(base64);
      }
    };
    tryCompress();
  });
};

// Helper to create image element
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, userDetails, refreshUserDetails } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    targetExam: "CDS",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);


  useEffect(() => {
    if (userDetails) {
      setFormData({
        name: userDetails.name || "",
        targetExam: userDetails.targetExam || "CDS",
        email: userDetails.hasRealEmail ? userDetails.email : "",
      });
      if (userDetails.photoURL) {
        setPreviewUrl(userDetails.photoURL);
      }
    }
  }, [userDetails]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePhotoClick = () => {
    setShowPhotoOptions(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setShowPhotoOptions(false);
    
    // Read file and open cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = "";
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels || !currentUser) return;

    try {
      setUploadingPhoto(true);
      
      // Create cropped and compressed image
      const croppedImage = await createCroppedImage(imageToCrop, croppedAreaPixels, 200, 0.8);
      
      // Update user document
      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: croppedImage,
        updatedAt: new Date().toISOString(),
      });

      setPreviewUrl(croppedImage);
      setShowCropper(false);
      setImageToCrop(null);
      await refreshUserDetails();
      toast.success("Profile photo updated!");
    } catch (error) {
      logger.error("Error saving cropped photo:", error);
      toast.error("Failed to save photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleRemovePhoto = async () => {
    if (!currentUser) return;

    try {
      setUploadingPhoto(true);
      setShowPhotoOptions(false);

      await updateDoc(doc(db, "users", currentUser.uid), {
        photoURL: null,
        updatedAt: new Date().toISOString(),
      });

      setPreviewUrl(null);
      await refreshUserDetails();
      toast.success("Profile photo removed");
    } catch (error) {
      logger.error("Error removing photo:", error);
      toast.error("Failed to remove photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      toast.error("Please log in again.");
      return;
    }

    // Validate email if provided
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Please enter a valid email");
      return;
    }

    try {
      setSaving(true);
      
      const updates = {
        name: formData.name.trim(),
        targetExam: formData.targetExam,
        updatedAt: new Date().toISOString(),
      };

      // If user is adding/updating email
      if (formData.email && formData.email !== userDetails?.email) {
        // Check if email already exists
        const emailKey = formData.email.toLowerCase().replace(/[.#$[\]]/g, "_");
        const emailDocRef = doc(db, "emails", emailKey);
        const emailSnapshot = await getDoc(emailDocRef);
        
        if (emailSnapshot.exists() && emailSnapshot.data().userId !== currentUser.uid) {
          toast.error("This email is already in use");
          setSaving(false);
          return;
        }

        // Update email in user document
        updates.email = formData.email;
        updates.hasRealEmail = true;
        updates.emailVerified = false;

        // Create/update email mapping
        await setDoc(emailDocRef, {
          userId: currentUser.uid,
          email: formData.email,
          updatedAt: new Date().toISOString(),
        });

        // Update username mapping with new email
        if (userDetails?.username) {
          const usernameKey = userDetails.username.toLowerCase().trim();
          const usernameDocRef = doc(db, "usernames", usernameKey);
          await updateDoc(usernameDocRef, {
            email: formData.email,
            hasRealEmail: true,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await updateDoc(doc(db, "users", currentUser.uid), updates);
      await refreshUserDetails();
      
      if (formData.email && formData.email !== userDetails?.email) {
        toast.success("Profile updated! Please verify your new email.");
        setEditingEmail(false);
      } else {
        toast.success("Profile updated");
      }
      
      navigate("/dashboard");
    } catch (error) {
      logger.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser || !userDetails?.hasRealEmail) return;

    try {
      setSendingVerification(true);
      // Import sendEmailVerification
      const { sendEmailVerification } = await import("firebase/auth");
      await sendEmailVerification(currentUser);
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      logger.error("Error sending verification:", error);
      if (error.code === "auth/too-many-requests") {
        toast.error("Please wait before requesting another email");
      } else {
        toast.error("Failed to send verification email");
      }
    } finally {
      setSendingVerification(false);
    }
  };


  return (
    <div className="min-h-screen mesh-gradient pb-20 md:pb-0">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {showCropper && imageToCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            {/* Cropper Header */}
            <div className="flex items-center justify-between p-4 bg-black/80">
              <button
                onClick={handleCropCancel}
                className="text-white font-medium px-4 py-2"
              >
                Cancel
              </button>
              <h3 className="text-white font-semibold">Crop Photo</h3>
              <button
                onClick={handleCropSave}
                disabled={uploadingPhoto}
                className="text-blue-400 font-semibold px-4 py-2 disabled:opacity-50"
              >
                {uploadingPhoto ? "Saving..." : "Done"}
              </button>
            </div>

            {/* Cropper Area */}
            <div className="flex-1 relative">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Zoom Slider */}
            <div className="p-6 bg-black/80">
              <div className="flex items-center gap-4 max-w-xs mx-auto">
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                    [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                />
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </div>
              <p className="text-center text-white/50 text-xs mt-3">Pinch or use slider to zoom</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="glass-card sticky top-0 z-40">
        <div className="px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/dashboard")}
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Back"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Profile</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-3xl mx-auto">
        {/* Profile Avatar with Upload */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="flex flex-col items-center mb-8"
        >
          <motion.div 
            className="relative cursor-pointer group"
            whileHover={{ scale: 1.05 }}
            onClick={handlePhotoClick}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-xl opacity-40 scale-110" />
            
            {/* Avatar */}
            <motion.div 
              className="relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold shadow-2xl overflow-hidden"
              style={{ transformStyle: "preserve-3d" }}
              whileHover={{ rotateY: 10, rotateX: -10 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                userDetails?.name?.charAt(0)?.toUpperCase() || "U"
              )}
              
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />
              
              {/* Upload overlay on hover */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </motion.div>
            
            {/* Camera badge */}
            <motion.div 
              className="absolute bottom-0 right-0 w-9 h-9 bg-blue-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              whileHover={{ scale: 1.1 }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </motion.div>
          </motion.div>
          
          <motion.p
            className="text-xs text-gray-500 dark:text-gray-400 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Tap to change photo
          </motion.p>
          
          <motion.h2 
            className="text-2xl font-bold text-gray-900 dark:text-white mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {userDetails?.name}
          </motion.h2>
          <motion.p 
            className="text-sm text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            @{userDetails?.username}
          </motion.p>
        </motion.div>


        {/* Photo Options Modal */}
        <AnimatePresence>
          {showPhotoOptions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
              onClick={() => setShowPhotoOptions(false)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Profile Photo</h3>
                </div>
                
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowPhotoOptions(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Choose from Gallery</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Select and crop your photo</p>
                    </div>
                  </button>
                  
                  {previewUrl && (
                    <button
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-red-600 dark:text-red-400">Remove Photo</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Delete your profile photo</p>
                      </div>
                    </button>
                  )}
                </div>
                
                <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowPhotoOptions(false)}
                    className="w-full p-4 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden border border-gray-100 dark:border-gray-700"
        >
          {/* Read-only fields */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-gray-900 dark:text-white font-medium">{userDetails?.username || "-"}</p>
            </div>
          </div>
          
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Email {!userDetails?.hasRealEmail && <span className="text-amber-500">(Add for account recovery)</span>}
            </label>
            {userDetails?.hasRealEmail && !editingEmail ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">{userDetails?.email}</p>
                    {currentUser?.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <button
                        onClick={handleSendVerification}
                        disabled={sendingVerification}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1 hover:underline disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {sendingVerification ? "Sending..." : "Verify Email"}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditingEmail(true)}
                  className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all duration-200"
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
                {!userDetails?.hasRealEmail && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Add your email for password recovery and important updates
                  </p>
                )}
                {editingEmail && (
                  <button
                    onClick={() => {
                      setEditingEmail(false);
                      setFormData(prev => ({ ...prev, email: userDetails?.email || "" }));
                    }}
                    className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white transition-all duration-200"
              placeholder="Enter your name"
            />
          </div>

          <div className="p-5">
            <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Target Exam
            </label>
            <div className="relative">
              <select
                name="targetExam"
                value={formData.targetExam}
                onChange={handleChange}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white appearance-none cursor-pointer transition-all duration-200"
              >
                {Object.keys(EXAM_PATTERNS).map((key) => (
                  <option key={key} value={key}>
                    {EXAM_PATTERNS[key].name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 space-y-3"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-semibold shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : "Save Changes"}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/dashboard")}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Cancel
          </motion.button>
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Profile;