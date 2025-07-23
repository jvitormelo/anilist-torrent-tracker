import { createServerFn } from "@tanstack/react-start";
import { getHeader } from "@tanstack/react-start/server";
import * as cheerio from "cheerio";
import { z } from "zod";

function getAccessToken() {
  const bearerToken = getHeader("Authorization");
  if (!bearerToken) {
    throw new Error("Authorization header is required");
  }
  return bearerToken.replace("Bearer ", "");
}

export interface AiringNotification {
  animeId: number;
  episode: number;
  createdAt: number;
  media: {
    season: string | null;
    source: string | null;
    description: string | null;
    title: {
      english: string | null;
      romaji: string | null;
    };
    coverImage: {
      color: string | null;
      medium: string;
      large: string;
    };
  };
  id: number;
}

interface AnilistPage {
  notifications: AiringNotification[];
}

interface AnilistResponse {
  data: {
    Page: AnilistPage;
  };
  errors?: { message: string }[];
}

export const getNotificationList = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnilistResponse> => {
    const accessToken = getAccessToken();
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      body: JSON.stringify({
        query: `
      query {
        Page {
          notifications(type: AIRING) {
            ... on AiringNotification {
              animeId
              createdAt
              episode
              media {
                season
                source
                description
                title {
                  english
                  romaji
                }
                coverImage {
                  color
                  medium
                  large
                }
              }
              id
            }
          }
        }
      }
          `,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data: AnilistResponse = await response.json();
    return data;
  }
);

function extractEpisodeNumber(name: string): number | undefined {
  // Various episode patterns to match - ordered from most specific to least specific
  // IMPORTANT: Order matters! More specific patterns should come first to avoid
  // false matches (e.g., "Season 2" matching before "- 03")
  const patterns = [
    /S\d+E(\d+)/i, // S01E01, S1E1
    /\s-\s(\d+)(?:\s|$|\[)/i, // - 03 (followed by space, end, or bracket)
    /EP(\d+)/i, // EP03, ep3
    /episode\s*(\d+)/i, // episode 03, Episode 3
    /\bE(\d+)\b/i, // E01, e1 (standalone)
    /\[(\d+)\]/, // [01], [1] - for bracketed episodes
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const episodeNum = parseInt(match[1], 10);
      if (episodeNum > 0 && episodeNum < 1000) {
        // reasonable episode range
        return episodeNum;
      }
    }
  }

  return undefined;
}

function extractResolution(name: string): string | undefined {
  // Common resolution patterns
  const patterns = [
    /(\d{3,4}p)/i, // 1080p, 720p, 480p, 2160p
    /(\d{3,4}x\d{3,4})/i, // 1920x1080, 1280x720
    /(4K)/i, // 4K
    /(8K)/i, // 8K
    /(HD)/i, // HD
    /(FHD)/i, // FHD (Full HD)
    /(UHD)/i, // UHD (Ultra HD)
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return undefined;
}

function parseNyaaDate(dateString: string): Date | null {
  try {
    // Nyaa dates are typically in format "2025-07-06 14:49"
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function isWithinThreeMonths(date: Date): boolean {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return date >= threeMonthsAgo;
}

export interface TorrentResult {
  name: string;
  date: Date;
  seeders: string;
  magnetLink: string;
  episode?: number;
  resolution?: string;
}

export const scrapNyaa = createServerFn({ method: "GET" })
  .validator(
    z.object({
      romajiName: z.string(),
      englishName: z.string().optional(),
      episode: z.number().optional(),
    })
  )
  .handler(async (ctx) => {
    const { romajiName, englishName, episode } = ctx.data;

    // Build search query

    // Build URL with parameters
    const params = new URLSearchParams({
      f: "0",
      c: "1_2",
      q: englishName ?? romajiName,
      s: "seeders",
      o: "desc",
    });

    const url = `https://nyaa.si/?${params.toString()}`;

    console.log({ url, episode });
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      const $ = cheerio.load(html);

      const results: TorrentResult[] = [];

      // Parse torrent table rows
      $(".torrent-list tbody tr").each((_index, element) => {
        const $row = $(element);

        // Find all cells (td) in the current row
        const cells = $row.find("td");

        // Extract data from each cell based on its position
        const name = $(cells).eq(1).find("a").not(".comments").attr("title");
        const torrentLink = $(cells).eq(2).find("a").eq(1).attr("href");

        const dateString = $(cells).eq(4).text().trim();
        const seeders = $(cells).eq(5).text().trim();

        // Parse the date string to Date object
        const parsedDate = parseNyaaDate(dateString);

        // Skip if date parsing failed or if the torrent is older than 3 months
        if (!parsedDate || !isWithinThreeMonths(parsedDate)) {
          return;
        }

        // Extract episode number and resolution from the name
        const animeEpisode = name ? extractEpisodeNumber(name) : undefined;
        const resolution = name ? extractResolution(name) : undefined;

        // Push the extracted data as an object into our array
        results.push({
          name: name ?? "",
          date: parsedDate,
          seeders,
          magnetLink: torrentLink ?? "",
          episode: animeEpisode,
          resolution,
        });
      });

      return results.filter((result) => result.episode === episode).slice(0, 5);
    } catch (error) {
      console.error("Error scraping Nyaa:", error);
      return [];
    }
  });

export interface AnilistUser {
  id: number;
  name: string;
  avatar: {
    large: string;
    medium: string;
  };
}

interface UserResponse {
  data: {
    Viewer: AnilistUser;
  };
  errors?: { message: string }[];
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserResponse> => {
    const accessToken = getAccessToken();

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      body: JSON.stringify({
        query: `
					query {
						Viewer {
							id
							name
							avatar {
								large
								medium
							}
						}
					}
				`,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data: UserResponse = await response.json();
    return data;
  }
);

export interface MediaListEntry {
  id: number;
  status: string;
  score: number;
  progress: number;
  progressVolumes: number;
  media: {
    id: number;
    type: string;
    status: string;
    format: string;
    episodes: number | null;
    bannerImage: string | null;
    title: {
      userPreferred: string;
    };
    coverImage: {
      large: string;
    };
    nextAiringEpisode: {
      airingAt: number;
      timeUntilAiring: number;
      episode: number;
    } | null;
  };
}

interface MediaListPage {
  mediaList: MediaListEntry[];
}

interface MediaListResponse {
  data: {
    Page: MediaListPage;
  };
  errors?: { message: string }[];
}

export const getCurrentlyWatching = createServerFn({ method: "GET" })
  .validator(
    z.object({
      userId: z.number(),
      perPage: z.number().optional().default(50),
    })
  )
  .handler(async (ctx): Promise<MediaListResponse> => {
    const { userId, perPage } = ctx.data;
    const accessToken = getAccessToken();

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      body: JSON.stringify({
        query: `
					query($userId: Int, $type: MediaType, $perPage: Int) {
						Page(perPage: $perPage) {
							mediaList(userId: $userId, type: $type, status_in: [CURRENT, REPEATING], sort: UPDATED_TIME_DESC) {
								id
								status
								score
								progress
								progressVolumes
								media {
									id
									type
									status(version: 2)
									format
									episodes
									bannerImage
									title {
										userPreferred
									}
									coverImage {
										large
									}
									nextAiringEpisode {
										airingAt
										timeUntilAiring
										episode
									}
								}
							}
						}
					}
				`,
        variables: {
          userId,
          type: "ANIME",
          perPage,
        },
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data: MediaListResponse = await response.json();
    return data;
  });
