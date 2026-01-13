import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { ThemeToggle } from "../../components";
import logger from "../../utils/logger";

const AdminDashboard = () => {
  const { userDetails, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalUsers: 0,
    testsTaken: 0,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [questionsSnap, usersSnap, testsSnap] = await Promise.all([
          getDocs(collection(db, "questions")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "tests")),
        ]);

        setStats({
          totalQuestions: questionsSnap.size,
          totalUsers: usersSnap.size,
          testsTaken: testsSnap.size,
        });
      } catch (error) {
        logger.error("Error loading admin stats:", error);
      }
    };

    fetchStats();
  }, []);

  // Defense-in-depth: guard against non-admin access even if route protection is bypassed
  if (!userDetails?.isAdmin) return <Navigate to="/dashboard" replace />;

  const iconMap = {
    add: (
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    ),
    manage: (
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h10M4 18h16"
        />
      </svg>
    ),
    upload: (
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 16V8m0 0l-3 3m3-3l3 3M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"
        />
      </svg>
    ),
    users: (
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1m10-10a4 4 0 11-8 0 4 4 0 018 0m8 11v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
        />
      </svg>
    ),
    reports: (
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
        />
      </svg>
    ),
    bookmarks: (
      <svg
        className="w-12 h-12 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    ),
  };

  const adminCards = [
    {
      title: "Add Questions",
      description: "Add new questions to the question bank",
      icon: "add",
      color: "from-blue-500 to-blue-600",
      route: "/admin/add-question",
    },
    {
      title: "Manage Questions",
      description: "View, edit, and delete existing questions",
      icon: "manage",
      color: "from-green-500 to-green-600",
      route: "/admin/manage-questions",
    },
    {
      title: "Bulk Upload",
      description: "Upload multiple questions via Excel/CSV",
      icon: "upload",
      color: "from-purple-500 to-purple-600",
      route: "/admin/bulk-upload",
    },
    {
      title: "User Management",
      description: "Manage users and permissions",
      icon: "users",
      color: "from-orange-500 to-orange-600",
      route: "/admin/users",
    },
    {
      title: "Error Reports",
      description: "Review reported questions and issues",
      icon: "reports",
      color: "from-red-500 to-red-600",
      route: "/admin/error-reports",
    },
    {
      title: "Bookmarks Review",
      description: "Review saved questions and notes",
      icon: "bookmarks",
      color: "from-teal-500 to-teal-600",
      route: "/admin/bookmarks",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Admin Panel</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">UPSC Mock Test Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              User View
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {userDetails?.name}!
          </h2>
          <p className="text-gray-600">
            Admin Dashboard - Manage your question bank and platform
          </p>
        </div>

        {/* Admin Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.route)}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
            >
              <div
                className={`bg-gradient-to-r ${card.color} p-6 text-white text-center`}
              >
                <div className="text-5xl mb-2">
                  {iconMap[card.icon] || null}
                </div>
                <h3 className="text-xl font-bold">{card.title}</h3>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm text-center">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Questions</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.totalQuestions}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tests Taken</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.testsTaken}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg
                  className="w-8 h-8 text-purple-600"
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
