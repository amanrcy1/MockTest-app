import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';

// Static nav items - defined outside component to prevent recreation
const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home' },
  { path: '/test-selection', label: 'Tests' },
  { path: '/leaderboard', label: 'Rank' },
  { path: '/bookmarks', label: 'Saved' },
  { path: '/profile', label: 'Profile' },
];

// Icon components - memoized
const HomeIcon = memo(function HomeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
});

const TestsIcon = memo(function TestsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
});

const RankIcon = memo(function RankIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
});

const SavedIcon = memo(function SavedIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
});

const ProfileIcon = memo(function ProfileIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
});

const ICONS = {
  '/dashboard': HomeIcon,
  '/test-selection': TestsIcon,
  '/leaderboard': RankIcon,
  '/bookmarks': SavedIcon,
  '/profile': ProfileIcon,
};

// Individual nav item - memoized
const NavItem = memo(({ item }) => {
  const Icon = ICONS[item.path];

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `relative flex flex-col items-center justify-center flex-1 h-full py-1 min-h-11 active:scale-90 transition-transform ${
          isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
        }`
      }
      aria-label={item.label}
    >
      {({ isActive }) => (
        <>
          {isActive && <div className="absolute -top-1 w-10 h-1 rounded-full bg-blue-500" />}
          <div
            className={`relative p-2 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg -translate-y-1'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon />
          </div>
          <span
            className={`text-[10px] mt-1 font-medium ${
              isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
});

NavItem.displayName = 'NavItem';
NavItem.propTypes = {
  item: PropTypes.shape({
    path: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 * Optimized Mobile Bottom Navigation
 */
const BottomNav = memo(() => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50" />
      <div className="relative flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
