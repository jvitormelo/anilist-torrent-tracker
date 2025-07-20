import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  type AiringNotification,
  getNotificationList,
  scrapNyaa,
  type TorrentResult,
} from "server";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [notifications, setNotifications] = useState<AiringNotification[]>([]);
  return (
    <main className="p-8 flex flex-col gap-16">
      <button
        type="button"
        onClick={() => {
          getNotificationList({
            data: { accessToken: localStorage.getItem("anilist_token") ?? "" },
          }).then((data) => {
            setNotifications(data.data.Page.notifications);
          });
        }}
      >
        Get Anilist User
      </button>

      <a href="https://anilist.co/api/v2/oauth/authorize?client_id=28653&response_type=token">
        Login with AniList
      </a>

      <section>
        <div className="flex flex-col gap-4 mx-auto max-w-2xl">
          {notifications.map((notification) => (
            <AnilistNotificationCard
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      </section>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <img
            src={notification.media.coverImage.medium}
            alt={
              notification.media.title.english ||
              notification.media.title.romaji ||
              "Anime"
            }
            className="w-16 h-20 object-cover rounded"
          />
        </div>
        <div className="flex-1 relative">
          <span className="absolute top-0 right-0 text-xs text-gray-500 dark:text-gray-400">
            {new Date(notification.createdAt * 1000).toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {notification.media.title.english ||
              notification.media.title.romaji}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Episode {notification.episode} aired
          </p>

          <div className="flex gap-2 mt-4">
            <button
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
              type="button"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {getLinkMutation.isPending ? "Searching..." : "Get Torrents"}
            </button>

            {torrents.length > 0 && (
              <button
                onClick={() => setShowTorrents(!showTorrents)}
                type="button"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {showTorrents ? "Hide" : "Show"} Torrents ({torrents.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggleable Torrent Results */}
      {showTorrents && torrents.length > 0 && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Available Torrents:
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {torrents.map((torrent, index) => (
              <TorrentItem
                key={`${torrent.name}-${torrent.date.getTime()}`}
                torrent={torrent}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TorrentItem({ torrent }: { torrent: TorrentResult }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
            {torrent.name}
          </h5>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
              {torrent.seeders} seeders
            </span>
            {torrent.resolution && (
              <span className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded">
                {torrent.resolution}
              </span>
            )}
            {torrent.episode && (
              <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs px-2 py-1 rounded">
                EP {torrent.episode}
              </span>
            )}
            <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded">
              {torrent.date.toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <a
            href={torrent.magnetLink}
            className="flex-shrink-0 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
          >
            Download
          </a>
          <button
            type="button"
            className="flex-shrink-0 px-3 py-1 bg-gray-300 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
            onClick={() => navigator.clipboard.writeText(torrent.magnetLink)}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
