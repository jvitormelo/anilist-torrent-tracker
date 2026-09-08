import * as cheerio from "cheerio";

export interface TorrentResult {
	name: string;
	date: Date;
	seeders: string;
	magnetLink: string;
	episode?: number;
	resolution?: string;
	season?: number;
}

export function extractEpisodeNumber(name: string): number | undefined {
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
			// Long runners like One Piece are well past 1000 episodes. The upper
			// bound stays under 2000 so a bracketed release year ([2025]) is not
			// mistaken for an episode number.
			if (episodeNum > 0 && episodeNum < 2000) {
				return episodeNum;
			}
		}
	}

	return undefined;
}

export function extractSeason(name: string): number | undefined {
	// Season patterns to match
	const patterns = [
		/S(\d+)/i, // S1, S2, S01, S02
		/Season\s*(\d+)/i, // Season 1, Season 2
	];

	for (const pattern of patterns) {
		const match = name.match(pattern);
		if (match) {
			return parseInt(match[1], 10);
		}
	}

	return undefined;
}

export function extractResolution(name: string): string | undefined {
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

export function parseNyaaDate(dateString: string): Date | null {
	try {
		// Nyaa dates are typically in format "2025-07-06 14:49"
		const date = new Date(dateString);
		return Number.isNaN(date.getTime()) ? null : date;
	} catch {
		return null;
	}
}

export function isWithinThreeMonths(date: Date): boolean {
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	return date >= threeMonthsAgo;
}

// Season / part markers, matched only at the end of the title or immediately
// before a subtitle colon. The anchor matters: without it the roman numeral
// branch eats the standalone "x" in titles like "Spy x Family".
const SEASON_SUFFIX =
	/\s+(?:(?:season|s)\s*\d+|\d+(?:st|nd|rd|th)\s+season|part\s*\d+|(?:ii|iii|iv|vi{0,3}|ix|xi{0,3}))(?=$|\s*:)/gi;

function tidy(value: string): string {
	return value
		.replace(/\s*[:\-–,]\s*$/, "")
		.replace(/\s+([:,])/g, "$1")
		.replace(/\s{2,}/g, " ")
		.trim();
}

/**
 * Nyaa's search ANDs every term, so a full AniList title often matches nothing
 * ("... 100-nin no Kanojo 3rd Season" returns 0 rows because release groups
 * label it "S3"). Returns progressively broader queries, most specific first,
 * so callers can stop at the first one that actually finds the episode.
 */
export function buildSearchQueries(
	romajiName: string,
	englishName?: string,
): string[] {
	const queries: string[] = [];

	const push = (value: string) => {
		const candidate = tidy(value);
		if (
			candidate &&
			!queries.some((q) => q.toLowerCase() === candidate.toLowerCase())
		) {
			queries.push(candidate);
		}
	};

	push(romajiName);

	const withoutSeason = romajiName.replace(SEASON_SUFFIX, "");
	push(withoutSeason);

	// Drop a trailing " - subtitle" arc name, e.g. "BLEACH: Sennen Kessen-hen - Kashin-tan"
	const dashIndex = withoutSeason.lastIndexOf(" - ");
	if (dashIndex > 0) {
		push(withoutSeason.slice(0, dashIndex));
	}

	// Drop a ": subtitle", but only when the remaining part is more than a single
	// word - otherwise "BLEACH: Sennen Kessen-hen" degrades to a useless "BLEACH".
	const colonIndex = withoutSeason.indexOf(": ");
	if (
		colonIndex > 0 &&
		withoutSeason.slice(0, colonIndex).trim().split(/\s+/).length >= 2
	) {
		push(withoutSeason.slice(0, colonIndex));
	}

	if (englishName) {
		push(englishName.replace(SEASON_SUFFIX, ""));
	}

	return queries;
}

export function sortBySeeders(results: TorrentResult[]): TorrentResult[] {
	return [...results].sort(
		(a, b) => (parseInt(b.seeders, 10) || 0) - (parseInt(a.seeders, 10) || 0),
	);
}

export function parseTorrentRows(html: string): TorrentResult[] {
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

		// Extract episode number, season, and resolution from the name
		const animeEpisode = name ? extractEpisodeNumber(name) : undefined;
		const season = name ? extractSeason(name) : undefined;
		const resolution = name ? extractResolution(name) : undefined;

		// Push the extracted data as an object into our array
		results.push({
			name: name ?? "",
			date: parsedDate,
			seeders,
			magnetLink: torrentLink ?? "",
			episode: animeEpisode,
			season,
			resolution,
		});
	});

	return results;
}
