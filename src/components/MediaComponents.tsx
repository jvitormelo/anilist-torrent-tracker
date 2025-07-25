import type { AiringNotification, MediaListEntry } from "server";
import { TorrentSection } from "~/components/TorrentSection";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface MediaListCardProps {
  entry: MediaListEntry;
  currentUser?: {
    id: number;
    name: string;
  };
}

interface AnilistNotificationCardProps {
  notification: AiringNotification;
  currentUser?: {
    id: number;
    name: string;
  };
}

interface TorrentDownload {
  _id: string;
  anilistId: number;
  animeName: string;
  episode: number;
  torrentName: string;
  magnetLink: string;
  downloadedAt: number;
  resolution?: string;
  seeders?: number;
  userName: string;
}

interface TorrentDownloadsCardProps {
  download: TorrentDownload;
}

// Utility functions for media cards
const calculateProgressPercentage = (
  progress: number,
  totalEpisodes?: number
) => {
  return totalEpisodes ? (progress / totalEpisodes) * 100 : 0;
};

const getTimeRemaining = (nextAiringEpisode?: { timeUntilAiring: number }) => {
  if (!nextAiringEpisode) return null;

  const timeUntilAiring = nextAiringEpisode.timeUntilAiring;

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

const checkEpisodeAvailability = (
  userProgress: number,
  nextAiringEpisode?: { episode: number }
) => {
  if (!nextAiringEpisode) return true;

  const userNeedsEpisode = userProgress + 1;
  const nextAiringEpisodeNumber = nextAiringEpisode.episode;

  return userNeedsEpisode < nextAiringEpisodeNumber;
};

export function MediaListCard({ entry, currentUser }: MediaListCardProps) {
  const nextEpisode = entry.progress + 1;
  const progressPercentage = calculateProgressPercentage(
    entry.progress,
    entry.media.episodes ?? undefined
  );
  const timeRemaining = getTimeRemaining(
    entry.media.nextAiringEpisode ?? undefined
  );
  const isEpisodeAvailable = checkEpisodeAvailability(
    entry.progress,
    entry.media.nextAiringEpisode ?? undefined
  );

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-3xl shadow-xl hover:shadow-2xl transform transition-all duration-300 overflow-hidden">
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

            <a
              href={`https://anilist.co/anime/${entry.media.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-block pr-24 mb-2"
            >
              <h3 className="font-bold text-xl text-gray-800 hover:text-purple-600 transition-colors duration-200 group-hover:underline decoration-2 decoration-purple-400 underline-offset-2">
                {entry.media.title.userPreferred}
                <span className="ml-2 text-purple-500 group-hover:animate-bounce inline-block">
                  🔗✨
                </span>
              </h3>
            </a>

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
          currentUser={currentUser}
        />
      </CardContent>
    </Card>
  );
}

export function AnilistNotificationCard({
  notification,
  currentUser,
}: AnilistNotificationCardProps) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-3xl shadow-xl hover:shadow-2xl transform transition-all duration-300 overflow-hidden">
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

            <a
              href={`https://anilist.co/anime/${notification.animeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-block pr-24 mb-2"
            >
              <h3 className="font-bold text-xl text-gray-800 hover:text-pink-600 transition-colors duration-200 group-hover:underline decoration-2 decoration-pink-400 underline-offset-2">
                {notification.media.title.english ||
                  notification.media.title.romaji}
                <span className="ml-2 text-pink-500 group-hover:animate-bounce inline-block">
                  🔗✨
                </span>
              </h3>
            </a>

            <div className="flex flex-wrap gap-2 mb-4">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full">
                <p className="text-sm font-semibold text-purple-700">
                  🎬 Episode {notification.episode} aired! ✨
                </p>
              </div>
            </div>
          </div>
        </div>
        <TorrentSection
          searchParams={{
            romajiName: notification.media.title.romaji ?? "",
            englishName: notification.media.title.english ?? "",
            episode: notification.episode,
          }}
          currentUser={currentUser}
        />
      </CardContent>
    </Card>
  );
}

export function TorrentDownloadsCard({ download }: TorrentDownloadsCardProps) {
  const downloadTime = new Date(download.downloadedAt);
  const timeAgo = getTimeAgo(downloadTime);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200 rounded-3xl shadow-xl hover:shadow-2xl transform transition-all duration-300 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0 relative">
            <div className="absolute -top-2 -left-2 text-2xl">📥</div>
            <div className="w-20 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl shadow-lg border-2 border-green-200 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-1">🎬</div>
                <div className="text-xs font-bold text-green-700">EP {download.episode}</div>
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
              {timeAgo}
            </div>

            <div className="pr-24 mb-2">
              <h3 className="font-bold text-xl text-gray-800 mb-1">
                {download.animeName}
              </h3>
              <p className="text-sm text-gray-600 font-medium mb-2">
                Downloaded by <span className="text-green-600 font-semibold">{download.userName}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-semibold border-blue-200 rounded-full px-3 py-1">
                📺 Episode {download.episode}
              </Badge>

              {download.resolution && (
                <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-semibold border-purple-200 rounded-full px-3 py-1">
                  🎥 {download.resolution}
                </Badge>
              )}

              {download.seeders && (
                <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-semibold border-green-200 rounded-full px-3 py-1">
                  🌱 {download.seeders} seeders
                </Badge>
              )}

              <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 font-semibold border-orange-200 rounded-full px-3 py-1">
                📅 {downloadTime.toLocaleDateString()}
              </Badge>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 border-2 border-gray-100">
              <p className="text-xs text-gray-600 font-medium mb-2">Torrent Name:</p>
              <p className="text-sm text-gray-800 truncate" title={download.torrentName}>
                {download.torrentName}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return "Just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}
