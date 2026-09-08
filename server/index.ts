import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	buildSearchQueries,
	parseTorrentRows,
	sortBySeeders,
	type TorrentResult,
} from "./nyaa";

export type { TorrentResult } from "./nyaa";

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

const MAX_TORRENT_RESULTS = 15;
const FOUND_SHOW_ROW_COUNT = 5;

export const scrapNyaa = createServerFn({ method: "GET" })
	.validator(
		z.object({
			romajiName: z.string(),
			englishName: z.string(),
			episode: z.number().optional(),
		}),
	)
	.handler(async (ctx): Promise<TorrentResult[]> => {
		const { romajiName, englishName, episode } = ctx.data;

		// Try the most specific title first and fall back to broader ones, since
		// release groups rarely spell season suffixes the way AniList does.
		for (const query of buildSearchQueries(romajiName, englishName)) {
			const params = new URLSearchParams({
				f: "0",
				c: "1_2",
				q: query,
				s: "seeders",
				o: "desc",
			});

			const url = `https://nyaa.si/?${params.toString()}`;

			try {
				const response = await fetch(url);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const rows = parseTorrentRows(await response.text());
				const matches = rows.filter((result) => result.episode === episode);

				if (matches.length > 0) {
					return sortBySeeders(matches).slice(0, MAX_TORRENT_RESULTS);
				}

				// Plenty of rows but none for this episode means the query already
				// found the right show and the episode simply is not out yet, so a
				// broader query would only burn another request.
				if (rows.length >= FOUND_SHOW_ROW_COUNT) {
					return [];
				}
			} catch (error) {
				console.error(`Error scraping Nyaa for "${query}":`, error);
			}
		}

		return [];
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
		User: AnilistUser;
	};
	errors?: { message: string }[];
}

export const getCurrentUser = createServerFn({ method: "GET" })
	.validator(z.object({ userName: z.string() }))
	.handler(async (ctx): Promise<UserResponse> => {
		const { userName } = ctx.data;

		const response = await fetch("https://graphql.anilist.co", {
			method: "POST",
			body: JSON.stringify({
				query: `
					query($name: String) {
						User(name: $name) {
							id
							name
							avatar {
								large
								medium
							}
						}
					}
				`,
				variables: { name: userName },
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data: UserResponse = await response.json();
		return data;
	});

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
			english: string;
			romaji: string;
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

// ============================================================================
// Compare Season Types & Server Function
// ============================================================================

export type AnimeSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export interface FuzzyDate {
	year: number | null;
	month: number | null;
	day: number | null;
}

export interface SeasonMediaEntry {
	score: number;
	status: string;
	progress: number;
	startedAt: FuzzyDate;
	completedAt: FuzzyDate;
	media: {
		id: number;
		title: {
			userPreferred: string;
			english: string | null;
			romaji: string | null;
		};
		coverImage: {
			large: string;
		};
		season: AnimeSeason | null;
		seasonYear: number | null;
		genres: string[];
		tags: { name: string; rank: number }[];
		averageScore: number | null;
		meanScore: number | null;
		format: string;
		episodes: number | null;
		status: string;
	};
}

interface SeasonMediaListCollection {
	data: {
		MediaListCollection: {
			lists: {
				name: string;
				status: string;
				entries: SeasonMediaEntry[];
			}[];
		} | null;
	};
	errors?: { message: string }[];
}

export const getSeasonAnimeList = createServerFn({ method: "GET" })
	.validator(z.object({ userName: z.string() }))
	.handler(async (ctx): Promise<SeasonMediaListCollection> => {
		const { userName } = ctx.data;

		const response = await fetch("https://graphql.anilist.co", {
			method: "POST",
			body: JSON.stringify({
				query: `
					query($userName: String, $type: MediaType) {
						MediaListCollection(userName: $userName, type: $type) {
							lists {
								name
								status
								entries {
									score
									status
									progress
									startedAt { year month day }
									completedAt { year month day }
									media {
										id
										title {
											userPreferred
											english
											romaji
										}
										coverImage {
											large
										}
										season
										seasonYear
										genres
										tags {
											name
											rank
										}
										averageScore
										meanScore
										format
										episodes
										status
									}
								}
							}
						}
					}
				`,
				variables: {
					userName,
					type: "ANIME",
				},
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data: SeasonMediaListCollection = await response.json();
		return data;
	});

// ============================================================================
// Currently Watching
// ============================================================================

export const getCurrentlyWatching = createServerFn({ method: "GET" })
	.validator(
		z.object({
			userName: z.string(),
			perPage: z.number().optional().default(50),
		}),
	)
	.handler(async (ctx): Promise<MediaListResponse> => {
		const { userName, perPage } = ctx.data;

		const response = await fetch("https://graphql.anilist.co", {
			method: "POST",
			body: JSON.stringify({
				query: `
					query($userName: String, $type: MediaType, $perPage: Int) {
						Page(perPage: $perPage) {
							mediaList(userName: $userName, type: $type, status_in: [CURRENT, REPEATING], sort: UPDATED_TIME_DESC) {
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
                    english
                    romaji
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
					userName,
					type: "ANIME",
					perPage,
				},
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data: MediaListResponse = await response.json();
		return data;
	});
