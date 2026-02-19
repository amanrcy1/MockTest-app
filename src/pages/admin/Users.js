import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import toast, { messages } from "../../utils/toast";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { ConfirmModal } from "../../components";
import { logAdminAction } from "../../utils/auditLog";
import logger from "../../utils/logger";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { currentUser, userDetails } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null, action: null });

  const isSuperAdmin = userDetails?.isSuperAdmin === true;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setUsers(list);
    } catch (error) {
      logger.error("Error fetching users:", error);
      toast.error(messages.USERS_LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    let result = users;
    
    if (queryText) {
      result = users.filter((user) => {
        const name = user.name?.toLowerCase() || "";
        const email = user.email?.toLowerCase() || "";
        return (
          name.includes(queryText) ||
          email.includes(queryText)
        );
      });
    }
    
    // Sort: super admin always on top, then admins, then regular users
    return [...result].sort((a, b) => {
      if (a.isSuperAdmin && !b.isSuperAdmin) return -1;
      if (!a.isSuperAdmin && b.isSuperAdmin) return 1;
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return 0;
    });
  }, [search, users]);

  // Defense-in-depth: guard against non-admin access even if route protection is bypassed
  if (!userDetails?.isAdmin) return <Navigate to="/dashboard" replace />;

  const toggleAdmin = async (user) => {
    // Only super admin can promote/demote
    if (!isSuperAdmin) {
      toast.error(messages.ADMIN_ONLY);
      return;
    }

    // Prevent self-demotion
    if (user.id === currentUser?.uid && user.isAdmin) {
      toast.error(messages.CANNOT_DEMOTE_SELF);
      return;
    }

    // Prevent demoting super admin (original admin)
    if (user.isSuperAdmin && user.isAdmin) {
      toast.error(messages.CANNOT_DEMOTE_SUPER_ADMIN);
      return;
    }

    // Show confirmation modal
    const action = user.isAdmin ? "demote" : "promote";
    setConfirmModal({ open: true, user, action });
  };

  const handleConfirmToggle = async () => {
    const { user, action } = confirmModal;
    setConfirmModal({ open: false, user: null, action: null });

    if (action === "delete") {
      await handleDeleteUser(user);
      return;
    }

    try {
      setUpdatingId(user.id);
      const newAdminStatus = action === "promote";
      
      await updateDoc(doc(db, "users", user.id), {
        isAdmin: newAdminStatus,
      });
      
      logAdminAction({ adminId: userDetails?.userId, action: action === "promote" ? "promoteUser" : "demoteUser", targetId: user.id });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isAdmin: newAdminStatus } : item,
        ),
      );
      toast.success(action === "promote" ? messages.USER_PROMOTED : messages.USER_DEMOTED);
    } catch (error) {
      logger.error("Error updating user:", error);
      toast.error(messages.USER_UPDATE_FAILED);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUser = async (user) => {
    // Only super admin can delete users
    if (!isSuperAdmin) {
      toast.error(messages.DELETE_ADMIN_ONLY);
      return;
    }

    // Prevent self-deletion
    if (user.id === currentUser?.uid) {
      toast.error(messages.CANNOT_DELETE_SELF);
      return;
    }

    // Prevent deleting super admin
    if (user.isSuperAdmin) {
      toast.error(messages.CANNOT_DELETE_SUPER_ADMIN);
      return;
    }

    // Show confirmation modal
    setConfirmModal({ open: true, user, action: "delete" });
  };

  const handleDeleteUser = async (user) => {
    try {
      setDeletingId(user.id);

      // Delete user's related data from multiple collections
      const collections = [
        "tests",
        "bookmarks",
        "errorReports",
      ];

      // Delete from each collection
      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where("userId", "==", user.id)
        );
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map((docSnap) =>
          deleteDoc(doc(db, collectionName, docSnap.id))
        );
        await Promise.all(deletePromises);
      }

      // Delete email mapping
      if (user.email) {
        const emailKey = user.email.toLowerCase().replace(/[.#$[\]]/g, "_");
        try {
          await deleteDoc(doc(db, "emails", emailKey));
          logger.info("Deleted email mapping:", emailKey);
        } catch (error) {
          logger.error("Error deleting email mapping:", error);
        }
      }

      // Note: Leaderboard entries are stored as snapshots and will show as [Deleted User]
      // They are regenerated weekly and old entries naturally expire
      // We don't delete them to maintain historical leaderboard integrity

      // Delete user document last
      await deleteDoc(doc(db, "users", user.id));

      // Update local state
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      logAdminAction({ adminId: userDetails?.userId, action: "deleteUser", targetId: user.id, details: { email: user.email } });
      toast.success(messages.USER_DELETED);
    } catch (error) {
      logger.error("Error deleting user:", error);
      toast.error(messages.USER_DELETE_FAILED);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              User Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSuperAdmin 
                ? "Manage user roles. You can promote or demote users."
                : "View users. Only super admin can change roles."}
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700 px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Actions</span>
            </div>
            
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="border-t dark:border-gray-700"
              >
                {/* Desktop Row */}
                <div className="hidden md:grid grid-cols-4 gap-4 px-6 py-3 text-sm text-gray-700 dark:text-gray-300 items-center">
                  <span>{user.name || "User"}</span>
                  <span className="truncate">{user.email || "-"}</span>
                  {isSuperAdmin ? (
                    <button
                      onClick={() => toggleAdmin(user)}
                      disabled={updatingId === user.id || user.id === currentUser?.uid || user.isSuperAdmin}
                      className={`px-3 py-1 rounded text-xs font-semibold w-24 ${
                        user.id === currentUser?.uid
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 cursor-not-allowed"
                          : user.isSuperAdmin
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 cursor-not-allowed"
                            : user.isAdmin
                            ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {updatingId === user.id
                      ? "Updating..."
                      : user.id === currentUser?.uid
                        ? "You"
                        : user.isSuperAdmin
                          ? "Protected"
                          : user.isAdmin
                            ? "Demote"
                            : "Promote"}
                  </button>
                ) : (
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    user.isSuperAdmin
                      ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                      : user.isAdmin
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}>
                    {user.isSuperAdmin ? "Super Admin" : user.isAdmin ? "Admin" : "User"}
                  </span>
                )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => deleteUser(user)}
                      disabled={deletingId === user.id || user.id === currentUser?.uid || user.isSuperAdmin}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        user.id === currentUser?.uid || user.isSuperAdmin
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }`}
                      title={
                        user.id === currentUser?.uid
                          ? "Cannot delete yourself"
                          : user.isSuperAdmin
                            ? "Cannot delete super admin"
                            : "Delete user"
                      }
                    >
                      {deletingId === user.id ? (
                        <svg className="animate-spin h-4 w-4 inline" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                
                {/* Mobile Card */}
                <div className="md:hidden p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{user.name || "User"}</p>
                    <div className="flex items-center gap-2">
                      {isSuperAdmin ? (
                        <button
                          onClick={() => toggleAdmin(user)}
                          disabled={updatingId === user.id || user.id === currentUser?.uid || user.isSuperAdmin}
                          className={`px-3 py-1.5 rounded text-xs font-semibold ${
                            user.id === currentUser?.uid
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                              : user.isSuperAdmin
                                ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                                : user.isAdmin
                                  ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {updatingId === user.id ? "..." : user.id === currentUser?.uid ? "You" : user.isSuperAdmin ? "Protected" : user.isAdmin ? "Demote" : "Promote"}
                        </button>
                      ) : (
                        <span className={`px-3 py-1.5 rounded text-xs font-semibold ${
                          user.isSuperAdmin 
                            ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" 
                            : user.isAdmin 
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" 
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}>
                          {user.isSuperAdmin ? "Super Admin" : user.isAdmin ? "Admin" : "User"}
                        </span>
                      )}
                      {isSuperAdmin && (
                        <button
                          onClick={() => deleteUser(user)}
                          disabled={deletingId === user.id || user.id === currentUser?.uid || user.isSuperAdmin}
                          className={`p-2 rounded ${
                            user.id === currentUser?.uid || user.isSuperAdmin
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                              : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                        >
                          {deletingId === user.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null, action: null })}
        onConfirm={handleConfirmToggle}
        title={
          confirmModal.action === "delete"
            ? "Delete User"
            : confirmModal.action === "demote"
              ? "Demote Admin"
              : "Promote to Admin"
        }
        message={
          confirmModal.action === "delete"
            ? `Are you sure you want to permanently delete ${confirmModal.user?.name}? This will delete all their data including tests, bookmarks, and error reports. This action cannot be undone.`
            : confirmModal.action === "demote"
              ? `Are you sure you want to remove admin access from ${confirmModal.user?.name}? They will lose all admin privileges.`
              : `Are you sure you want to promote ${confirmModal.user?.name} to admin? They will have full admin access.`
        }
        confirmText={
          confirmModal.action === "delete"
            ? "Yes, Delete"
            : confirmModal.action === "demote"
              ? "Yes, Demote"
              : "Yes, Promote"
        }
        confirmVariant={
          confirmModal.action === "delete" || confirmModal.action === "demote"
            ? "danger"
            : "primary"
        }
      />
    </div>
  );
};

export default AdminUsers;
