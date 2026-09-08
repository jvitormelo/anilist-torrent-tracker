import { describe, expect, it } from "vitest";
import {
	buildSearchQueries,
	extractEpisodeNumber,
	extractSeason,
	parseTorrentRows,
	sortBySeeders,
	type TorrentResult,
} from "./nyaa";

describe("buildSearchQueries", () => {
	it("always tries the untouched title first", () => {
		expect(buildSearchQueries("Youjo Senki II")[0]).toBe("Youjo Senki II");
	});

	it("strips a trailing roman numeral season", () => {
		expect(buildSearchQueries("Youjo Senki II")).toContain("Youjo Senki");
		expect(buildSearchQueries("Katainaka no Ossan, Kensei ni Naru II")).toContain(
			"Katainaka no Ossan, Kensei ni Naru",
		);
	});

	it("strips an ordinal season suffix", () => {
		expect(
			buildSearchQueries(
				"Kimi no Koto ga Dai Dai Dai Dai Daisuki na 100-nin no Kanojo 3rd Season",
			),
		).toContain("Kimi no Koto ga Dai Dai Dai Dai Daisuki na 100-nin no Kanojo");

		expect(
			buildSearchQueries("Tensei Shitara Slime Datta Ken 4th Season"),
		).toContain("Tensei Shitara Slime Datta Ken");
	});

	it("strips a numbered season suffix", () => {
		expect(buildSearchQueries("Spy x Family Season 2")).toContain(
			"Spy x Family",
		);
		expect(buildSearchQueries("Nichijou S2")).toContain("Nichijou");
	});

	it("strips a part suffix", () => {
		expect(buildSearchQueries("Dr. Stone: Science Future Part 2")).toContain(
			"Dr. Stone: Science Future",
		);
	});

	it("keeps standalone letters that only look like roman numerals", () => {
		// The "x" in "Spy x Family" is mid-title, so the season pattern must not
		// touch it - an earlier version produced "Spy Family" and found nothing.
		for (const query of buildSearchQueries("Spy x Family Season 2")) {
			expect(query).not.toBe("Spy Family");
		}
	});

	it("strips a season marker that sits in front of a subtitle", () => {
		expect(
			buildSearchQueries("Mushoku Tensei III: Isekai Ittara Honki Dasu"),
		).toContain("Mushoku Tensei: Isekai Ittara Honki Dasu");
	});

	it("drops a trailing arc subtitle after a dash", () => {
		expect(buildSearchQueries("BLEACH: Sennen Kessen-hen - Kashin-tan")).toContain(
			"BLEACH: Sennen Kessen-hen",
		);
	});

	it("does not degrade a title to a single generic word", () => {
		expect(
			buildSearchQueries("BLEACH: Sennen Kessen-hen - Kashin-tan"),
		).not.toContain("BLEACH");
	});

	it("does not split a colon that is part of the name", () => {
		const queries = buildSearchQueries(
			"Re:Zero kara Hajimeru Isekai Seikatsu 4th Season",
		);
		expect(queries).toContain("Re:Zero kara Hajimeru Isekai Seikatsu");
		expect(queries).not.toContain("Re");
	});

	it("appends the english title as a last resort", () => {
		const queries = buildSearchQueries(
			"Youjo Senki II",
			"Saga of Tanya the Evil Season 2",
		);
		expect(queries.at(-1)).toBe("Saga of Tanya the Evil");
	});

	it("returns no duplicates", () => {
		const queries = buildSearchQueries("Sousou no Frieren", "Frieren");
		expect(new Set(queries).size).toBe(queries.length);
	});

	it("leaves a title without season markers alone", () => {
		expect(buildSearchQueries("Sousou no Frieren")).toEqual([
			"Sousou no Frieren",
		]);
	});
});

describe("extractEpisodeNumber", () => {
	it.each([
		["[SubsPlease] One Piece - 1171 (1080p) [08CA0446].mkv", 1171],
		["[ToonsHub] Clevatess S02E03 1080p LIV WEB-DL", 3],
		["[Erai-raws] Youjo Senki II - 04 [1080p CR WEB-DL]", 4],
		["Some Anime EP07 [720p]", 7],
		["Some Anime Episode 12", 12],
	])("reads the episode from %s", (name, expected) => {
		expect(extractEpisodeNumber(name)).toBe(expected);
	});

	it("prefers the episode over the season in SxxExx names", () => {
		expect(extractEpisodeNumber("[Group] Show S02E05 1080p")).toBe(5);
	});

	it("returns undefined for a batch release with no episode", () => {
		expect(extractEpisodeNumber("[Anime Time] One Piece (Batch) [BD]")).toBe(
			undefined,
		);
	});
});

describe("extractSeason", () => {
	it("reads the season from an SxxExx name", () => {
		expect(extractSeason("[ToonsHub] Clevatess S02E03 1080p")).toBe(2);
	});

	it("reads a spelled out season", () => {
		expect(extractSeason("Show Season 3 - 04")).toBe(3);
	});
});

const torrent = (seeders: string): TorrentResult => ({
	name: `seed-${seeders}`,
	date: new Date(),
	seeders,
	magnetLink: "magnet:?xt=urn:btih:abc",
});

describe("sortBySeeders", () => {
	it("sorts numerically, not lexicographically", () => {
		const sorted = sortBySeeders([
			torrent("9"),
			torrent("1236"),
			torrent("87"),
		]);
		expect(sorted.map((t) => t.seeders)).toEqual(["1236", "87", "9"]);
	});

	it("treats unparseable seeder counts as zero", () => {
		const sorted = sortBySeeders([torrent("-"), torrent("3")]);
		expect(sorted.map((t) => t.seeders)).toEqual(["3", "-"]);
	});

	it("does not mutate the input", () => {
		const input = [torrent("1"), torrent("2")];
		sortBySeeders(input);
		expect(input.map((t) => t.seeders)).toEqual(["1", "2"]);
	});
});

function nyaaHtml(rows: { name: string; date: string; seeders: string }[]) {
	const body = rows
		.map(
			({ name, date, seeders }) => `
	<tr class="default">
		<td><a href="/?c=1_2" title="Anime - English-translated"></a></td>
		<td colspan="2">
			<a href="/view/1#comments" class="comments" title="4 comments">4</a>
			<a href="/view/1" title="${name}">${name}</a>
		</td>
		<td class="text-center">
			<a href="/download/1.torrent"></a>
			<a href="magnet:?xt=urn:btih:${seeders}"></a>
		</td>
		<td class="text-center">1.3 GiB</td>
		<td class="text-center">${date}</td>
		<td class="text-center">${seeders}</td>
		<td class="text-center">6</td>
		<td class="text-center">11791</td>
	</tr>`,
		)
		.join("");

	return `<table class="table torrent-list"><tbody>${body}</tbody></table>`;
}

function daysAgo(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return `${date.toISOString().slice(0, 10)} 12:00`;
}

describe("parseTorrentRows", () => {
	it("reads name, seeders and magnet link off a nyaa row", () => {
		const [result] = parseTorrentRows(
			nyaaHtml([
				{
					name: "[Erai-raws] Youjo Senki II - 04 [1080p CR WEB-DL]",
					date: daysAgo(2),
					seeders: "412",
				},
			]),
		);

		expect(result.name).toBe("[Erai-raws] Youjo Senki II - 04 [1080p CR WEB-DL]");
		expect(result.seeders).toBe("412");
		expect(result.magnetLink).toBe("magnet:?xt=urn:btih:412");
		expect(result.episode).toBe(4);
		expect(result.resolution).toBe("1080p");
	});

	it("ignores the comments link when reading the title", () => {
		const [result] = parseTorrentRows(
			nyaaHtml([{ name: "[Group] Show - 01", date: daysAgo(1), seeders: "5" }]),
		);
		expect(result.name).toBe("[Group] Show - 01");
	});

	it("drops torrents older than three months", () => {
		const results = parseTorrentRows(
			nyaaHtml([
				{ name: "[Group] Fresh - 02", date: daysAgo(10), seeders: "5" },
				{ name: "[Group] Stale - 01", date: daysAgo(200), seeders: "5" },
			]),
		);

		expect(results.map((r) => r.name)).toEqual(["[Group] Fresh - 02"]);
	});

	it("returns an empty list when the table is missing", () => {
		expect(parseTorrentRows("<html><body>no results</body></html>")).toEqual([]);
	});
});
