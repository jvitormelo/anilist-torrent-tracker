import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useState } from "react";
import {
  type AiringNotification,
  getCurrentlyWatching,
  getCurrentUser,
  getNotificationList,
  type MediaListEntry,
  scrapNyaa,
  type TorrentResult,
} from "server";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [activeTab, setActiveTab] = useState("watching");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(
    () => {
      // Get current day name
      const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
      return { [today]: true };
    }
  );
  const [viewMode, setViewMode] = useState<"grouped" | "list">("list");

  // Check authentication using useQuery
  const {
    data: user,
    isLoading: isCheckingAuth,
    error: authError,
  } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const accessToken = localStorage.getItem("anilist_token");
      if (!accessToken) {
        throw new Error("No access token");
      }
      const response = await getCurrentUser({
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data.Viewer;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: isLoadingNotifications } =
    useQuery({
      queryKey: ["notifications"],
      queryFn: async () => {
        const accessToken = localStorage.getItem("anilist_token") ?? "";

        const response = await getNotificationList({
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data.Page.notifications;
      },
      enabled: !!user && activeTab === "notifications",
      staleTime: 2 * 60 * 1000, // 2 minutes
    });

  // Fetch media list
  const { data: mediaListData, isLoading: isLoadingMediaList } = useQuery({
    queryKey: ["mediaList"],
    queryFn: async () => {
      const accessToken = localStorage.getItem("anilist_token") ?? "";

      const mediaResponse = await getCurrentlyWatching({
        data: {
          accessToken,
          userId: user?.id ?? 0,
          perPage: 25,
        },
      });

      return mediaResponse.data.Page.mediaList;
    },
    enabled: !!user?.id && activeTab === "watching",
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter and sort media list based on availability and next airing date
  const filteredMediaList =
    mediaListData
      ?.filter((entry) => {
        if (!showOnlyAvailable) return true;

        const nextEpisode = entry.media.nextAiringEpisode;
        if (!nextEpisode) return true; // Show if no next episode info

        // Check if the episode the user needs (current progress + 1) is available
        // The nextAiringEpisode is the episode that will air next, not necessarily the one user needs
        const userNeedsEpisode = entry.progress + 1;
        const nextAiringEpisodeNumber = nextEpisode.episode;

        // If the episode user needs is before or equal to the next airing episode, it's available
        // (because episodes are sequential, so if next airing is EP5, then EP4 is already available)
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

  // Group anime by day of the week
  const groupedByDay = filteredMediaList.reduce(
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

  // Define day colors and order
  const dayColors = {
    Monday: "from-blue-100 to-cyan-100 border-blue-200",
    Tuesday: "from-purple-100 to-pink-100 border-purple-200",
    Wednesday: "from-green-100 to-emerald-100 border-green-200",
    Thursday: "from-orange-100 to-yellow-100 border-orange-200",
    Friday: "from-red-100 to-pink-100 border-red-200",
    Saturday: "from-indigo-100 to-purple-100 border-indigo-200",
    Sunday: "from-pink-100 to-rose-100 border-pink-200",
    unknown: "from-gray-100 to-slate-100 border-gray-200",
  };

  const dayOrder = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
    "unknown",
  ];

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌸</div>
          <p className="text-lg text-gray-600 font-medium">
            Checking authentication... ✨
          </p>
        </div>
      </main>
    );
  }

  if (!user || authError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          {/* Kawaii Header */}
          <div className="mb-12">
            <div className="text-8xl mb-6">🌸✨🌸</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
              🌸 AniList Torrent Tracker ✨
            </h1>
            <p className="text-lg text-gray-600 font-medium mb-4">
              (´｡• ᵕ •｡`) ♡ Your ultimate anime companion! ♡
            </p>
            <p className="text-sm text-gray-500 max-w-2xl mx-auto mb-8">
              Connect with AniList to track your anime progress, get real-time
              notifications, and find torrents for new episodes instantly. Never
              miss your favorite shows again! 🎬📺
            </p>
          </div>

          {/* Beautiful Sign In Card */}
          <Card className="bg-white/90 backdrop-blur-sm border-2 border-pink-200 rounded-3xl shadow-2xl overflow-hidden">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🎀</div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  Welcome Back! ♡
                </h2>
                <p className="text-gray-600">
                  Sign in with AniList to track your anime and find torrents!
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🔔</span>
                    <span className="font-semibold text-purple-700">
                      Notifications
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Get notified when new episodes air
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">📺</span>
                    <span className="font-semibold text-blue-700">
                      Watch Progress
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Track your currently watching anime
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🔍</span>
                    <span className="font-semibold text-green-700">
                      Find Torrents
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Instantly search for anime torrents
                  </p>
                </div>
              </div>

              <Button
                asChild
                className="w-full mt-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform  transition-all duration-300 text-lg"
              >
                <a
                  href={`https://anilist.co/api/v2/oauth/authorize?client_id=${import.meta.env.VITE_ANILIST_CLIENT_ID}&response_type=token`}
                >
                  💖 Sign in with AniList 💖
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Kawaii Header */}
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
            (´｡• ᵕ •｡`) ♡ Welcome back, {user?.name}! ♡
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/80 backdrop-blur-sm ">
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

          <TabsContent value="notifications" className="space-y-6">
            {isLoadingNotifications ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🌸</div>
                <p className="text-lg text-gray-600">
                  Loading notifications... ✨
                </p>
              </div>
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

          <TabsContent value="watching" className="space-y-6">
            {isLoadingMediaList ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📺</div>
                <p className="text-lg text-gray-600">
                  Loading your anime list... ✨
                </p>
              </div>
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

                  {/* Filter and View Controls */}
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
                      <span className="text-sm font-medium text-gray-700">
                        📊 View:
                      </span>
                      <select
                        value={viewMode}
                        onChange={(e) =>
                          setViewMode(e.target.value as "grouped" | "list")
                        }
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
                </div>

                {filteredMediaList.length > 0 ? (
                  viewMode === "grouped" ? (
                    <div className="space-y-8">
                      {dayOrder
                        .filter(
                          (day) =>
                            groupedByDay[day] && groupedByDay[day].length > 0
                        )
                        .map((day) => (
                          <div key={day} className="space-y-4">
                            {/* Day Header */}
                            <button
                              type="button"
                              className={`w-full bg-gradient-to-r ${dayColors[day as keyof typeof dayColors]} rounded-2xl p-4 border-2 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-left`}
                              onClick={() =>
                                setExpandedDays((prev) => ({
                                  ...prev,
                                  [day]: !prev[day],
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setExpandedDays((prev) => ({
                                    ...prev,
                                    [day]: !prev[day],
                                  }));
                                }
                              }}
                              aria-expanded={expandedDays[day]}
                              aria-controls={`day-content-${day}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg transition-transform duration-200 hover:scale-110">
                                    {expandedDays[day] ? "📂" : "📁"}
                                  </span>
                                  <h3 className="text-xl font-bold text-gray-800">
                                    {day === "unknown"
                                      ? "📺 No Airing Info"
                                      : `📅 ${day}`}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-600 bg-white/60 px-3 py-1 rounded-full">
                                    {groupedByDay[day].length} anime
                                    {groupedByDay[day].length !== 1 ? "s" : ""}
                                  </span>
                                  <span className="text-lg transition-transform duration-200">
                                    {expandedDays[day] ? "🔽" : "▶️"}
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Anime Cards for this day */}
                            {expandedDays[day] && (
                              <div className="space-y-4 ml-4 animate-in slide-in-from-top-2 duration-300">
                                {groupedByDay[day].map((entry) => (
                                  <MediaListCard key={entry.id} entry={entry} />
                                ))}
                              </div>
                            )}
                          </div>
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
    </main>
  );
}

interface TorrentSectionProps {
  searchParams: {
    romajiName: string;
    englishName?: string;
    episode: number;
  };
  buttonText?: string;
}

function TorrentSection({
  searchParams,
  buttonText = "🔎 Find Torrents",
}: TorrentSectionProps) {
  const [showTorrents, setShowTorrents] = useState(false);
  const [torrents, setTorrents] = useState<TorrentResult[]>([]);

  const getLinkMutation = useMutation({
    mutationFn: scrapNyaa,
    onSuccess: (data) => {
      setTorrents(data);
      setShowTorrents(true);
    },
  });

  return (
    <>
      <div className="flex gap-3 mt-6">
        <Button
          onClick={() => {
            getLinkMutation.mutate({
              data: searchParams,
            });
          }}
          disabled={getLinkMutation.isPending}
          className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-200"
        >
          {getLinkMutation.isPending ? "🔍 Searching..." : buttonText}
        </Button>

        {torrents.length > 0 && (
          <Button
            onClick={() => setShowTorrents(!showTorrents)}
            variant="secondary"
            className="bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 text-blue-700 font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-200 border-2 border-blue-200"
          >
            {showTorrents ? "🙈 Hide" : "👀 Show"} Torrents ({torrents.length})
            ✨
          </Button>
        )}
      </div>

      {/* Toggleable Torrent Results */}
      {showTorrents && torrents.length > 0 && (
        <>
          <Separator className="my-6 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 h-0.5" />
          <div>
            <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <span>🌈</span> Available Torrents <span>🌈</span>
            </h4>

            <div className="space-y-3 pr-4">
              {torrents.map((torrent) => (
                <TorrentItem
                  key={`${torrent.name}-${torrent.date.getTime()}`}
                  torrent={torrent}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MediaListCard({ entry }: { entry: MediaListEntry }) {
  const nextEpisode = entry.progress + 1;
  const progressPercentage = entry.media.episodes
    ? (entry.progress / entry.media.episodes) * 100
    : 0;

  // Calculate time remaining for next episode
  const getTimeRemaining = () => {
    const nextAiring = entry.media.nextAiringEpisode;
    if (!nextAiring) return null;

    const timeUntilAiring = nextAiring.timeUntilAiring;

    if (timeUntilAiring <= 0) return "Available now!";

    const days = Math.floor(timeUntilAiring / (24 * 60 * 60));
    const hours = Math.floor((timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((timeUntilAiring % (60 * 60)) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const timeRemaining = getTimeRemaining();

  // Check if the episode the user needs is available
  const userNeedsEpisode = entry.progress + 1;
  const nextAiringEpisode = entry.media.nextAiringEpisode;
  const isEpisodeAvailable = nextAiringEpisode
    ? userNeedsEpisode < nextAiringEpisode.episode
    : true;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-3xl shadow-xl hover:shadow-2xl transform  transition-all duration-300 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0 relative">
            <div className="absolute -top-2 -left-2 text-2xl">✨</div>
            <img
              src={entry.media.coverImage.large}
              alt={entry.media.title.userPreferred}
              className="w-20 h-24 object-cover rounded-2xl shadow-lg border-2 border-purple-200"
            />
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
              {entry.status}
            </div>

            <h3 className="font-bold text-xl text-gray-800 mb-2 pr-24">
              {entry.media.title.userPreferred}
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1 rounded-full">
                <p className="text-sm font-semibold text-blue-700">
                  📺 Episode {entry.progress}
                  {entry.media.episodes ? `/${entry.media.episodes}` : ""}
                </p>
              </div>

              {entry.media.nextAiringEpisode && (
                <div
                  className={`px-3 py-1 rounded-full ${
                    isEpisodeAvailable
                      ? "bg-gradient-to-r from-green-100 to-emerald-100"
                      : "bg-gradient-to-r from-orange-100 to-yellow-100"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      isEpisodeAvailable ? "text-green-700" : "text-orange-700"
                    }`}
                  >
                    ⏰ Next: EP {entry.media.nextAiringEpisode.episode}
                    {timeRemaining && (
                      <span className="ml-1">
                        {isEpisodeAvailable
                          ? " (Available!)"
                          : ` (${timeRemaining})`}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {entry.score > 0 && (
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-1 rounded-full">
                  <p className="text-sm font-semibold text-orange-700">
                    ⭐ {entry.score}/10
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {entry.media.episodes && (
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-400 to-pink-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {progressPercentage.toFixed(1)}% complete
                </p>
              </div>
            )}
          </div>
        </div>

        <TorrentSection
          searchParams={{
            romajiName: entry.media.title.userPreferred,
            episode: nextEpisode,
          }}
          buttonText={`🔎 Find EP ${nextEpisode}`}
        />
      </CardContent>
    </Card>
  );
}

function AnilistNotificationCard({
  notification,
}: {
  notification: AiringNotification;
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-3xl shadow-xl hover:shadow-2xl transform  transition-all duration-300 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0 relative">
            <div className="absolute -top-2 -left-2 text-2xl">✨</div>
            <img
              src={notification.media.coverImage.medium}
              alt={
                notification.media.title.english ||
                notification.media.title.romaji ||
                "Anime"
              }
              className="w-20 h-24 object-cover rounded-2xl shadow-lg border-2 border-pink-200"
            />
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-100 to-purple-100 px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
              {new Date(notification.createdAt * 1000).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <h3 className="font-bold text-xl text-gray-800 mb-2 pr-24">
              {notification.media.title.english ||
                notification.media.title.romaji}
            </h3>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full inline-block mb-4">
              <p className="text-sm font-semibold text-purple-700">
                🎬 Episode {notification.episode} aired! ✨
              </p>
            </div>
          </div>
        </div>
        <TorrentSection
          searchParams={{
            romajiName: notification.media.title.romaji ?? "",
            englishName: notification.media.title.english ?? "",
            episode: notification.episode,
          }}
        />
      </CardContent>
    </Card>
  );
}

function TorrentItem({ torrent }: { torrent: TorrentResult }) {
  return (
    <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-100 rounded-2xl hover:shadow-lg transition-all duration-200 ">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-1 min-w-0 w-full sm:max-w-[calc(100%-140px)]">
            <h5
              title={torrent.name}
              className="font-semibold text-sm text-gray-800 truncate mb-2"
            >
              {torrent.name}
            </h5>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-semibold border-green-200 rounded-full px-3 py-1"
              >
                🌱 {torrent.seeders} seeders
              </Badge>
              {torrent.resolution && (
                <Badge
                  variant="outline"
                  className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-semibold border-blue-200 rounded-full px-3 py-1"
                >
                  📺 {torrent.resolution}
                </Badge>
              )}
              {torrent.episode && (
                <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-semibold border-purple-200 rounded-full px-3 py-1">
                  🎬 EP {torrent.episode}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 font-semibold border-orange-200 rounded-full px-3 py-1"
              >
                📅 {torrent.date.toLocaleDateString()}
              </Badge>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 items-stretch sm:items-end flex-shrink-0 w-full sm:w-[120px]">
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transformtransition-all duration-200 w-full"
            >
              <a href={torrent.magnetLink}>💾 Download</a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(torrent.magnetLink);
                toast.success("Magnet link copied to clipboard! 📋", {
                  description: "You can now paste it in your torrent client",
                  duration: 3000,
                });
              }}
              className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-gray-200 w-full"
            >
              📋 Copy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
