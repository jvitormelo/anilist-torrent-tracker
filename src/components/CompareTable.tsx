import type { AnilistUser } from "server";
import type { MergedAnimeEntry } from "~/lib/compare-utils";
import { Badge } from "~/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { useMemo, useState } from "react";

interface CompareTableProps {
	mergedEntries: Map<number, MergedAnimeEntry>;
	users: { name: string; user: AnilistUser | null }[];
}

type SortKey = "title" | "avgScore" | "userAvg" | string;
type SortDir = "asc" | "desc";

function getScoreColor(score: number): string {
	if (score >= 8) return "bg-green-100 text-green-800";
	if (score >= 5) return "bg-yellow-100 text-yellow-800";
	if (score >= 1) return "bg-red-100 text-red-800";
	return "bg-gray-50 text-gray-400";
}

function getStatusBadge(status: string) {
	const config: Record<string, { label: string; className: string }> = {
		CURRENT: { label: "Watching", className: "bg-blue-100 text-blue-700 border-blue-200" },
		COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
		PLANNING: { label: "Planning", className: "bg-purple-100 text-purple-700 border-purple-200" },
		DROPPED: { label: "Dropped", className: "bg-red-100 text-red-700 border-red-200" },
		PAUSED: { label: "Paused", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
		REPEATING: { label: "Rewatching", className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
	};
	const c = config[status] || { label: status, className: "bg-gray-100 text-gray-700 border-gray-200" };
	return (
		<Badge variant="outline" className={`text-[10px] ${c.className}`}>
			{c.label}
		</Badge>
	);
}

import { USER_GRADIENT_CLASSES } from "~/lib/constants";

function getUserAvgScore(entry: MergedAnimeEntry, users: CompareTableProps["users"]): number {
	const scores = users
		.map((u) => entry.users[u.name]?.score || 0)
		.filter((s) => s > 0);
	return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

const GENRE_COLORS: Record<string, string> = {
	Action: "bg-red-100 text-red-700 border-red-200",
	Adventure: "bg-orange-100 text-orange-700 border-orange-200",
	Comedy: "bg-yellow-100 text-yellow-700 border-yellow-200",
	Drama: "bg-blue-100 text-blue-700 border-blue-200",
	Fantasy: "bg-purple-100 text-purple-700 border-purple-200",
	Horror: "bg-gray-800 text-gray-100 border-gray-700",
	Mystery: "bg-indigo-100 text-indigo-700 border-indigo-200",
	Romance: "bg-pink-100 text-pink-700 border-pink-200",
	"Sci-Fi": "bg-cyan-100 text-cyan-700 border-cyan-200",
	"Slice of Life": "bg-green-100 text-green-700 border-green-200",
	Sports: "bg-emerald-100 text-emerald-700 border-emerald-200",
	Supernatural: "bg-violet-100 text-violet-700 border-violet-200",
	Thriller: "bg-amber-100 text-amber-700 border-amber-200",
	Ecchi: "bg-rose-100 text-rose-700 border-rose-200",
	Mecha: "bg-slate-100 text-slate-700 border-slate-200",
	Music: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
	Psychological: "bg-teal-100 text-teal-700 border-teal-200",
};

function getGenreColor(genre: string): string {
	return GENRE_COLORS[genre] || "bg-gray-100 text-gray-600 border-gray-200";
}

export function CompareTable({ mergedEntries, users }: CompareTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

	const entries = useMemo(() => Array.from(mergedEntries.values()), [mergedEntries]);

	// Collect all genres with counts
	const genreCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const entry of entries) {
			for (const genre of entry.media.genres) {
				counts[genre] = (counts[genre] || 0) + 1;
			}
		}
		return Object.entries(counts).sort((a, b) => b[1] - a[1]);
	}, [entries]);

	const toggleGenre = (genre: string) => {
		setSelectedGenres((prev) => {
			const next = new Set(prev);
			if (next.has(genre)) {
				next.delete(genre);
			} else {
				next.add(genre);
			}
			return next;
		});
	};

	// Filter by selected genres
	const filtered = selectedGenres.size > 0
		? entries.filter((entry) =>
				Array.from(selectedGenres).every((g) => entry.media.genres.includes(g)),
			)
		: entries;

	const sorted = [...filtered].sort((a, b) => {
		let comparison = 0;

		if (sortKey === "title") {
			comparison = a.media.title.userPreferred.localeCompare(b.media.title.userPreferred);
		} else if (sortKey === "userAvg") {
			comparison = getUserAvgScore(a, users) - getUserAvgScore(b, users);
		} else if (sortKey === "avgScore") {
			comparison = (a.media.averageScore || 0) - (b.media.averageScore || 0);
		} else {
			const aScore = a.users[sortKey]?.score || 0;
			const bScore = b.users[sortKey]?.score || 0;
			comparison = aScore - bScore;
		}

		return sortDir === "asc" ? comparison : -comparison;
	});

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(key === "title" ? "asc" : "desc");
		}
	};

	const sortIcon = (key: SortKey) => {
		if (sortKey !== key) return " ↕";
		return sortDir === "asc" ? " ↑" : " ↓";
	};

	if (entries.length === 0) {
		return (
			<div className="text-center py-12">
				<div className="text-4xl mb-4">🤔</div>
				<p className="text-lg text-gray-600">
					No anime found for this season. Try a different season or year!
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Genre filter */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-purple-100 shadow-sm p-4">
				<div className="flex items-center justify-between mb-3">
					<span className="text-sm font-medium text-gray-700">Filter by Genre</span>
					{selectedGenres.size > 0 && (
						<button
							type="button"
							onClick={() => setSelectedGenres(new Set())}
							className="text-xs text-purple-400 hover:text-purple-600 cursor-pointer"
						>
							Clear filters ({filtered.length}/{entries.length})
						</button>
					)}
				</div>
				<div className="flex flex-wrap gap-1.5">
					{genreCounts.map(([genre, count]) => (
						<button
							key={genre}
							type="button"
							onClick={() => toggleGenre(genre)}
							className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
								selectedGenres.has(genre)
									? "ring-2 ring-purple-400 ring-offset-1 scale-105"
									: "opacity-80 hover:opacity-100"
							} ${getGenreColor(genre)}`}
						>
							{genre}
							<span className="opacity-60">({count})</span>
						</button>
					))}
				</div>
			</div>

			{/* Table */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-purple-100 shadow-lg overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gradient-to-r from-pink-50 to-purple-50">
							<TableHead
								className="cursor-pointer hover:bg-purple-100/50 transition-colors min-w-[250px]"
								onClick={() => handleSort("title")}
							>
								Anime{sortIcon("title")}
							</TableHead>
							{users.map((u, i) => (
								<TableHead
									key={u.name}
									className="cursor-pointer hover:bg-purple-100/50 transition-colors text-center min-w-[120px]"
									onClick={() => handleSort(u.name)}
								>
									<div className="flex flex-col items-center gap-1">
										{u.user?.avatar?.medium && (
											<img
												src={u.user.avatar.medium}
												alt={u.name}
												className="w-6 h-6 rounded-full"
											/>
										)}
										<span className={`bg-gradient-to-r ${USER_GRADIENT_CLASSES[i]} bg-clip-text text-transparent font-bold`}>
											{u.name}
										</span>
										<span className="text-[10px] text-gray-400">{sortIcon(u.name)}</span>
									</div>
								</TableHead>
							))}
							<TableHead
								className="cursor-pointer hover:bg-purple-100/50 transition-colors text-center min-w-[80px]"
								onClick={() => handleSort("userAvg")}
							>
								User Avg{sortIcon("userAvg")}
							</TableHead>
							<TableHead
								className="cursor-pointer hover:bg-purple-100/50 transition-colors text-center min-w-[80px]"
								onClick={() => handleSort("avgScore")}
							>
								AL Avg{sortIcon("avgScore")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sorted.map((entry) => {
							const avg = getUserAvgScore(entry, users);
							return (
							<TableRow key={entry.media.id} className="hover:bg-purple-50/30 transition-colors">
								<TableCell>
									<div className="flex items-center gap-3">
										<img
											src={entry.media.coverImage.large}
											alt={entry.media.title.userPreferred}
											className="w-10 h-14 rounded-lg object-cover shadow-sm"
										/>
										<div className="min-w-0">
											<a
												href={`https://anilist.co/anime/${entry.media.id}`}
												target="_blank"
												rel="noopener noreferrer"
												className="font-medium text-sm text-gray-800 hover:text-purple-600 truncate max-w-[200px] block transition-colors"
											>
												{entry.media.title.userPreferred}
											</a>
											<p className="text-[10px] text-gray-400">
												{entry.media.format} {entry.media.episodes ? `· ${entry.media.episodes} eps` : ""}
											</p>
											<div className="flex flex-wrap gap-1 mt-1">
												{entry.media.genres.map((genre) => (
													<span
														key={genre}
														className={`text-[9px] px-1.5 py-0.5 rounded-full border ${getGenreColor(genre)}`}
													>
														{genre}
													</span>
												))}
											</div>
										</div>
									</div>
								</TableCell>
								{users.map((u) => {
									const userData = entry.users[u.name];
									if (!userData) {
										return (
											<TableCell key={u.name} className="text-center">
												<span className="text-gray-300">---</span>
											</TableCell>
										);
									}
									return (
										<TableCell key={u.name} className="text-center">
											<div className="flex flex-col items-center gap-1">
												<span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getScoreColor(userData.score)}`}>
													{userData.score > 0 ? userData.score : "-"}
												</span>
												<span className="text-[10px] text-gray-500">
													{userData.progress}{entry.media.episodes ? `/${entry.media.episodes}` : ""} ep
												</span>
												{getStatusBadge(userData.status)}
											</div>
										</TableCell>
									);
								})}
								<TableCell className="text-center">
									<span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getScoreColor(avg)}`}>
										{avg > 0 ? avg.toFixed(1) : "-"}
									</span>
								</TableCell>
								<TableCell className="text-center">
									<span className="text-sm text-gray-600 font-medium">
										{entry.media.averageScore ? `${entry.media.averageScore}%` : "-"}
									</span>
								</TableCell>
							</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
