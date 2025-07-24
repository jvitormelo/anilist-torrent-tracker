import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";
import {
  useMutation as convexUseMutation,
  useQuery as convexUseQuery,
} from "convex/react";
import { Github } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getCurrentlyWatching,
  getCurrentUser,
  getNotificationList,
  type MediaListEntry
} from "server";
import { AuthenticationCard } from "~/components/AuthenticationCard";
import { GlobalChat } from "~/components/GlobalChat";
import { AnimeLoading, FullPageLoading } from "~/components/KawaiiLoading";
import { MediaListCard, AnilistNotificationCard } from "~/components/MediaComponents";
import { OnlineUsersCounter } from "~/components/OnlineUsersCounter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: Home,
});

// ============================================================================
// Query Options
// ============================================================================

const useQueryOptions = queryOptions({
  queryKey: ["user"],
  queryFn: async () => {
    const accessToken = localStorage.getItem("anilist_token");
    if (!accessToken) {
      throw new Error("No access token");
    }
    const response = await getCurrentUser({
      headers: getHeaders(),
    });
    return response.data.Viewer;
  },
  retry: false,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const useMediaListQueryOptions = (userId: number, activeTab: string) =>
  queryOptions({
    queryKey: ["mediaList"],
    queryFn: async () => {
      const mediaResponse = await getCurrentlyWatching({
        data: {
          userId: userId ?? 0,
          perPage: 25,
        },
        headers: getHeaders(),
      });

      return mediaResponse.data.Page.mediaList;
    },
    enabled: !!userId && activeTab === "watching",
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

const useNotificationsQueryOptions = (userId: number, activeTab: string) =>
  queryOptions({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await getNotificationList({ headers: getHeaders() });
      return response.data.Page.notifications;
    },
    enabled: !!userId && activeTab === "notifications",
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

// ============================================================================
// Utility Functions
// ============================================================================

function getHeaders() {
  const accessToken = localStorage.getItem("anilist_token") ?? "";
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

// Media list filtering and sorting logic
const filterAndSortMediaList = (mediaList: MediaListEntry[], showOnlyAvailable: boolean) => {
  return mediaList
    ?.filter((entry) => {
      if (!showOnlyAvailable) return true;

      const nextEpisode = entry.media.nextAiringEpisode;
      if (!nextEpisode) return true; // Show if no next episode info

      // Check if the episode the user needs (current progress + 1) is available
      const userNeedsEpisode = entry.progress + 1;
      const nextAiringEpisodeNumber = nextEpisode.episode;

      // If the episode user needs is before the next airing episode, it's available
      return userNeedsEpisode < nextAiringEpisodeNumber;
    })
    .sort((a, b) => {
      // Sort by next airing date (earliest first)
      const aNextAiring = a.media.nextAiringEpisode?.airingAt || 0;
      const bNextAiring = b.media.nextAiringEpisode?.airingAt || 0;

      // If both have next airing dates, sort by earliest
      if (aNextAiring && bNextAiring) {
        return aNextAiring - bNextAiring;
      }

      // If only one has next airing date, prioritize the one with date
      if (aNextAiring && !bNextAiring) return -1;
      if (!aNextAiring && bNextAiring) return 1;

      // If neither has next airing date, maintain original order
      return 0;
    }) || [];
};

// Group anime by day of the week
const groupAnimeByDay = (mediaList: MediaListEntry[]) => {
  return mediaList.reduce(
    (groups, entry) => {
      const nextAiring = entry.media.nextAiringEpisode;
      if (!nextAiring) {
        // If no next airing info, put in "Unknown" group
        if (!groups.unknown) groups.unknown = [];
        groups.unknown.push(entry);
        return groups;
      }

      const airingDate = new Date(nextAiring.airingAt * 1000);
      const dayName = airingDate.toLocaleDateString("en-US", {
        weekday: "long",
      });

      if (!groups[dayName]) groups[dayName] = [];
      groups[dayName].push(entry);
      return groups;
    },
    {} as Record<string, MediaListEntry[]>
  );
};

// ============================================================================
// Constants
// ============================================================================

const DAY_COLORS = {
  Monday: "from-blue-100 to-cyan-100 border-blue-200",
  Tuesday: "from-purple-100 to-pink-100 border-purple-200",
  Wednesday: "from-green-100 to-emerald-100 border-green-200",
  Thursday: "from-orange-100 to-yellow-100 border-orange-200",
  Friday: "from-red-100 to-pink-100 border-red-200",
  Saturday: "from-indigo-100 to-purple-100 border-indigo-200",
  Sunday: "from-pink-100 to-rose-100 border-pink-200",
  unknown: "from-gray-100 to-slate-100 border-gray-200",
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "unknown",
];

// ============================================================================
// Custom Hooks
// ============================================================================

const useUserActivity = (user: any) => {
  const setLastActive = convexUseMutation(api.myFunctions.setLastActive);

  useEffect(() => {
    if (user?.id) {
      setLastActive({ anilistId: user.id, name: user.name });
    }
  }, [user, setLastActive]);

  // Update user activity every minute
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      setLastActive({ anilistId: user.id, name: user.name });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user?.id, user?.name, setLastActive]);
};

const useHomeState = () => {
  const [activeTab, setActiveTab] = useState("watching");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => {
    // Get current day name
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return { [today]: true };
  });
  const [viewMode, setViewMode] = useState<"grouped" | "list">("list");

  return {
    activeTab,
    setActiveTab,
    showOnlyAvailable,
    setShowOnlyAvailable,
    expandedDays,
    setExpandedDays,
    viewMode,
    setViewMode,
  };
};

// ============================================================================
// Main Component Sections
// ============================================================================

interface MainHeaderProps {
  userName?: string;
}

function MainHeader({ userName }: MainHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-4 mb-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
          🌸 AniList Torrent Tracker ✨
        </h1>
        <a
          href="https://github.com/jvitormelo/anilist-torrent-tracker"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-gray-800 hover:scale-110 transition-all duration-200"
          title="View on GitHub"
          aria-label="View project on GitHub"
        >
          <Github className="w-8 h-8" />
        </a>
      </div>
      <p className="text-lg text-gray-600 font-medium mb-2">
        (´｡• ᵕ •｡`) ♡ Welcome back, {userName}! ♡
      </p>
    </div>
  );
}

interface FilterControlsProps {
  showOnlyAvailable: boolean;
  setShowOnlyAvailable: (value: boolean) => void;
  viewMode: "grouped" | "list";
  setViewMode: (value: "grouped" | "list") => void;
}

function FilterControls({
  showOnlyAvailable,
  setShowOnlyAvailable,
  viewMode,
  setViewMode,
}: FilterControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border-2 border-purple-100">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showOnlyAvailable}
          onChange={(e) => setShowOnlyAvailable(e.target.checked)}
          className="w-4 h-4 text-purple-600 bg-gray-100 border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
        />
        <span className="text-sm font-medium text-gray-700">
          🎯 Show only available episodes
        </span>
      </label>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">📊 View:</span>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as "grouped" | "list")}
          className="text-sm bg-white border-2 border-purple-200 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
        >
          <option value="grouped">📅 Grouped by Day</option>
          <option value="list">📋 Simple List</option>
        </select>
      </div>

      {!showOnlyAvailable && (
        <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded-full">
          Showing all episodes
        </span>
      )}
    </div>
  );
}

interface DayGroupProps {
  day: string;
  animeList: MediaListEntry[];
  isExpanded: boolean;
  onToggle: () => void;
}

function DayGroup({ day, animeList, isExpanded, onToggle }: DayGroupProps) {
  const dayColor = DAY_COLORS[day as keyof typeof DAY_COLORS];

  return (
    <div className="space-y-4">
      <button
        type="button"
        className={`w-full bg-gradient-to-r ${dayColor} rounded-2xl p-4 border-2 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-left`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`day-content-${day}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg transition-transform duration-200 hover:scale-110">
              {isExpanded ? "📂" : "📁"}
            </span>
            <h3 className="text-xl font-bold text-gray-800">
              {day === "unknown" ? "📺 No Airing Info" : `📅 ${day}`}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 bg-white/60 px-3 py-1 rounded-full">
              {animeList.length} anime{animeList.length !== 1 ? "s" : ""}
            </span>
            <span className="text-lg transition-transform duration-200">
              {isExpanded ? "🔽" : "▶️"}
            </span>
          </div>
        </div>
      </button>

      {/* Anime Cards for this day */}
      {isExpanded && (
        <div className="space-y-4 ml-4 animate-in slide-in-from-top-2 duration-300">
          {animeList.map((entry) => (
            <MediaListCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function Home() {
  const {
    activeTab,
    setActiveTab,
    showOnlyAvailable,
    setShowOnlyAvailable,
    expandedDays,
    setExpandedDays,
    viewMode,
    setViewMode,
  } = useHomeState();

  const onlineUsersCount = convexUseQuery(api.myFunctions.countOnlineUsers);

  // Check authentication using useQuery
  const {
    data: user,
    isLoading: isCheckingAuth,
    error: authError,
  } = useQuery(useQueryOptions);

  // Handle user activity tracking
  useUserActivity(user);

  // Fetch notifications
  const { data: notificationsData, isLoading: isLoadingNotifications } =
    useQuery(useNotificationsQueryOptions(user?.id ?? 0, activeTab));

  // Fetch media list
  const { data: mediaListData, isLoading: isLoadingMediaList } = useQuery(
    useMediaListQueryOptions(user?.id ?? 0, activeTab)
  );

  // Process media list data
  const filteredMediaList = filterAndSortMediaList(mediaListData || [], showOnlyAvailable);
  const groupedByDay = groupAnimeByDay(filteredMediaList);

  if (isCheckingAuth) {
    return <FullPageLoading message="Checking authentication... ✨" />;
  }

  if (!user || authError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 flex items-center justify-center">
        <OnlineUsersCounter count={onlineUsersCount} />
        <AuthenticationCard />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8">
      <OnlineUsersCounter count={onlineUsersCount} />

      <div className="max-w-4xl mx-auto">
        <MainHeader userName={user?.name} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/80 backdrop-blur-sm">
            <TabsTrigger
              value="watching"
              className="rounded-xl data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-purple-400 data-[state=active]:!to-blue-400 data-[state=active]:!text-white data-[state=active]:!shadow-md data-[state=active]:!border-transparent font-semibold transition-all duration-200 hover:bg-purple-50"
            >
              📺 Currently Watching
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="rounded-xl data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-pink-400 data-[state=active]:!to-purple-400 data-[state=active]:!text-white data-[state=active]:!shadow-md data-[state=active]:!border-transparent font-semibold transition-all duration-200 hover:bg-pink-50"
            >
              🔔 Notifications
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {isLoadingNotifications ? (
              <AnimeLoading />
            ) : notificationsData && notificationsData.length > 0 ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    🔔 Recent Notifications 🔔
                  </h2>
                  <p className="text-gray-600">
                    Episodes that recently aired ♡ ({notificationsData.length}{" "}
                    notifications)
                  </p>
                </div>
                {notificationsData.map((notification) => (
                  <AnilistNotificationCard
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">😴</div>
                <p className="text-lg text-gray-600">No recent notifications</p>
              </div>
            )}
          </TabsContent>

          {/* Watching Tab */}
          <TabsContent value="watching" className="space-y-6">
            {isLoadingMediaList ? (
              <AnimeLoading />
            ) : mediaListData && mediaListData.length > 0 ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    📺 Currently Watching 📺
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Your ongoing anime series ♡ ({filteredMediaList.length} of{" "}
                    {mediaListData.length} series)
                  </p>

                  <FilterControls
                    showOnlyAvailable={showOnlyAvailable}
                    setShowOnlyAvailable={setShowOnlyAvailable}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                  />
                </div>

                {filteredMediaList.length > 0 ? (
                  viewMode === "grouped" ? (
                    <div className="space-y-8">
                      {DAY_ORDER
                        .filter(
                          (day) =>
                            groupedByDay[day] && groupedByDay[day].length > 0
                        )
                        .map((day) => (
                          <DayGroup
                            key={day}
                            day={day}
                            animeList={groupedByDay[day]}
                            isExpanded={expandedDays[day] || false}
                            onToggle={() =>
                              setExpandedDays((prev) => ({
                                ...prev,
                                [day]: !prev[day],
                              }))
                            }
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredMediaList.map((entry) => (
                        <MediaListCard key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">⏰</div>
                    <p className="text-lg text-gray-600">
                      No episodes available right now!
                      {!showOnlyAvailable && " Try enabling the filter above."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-lg text-gray-600">
                  No anime in your watching list
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Global Chat Component */}
      <GlobalChat
        currentUser={user ? { id: user.id, name: user.name } : undefined}
      />
    </main>
  );
}
