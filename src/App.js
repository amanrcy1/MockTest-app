import { Suspense, lazy } from "react";
import PropTypes from "prop-types";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ErrorBoundary } from "./components";

// Eager load critical pages
import Auth from "./pages/auth/Auth";
import Dashboard from "./pages/user/Dashboard";

// Lazy load other pages for better performance
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AddQuestion = lazy(() => import("./pages/admin/AddQuestion"));
const ManageQuestions = lazy(() => import("./pages/admin/ManageQuestions"));
const BulkUpload = lazy(() => import("./pages/admin/BulkUpload"));
const TestSelection = lazy(() => import("./pages/test/TestSelection"));
const MockTest = lazy(() => import("./pages/test/MockTest"));
const TestResult = lazy(() => import("./pages/test/TestResult"));
const PracticeMode = lazy(() => import("./pages/test/PracticeMode"));
const CustomTestSetup = lazy(() => import("./pages/test/CustomTestSetup"));
const CustomTest = lazy(() => import("./pages/test/CustomTest"));
const Leaderboard = lazy(() => import("./pages/user/Leaderboard"));
const TestHistory = lazy(() => import("./pages/test/TestHistory"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const Bookmarks = lazy(() => import("./pages/user/Bookmarks"));
const AdminErrorReports = lazy(() => import("./pages/admin/ErrorReports"));
const AdminBookmarks = lazy(() => import("./pages/admin/Bookmarks"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Landing = lazy(() => import("./pages/Landing"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-hidden="true"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  return currentUser ? children : <Navigate to="/login" />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { currentUser, userDetails, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  if (!userDetails) {
    return <PageLoader />;
  }
  
  return userDetails.isAdmin ? children : <Navigate to="/dashboard" />;
};

AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  return !currentUser ? children : <Navigate to="/dashboard" />;
};

PublicRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            {/* Skip to main content link for accessibility */}
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />

            <main id="main-content">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <Auth />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/register"
                    element={
                      <PublicRoute>
                        <Auth />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/forgot-password"
                    element={
                      <PublicRoute>
                        <ForgotPassword />
                      </PublicRoute>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test-selection"
                    element={
                      <ProtectedRoute>
                        <TestSelection />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test/mock"
                    element={
                      <ProtectedRoute>
                        <MockTest />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test/result"
                    element={
                      <ProtectedRoute>
                        <TestResult />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test/practice"
                    element={
                      <ProtectedRoute>
                        <PracticeMode />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test/custom-setup"
                    element={
                      <ProtectedRoute>
                        <CustomTestSetup />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test/custom"
                    element={
                      <ProtectedRoute>
                        <CustomTest />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/test/history"
                    element={
                      <ProtectedRoute>
                        <TestHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute>
                        <Leaderboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookmarks"
                    element={
                      <ProtectedRoute>
                        <Bookmarks />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/add-question"
                    element={
                      <AdminRoute>
                        <AddQuestion />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/manage-questions"
                    element={
                      <AdminRoute>
                        <ManageQuestions />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/bulk-upload"
                    element={
                      <AdminRoute>
                        <BulkUpload />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/error-reports"
                    element={
                      <AdminRoute>
                        <AdminErrorReports />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/bookmarks"
                    element={
                      <AdminRoute>
                        <AdminBookmarks />
                      </AdminRoute>
                    }
                  />

                  {/* Default redirect */}
                  <Route path="/" element={
                    <PublicRoute>
                      <Landing />
                    </PublicRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
