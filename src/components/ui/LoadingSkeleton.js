import PropTypes from 'prop-types';

/**
 * Enhanced Skeleton loading components with shimmer effect
 * Provides better perceived performance across the app
 */

// Base shimmer animation class - add to index.css or use inline
const shimmerClass =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent';

// Skeleton base component with shimmer
const SkeletonBox = ({ className = '', rounded = 'rounded' }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 ${rounded} ${shimmerClass} ${className}`} />
);

SkeletonBox.propTypes = {
  className: PropTypes.string,
  rounded: PropTypes.string,
};

// Dashboard Stats Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    {/* Stats Cards */}
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2 ${shimmerClass}`}
            />
            <div className={`h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1 ${shimmerClass}`} />
            <div className={`h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
          </div>
        </div>
      ))}
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className={`h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl ${shimmerClass}`} />
      ))}
    </div>

    {/* Quick Links */}
    <div className="space-y-3">
      <div className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-700"
        >
          <div className={`w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 ${shimmerClass}`} />
            <div className={`h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 ${shimmerClass}`} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Question Card Skeleton
export const QuestionSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 md:p-6 animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-center mb-5">
      <div className={`h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />
      <div className={`h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />
    </div>

    {/* Question text */}
    <div className="space-y-3 mb-6">
      <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-full ${shimmerClass}`} />
      <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 ${shimmerClass}`} />
      <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 ${shimmerClass}`} />
    </div>

    {/* Options */}
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`h-14 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
      ))}
    </div>

    {/* Footer */}
    <div className="flex justify-between mt-6">
      <div className={`h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
      <div className={`h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
    </div>
  </div>
);

// Card Skeleton
export const CardSkeleton = ({ lines = 3 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 animate-pulse border border-gray-100 dark:border-gray-700">
    <div className={`h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 ${shimmerClass}`} />
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  </div>
);

CardSkeleton.propTypes = {
  lines: PropTypes.number,
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1 ${shimmerClass}`}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0 flex gap-4"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1 ${shimmerClass}`}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  cols: PropTypes.number,
};

// Chart Skeleton
export const ChartSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 animate-pulse border border-gray-100 dark:border-gray-700">
    <div className={`h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6 ${shimmerClass}`} />
    <div className={`h-48 md:h-64 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
  </div>
);

// List Skeleton
export const ListSkeleton = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 animate-pulse border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 ${shimmerClass}`}
          />
          <div className="flex-1 space-y-2">
            <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 ${shimmerClass}`} />
            <div className={`h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 ${shimmerClass}`} />
          </div>
          <div className={`h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />
        </div>
      </div>
    ))}
  </div>
);

ListSkeleton.propTypes = {
  items: PropTypes.number,
};

// Test History Skeleton
export const TestHistorySkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-3">
          <div className={`h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
          <div className={`h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full ${shimmerClass}`} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((j) => (
            <div key={j} className="text-center">
              <div
                className={`h-6 w-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded mb-1 ${shimmerClass}`}
              />
              <div
                className={`h-3 w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
              />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Profile Skeleton
export const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6">
    {/* Avatar */}
    <div className="flex flex-col items-center">
      <div className={`w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 ${shimmerClass}`} />
      <div className={`h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${shimmerClass}`} />
      <div className={`h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700"
        >
          <div
            className={`h-8 w-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded mb-2 ${shimmerClass}`}
          />
          <div
            className={`h-3 w-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`}
          />
        </div>
      ))}
    </div>

    {/* Form fields */}
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
        >
          <div className={`h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${shimmerClass}`} />
          <div className={`h-10 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />
        </div>
      ))}
    </div>
  </div>
);

// Leaderboard Skeleton
export const LeaderboardSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {/* Top 3 Podium */}
    <div className="flex justify-center items-end gap-2 mb-6 h-32">
      <div className={`w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
      <div className={`w-24 h-28 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
      <div className={`w-20 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
    </div>

    {/* List */}
    {[4, 5, 6, 7, 8].map((i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-700"
      >
        <div className={`w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full ${shimmerClass}`} />
        <div className={`w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full ${shimmerClass}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 ${shimmerClass}`} />
          <div className={`h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 ${shimmerClass}`} />
        </div>
        <div className={`h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded ${shimmerClass}`} />
      </div>
    ))}
  </div>
);

// Page Loading Skeleton (Full page)
export const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 animate-pulse">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div className={`h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg ${shimmerClass}`} />
      <div className={`h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full ${shimmerClass}`} />
    </div>

    {/* Content */}
    <div className="space-y-4">
      <div className={`h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl ${shimmerClass}`} />
      <div className="grid grid-cols-2 gap-4">
        <div className={`h-24 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
        <div className={`h-24 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
      </div>
      <div className={`h-32 bg-gray-200 dark:bg-gray-700 rounded-xl ${shimmerClass}`} />
    </div>
  </div>
);

const LoadingSkeleton = {
  DashboardSkeleton,
  QuestionSkeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  ListSkeleton,
  TestHistorySkeleton,
  ProfileSkeleton,
  LeaderboardSkeleton,
  PageSkeleton,
};

export default LoadingSkeleton;
