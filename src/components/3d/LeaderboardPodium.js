import { memo } from "react";
import PropTypes from "prop-types";
import { getSafePhotoURL } from "../../utils/avatarUtils";

/**
 * Optimized Leaderboard Podium - reduced animations for performance
 */
const LeaderboardPodium = memo(({ topThree = [] }) => {
  if (topThree.length === 0) return null;

  const podiumConfig = [
    { position: 1, height: 120, color: "from-yellow-400 to-yellow-600", medal: <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>, glow: "shadow-yellow-400/50" },
    { position: 0, height: 90, color: "from-gray-300 to-gray-500", medal: <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>, glow: "shadow-gray-400/50" },
    { position: 2, height: 70, color: "from-amber-600 to-amber-800", medal: <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" /><path d="M7 15l-3 7h4l4-4 4 4h4l-3-7" /></svg>, glow: "shadow-amber-400/50" },
  ];

  const displayOrder = [1, 0, 2];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 py-8">
      {displayOrder.map((orderIndex) => {
        const config = podiumConfig[orderIndex];
        const user = topThree[orderIndex];
        if (!user) return null;

        return (
          <div
            key={user.userId || orderIndex}
            className="flex flex-col items-center animate-fade-in"
            style={{ animationDelay: `${orderIndex * 100}ms` }}
          >
            {/* User Avatar & Info */}
            <div className="mb-3 text-center hover:scale-105 transition-transform">
              <div className="relative inline-block">
                <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-lg shadow-lg ${config.glow} overflow-hidden`}>
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                  {getSafePhotoURL(user.photoURL) && (
                    <img
                      src={getSafePhotoURL(user.photoURL)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                </div>
                <span className="absolute -top-1 -right-1">{config.medal}</span>
              </div>
              <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base truncate max-w-[80px] sm:max-w-[100px]">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.score?.toFixed(1)} pts
              </p>
            </div>

            {/* Podium Block */}
            <div
              className={`w-20 sm:w-24 bg-gradient-to-b ${config.color} rounded-t-lg shadow-xl relative overflow-hidden`}
              style={{ height: config.height }}
            >
              <div className="absolute inset-0 bg-white/10 rounded-t-lg" />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-2xl sm:text-3xl font-bold text-white/90">
                  {orderIndex + 1}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

LeaderboardPodium.displayName = "LeaderboardPodium";

LeaderboardPodium.propTypes = {
  topThree: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.string,
      name: PropTypes.string,
      score: PropTypes.number,
    })
  ),
};

export default LeaderboardPodium;
