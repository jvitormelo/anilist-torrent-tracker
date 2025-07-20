import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  type AiringNotification,
  getNotificationList,
  scrapNyaa,
  type TorrentResult,
} from "server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [notifications, setNotifications] = useState<AiringNotification[]>([]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Kawaii Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            ✨ Kawaii Anime Tracker ✨
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            (´｡• ᵕ •｡`) ♡ Find your favorite anime episodes! ♡
          </p>
        </div>

        <div className="flex flex-col gap-8 items-center">
          <Button
            className="bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            onClick={() => {
              getNotificationList({
                data: {
                  accessToken: localStorage.getItem("anilist_token") ?? "",
                },
              }).then((data) => {
                setNotifications(data.data.Page.notifications);
              });
            }}
          >
            🌸 Get My Anime List 🌸
          </Button>

          <Button
            asChild
            className="bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <a
              href={`https://anilist.co/api/v2/oauth/authorize?client_id=${import.meta.env.VITE_ANILIST_CLIENT_ID}&response_type=token`}
            >
              💖 Login with AniList 💖
            </a>
          </Button>
        </div>

        <section className="mt-12">
          <div className="flex flex-col gap-6 mx-auto max-w-4xl">
            {notifications.map((notification) => (
              <AnilistNotificationCard
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function AnilistNotificationCard({
  notification,
}: {
  notification: AiringNotification;
}) {
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
    <Card className="bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-3xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 overflow-hidden">
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
            <div className="absolute -bottom-2 -right-2 text-2xl">🌸</div>
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

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  getLinkMutation.mutate({
                    data: {
                      romajiName: notification.media.title.romaji ?? "",
                      englishName: notification.media.title.english ?? "",
                      episode: notification.episode,
                    },
                  });
                }}
                disabled={getLinkMutation.isPending}
                className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                {getLinkMutation.isPending
                  ? "🔍 Searching..."
                  : "🔎 Find Torrents"}
              </Button>

              {torrents.length > 0 && (
                <Button
                  onClick={() => setShowTorrents(!showTorrents)}
                  variant="secondary"
                  className="bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 text-blue-700 font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-blue-200"
                >
                  {showTorrents ? "🙈 Hide" : "👀 Show"} Torrents (
                  {torrents.length}) ✨
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Toggleable Torrent Results */}
        {showTorrents && torrents.length > 0 && (
          <>
            <Separator className="my-6 bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 h-0.5" />
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
      </CardContent>
    </Card>
  );
}

function TorrentItem({ torrent }: { torrent: TorrentResult }) {
  return (
    <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-100 rounded-2xl hover:shadow-lg transition-all duration-200 hover:scale-[1.01]">
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
              className="bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 w-full"
            >
              <a href={torrent.magnetLink}>💾 Download</a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(torrent.magnetLink)}
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
