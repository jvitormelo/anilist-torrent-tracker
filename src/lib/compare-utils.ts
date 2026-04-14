import type { AnimeSeason, AnilistUser, SeasonMediaEntry } from "server";

// ============================================================================
// Types
// ============================================================================

export interface UserAnimeData {
	score: number;
	status: string;
	progress: number;
}

export interface MergedAnimeEntry {
	media: SeasonMediaEntry["media"];
	users: Record<string, UserAnimeData | null>;
}

export interface CompareStats {
	averageScores: Record<string, number>;
	animeCount: Record<string, number>;
	sharedCount: number;
	uniqueCounts: Record<string, number>;
	scoreDistribution: Record<string, number[]>;
	genreDistribution: Record<string, Record<string, number>>;
	tagDistribution: Record<string, Record<string, number>>;
	biggestDisagreements: {
		media: SeasonMediaEntry["media"];
		scores: Record<string, number>;
		maxDelta: number;
	}[];
	biggestAgreements: {
		media: SeasonMediaEntry["media"];
		scores: Record<string, number>;
		maxDelta: number;
	}[];
}

export interface UserSeasonData {
	user: AnilistUser;
	entries: SeasonMediaEntry[];
}

// ============================================================================
// Season Helpers
// ============================================================================

export function getCurrentSeason(): { season: AnimeSeason; year: number } {
	const now = new Date();
	const month = now.getMonth() + 1;
	const year = now.getFullYear();

	let season: AnimeSeason;
	if (month >= 1 && month <= 3) season = "WINTER";
	else if (month >= 4 && month <= 6) season = "SPRING";
	else if (month >= 7 && month <= 9) season = "SUMMER";
	else season = "FALL";

	return { season, year };
}

export const SEASONS: AnimeSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];

export function getYearRange(): number[] {
	const currentYear = new Date().getFullYear();
	const years: number[] = [];
	for (let y = currentYear + 1; y >= 1990; y--) {
		years.push(y);
	}
	return years;
}

// ============================================================================
// Data Processing
// ============================================================================

export function filterBySeason(
	entries: SeasonMediaEntry[],
	season: AnimeSeason,
	year: number,
): SeasonMediaEntry[] {
	return entries.filter(
		(e) => e.media.season === season && e.media.seasonYear === year,
	);
}

export function mergeUserData(
	usersData: { userName: string; entries: SeasonMediaEntry[] }[],
): Map<number, MergedAnimeEntry> {
	const merged = new Map<number, MergedAnimeEntry>();

	for (const { userName, entries } of usersData) {
		for (const entry of entries) {
			const mediaId = entry.media.id;
			if (!merged.has(mediaId)) {
				merged.set(mediaId, {
					media: entry.media,
					users: {},
				});
			}
			const existing = merged.get(mediaId)!;
			existing.users[userName] = {
				score: entry.score,
				status: entry.status,
				progress: entry.progress,
			};
		}
	}

	return merged;
}

// ============================================================================
// Statistics
// ============================================================================

export function computeStats(
	mergedEntries: Map<number, MergedAnimeEntry>,
	userNames: string[],
): CompareStats {
	const averageScores: Record<string, number> = {};
	const animeCount: Record<string, number> = {};
	const uniqueCounts: Record<string, number> = {};
	const scoreDistribution: Record<string, number[]> = {};
	const genreDistribution: Record<string, Record<string, number>> = {};
	const tagDistribution: Record<string, Record<string, number>> = {};

	// Initialize per-user accumulators
	for (const name of userNames) {
		animeCount[name] = 0;
		uniqueCounts[name] = 0;
		// 11 buckets: index 0 unused, 1-10 for scores
		scoreDistribution[name] = new Array(11).fill(0);
		genreDistribution[name] = {};
		tagDistribution[name] = {};
	}

	let sharedCount = 0;
	const scoreSums: Record<string, number> = {};
	const scoreCounts: Record<string, number> = {};
	for (const name of userNames) {
		scoreSums[name] = 0;
		scoreCounts[name] = 0;
	}

	// For disagreements
	const sharedAnimeScores: {
		media: SeasonMediaEntry["media"];
		scores: Record<string, number>;
	}[] = [];

	for (const entry of mergedEntries.values()) {
		const presentUsers = userNames.filter((n) => entry.users[n] != null);

		// Count shared (all users have it)
		if (presentUsers.length === userNames.length) {
			sharedCount++;
		}

		// Count unique (only one user has it)
		if (presentUsers.length === 1) {
			uniqueCounts[presentUsers[0]]++;
		}

		for (const userName of presentUsers) {
			const userData = entry.users[userName]!;
			animeCount[userName]++;

			// Score stats
			if (userData.score > 0) {
				scoreSums[userName] += userData.score;
				scoreCounts[userName]++;
				const bucket = Math.min(Math.round(userData.score), 10);
				if (bucket >= 1) {
					scoreDistribution[userName][bucket]++;
				}
			}

			// Genre distribution
			for (const genre of entry.media.genres) {
				genreDistribution[userName][genre] =
					(genreDistribution[userName][genre] || 0) + 1;
			}

			// Tag distribution (only meaningful tags with rank >= 60)
			for (const tag of entry.media.tags) {
				if (tag.rank >= 60) {
					tagDistribution[userName][tag.name] =
						(tagDistribution[userName][tag.name] || 0) + 1;
				}
			}
		}

		// Collect scores for shared anime (for disagreements)
		if (presentUsers.length >= 2) {
			const scores: Record<string, number> = {};
			let allScored = true;
			for (const userName of presentUsers) {
				const s = entry.users[userName]!.score;
				if (s > 0) {
					scores[userName] = s;
				} else {
					allScored = false;
				}
			}
			if (allScored && Object.keys(scores).length >= 2) {
				sharedAnimeScores.push({ media: entry.media, scores });
			}
		}
	}

	// Compute averages
	for (const name of userNames) {
		averageScores[name] =
			scoreCounts[name] > 0 ? scoreSums[name] / scoreCounts[name] : 0;
	}

	// Compute disagreements
	const withDeltas = sharedAnimeScores.map((item) => {
		const scoreValues = Object.values(item.scores);
		const maxDelta = Math.max(...scoreValues) - Math.min(...scoreValues);
		return { ...item, maxDelta };
	});

	withDeltas.sort((a, b) => b.maxDelta - a.maxDelta);

	const biggestDisagreements = withDeltas.slice(0, 5);
	const biggestAgreements = [...withDeltas]
		.sort((a, b) => a.maxDelta - b.maxDelta)
		.slice(0, 5);

	return {
		averageScores,
		animeCount,
		sharedCount,
		uniqueCounts,
		scoreDistribution,
		genreDistribution,
		tagDistribution,
		biggestDisagreements,
		biggestAgreements,
	};
}
