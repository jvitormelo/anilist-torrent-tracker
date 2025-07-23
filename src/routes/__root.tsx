import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type * as React from "react";
import { Toaster } from "~/components/ui/sonner";
import appCss from "~/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "AniList Torrent Tracker - Your Ultimate Anime Companion",
      },
      {
        name: "description",
        content:
          "Track your anime progress, get notifications for new episodes, and find torrents instantly. Connect with AniList and never miss your favorite shows!",
      },
      {
        name: "keywords",
        content:
          "anime, torrent, tracker, anilist, notifications, episodes, watching, progress",
      },
      {
        name: "author",
        content: "AniList Torrent Tracker",
      },
      {
        property: "og:title",
        content: "AniList Torrent Tracker - Your Ultimate Anime Companion",
      },
      {
        property: "og:description",
        content:
          "Track your anime progress, get notifications for new episodes, and find torrents instantly. Connect with AniList and never miss your favorite shows!",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "AniList Torrent Tracker - Your Ultimate Anime Companion",
      },
      {
        name: "twitter:description",
        content:
          "Track your anime progress, get notifications for new episodes, and find torrents instantly. Connect with AniList and never miss your favorite shows!",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
