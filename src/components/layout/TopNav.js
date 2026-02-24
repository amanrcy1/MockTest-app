import { memo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ui/ThemeToggle";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Home" },
  { path: "/test-selection", label: "Tests" },
  { path: "/leaderboard", label: "Rank" },
  { path: "/bookmarks", label: "Saved" },
  { path: "/profile", label: "Profile" },
];

const TopNav = memo(() => {
  const navigate = useNavigate();
  const { userDetails } = useAuth();

  return (
    <nav className="hidden md:block sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <span className="inline-flex items-center gap-2">
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {userDetails?.isAdmin && (
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="px-4 py-2 min-h-11 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-colors"
              >
                Admin
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
});

TopNav.displayName = "TopNav";

export default TopNav;
