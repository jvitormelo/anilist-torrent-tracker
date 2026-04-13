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
import { useState } from "react";

interface CompareTableProps {
	mergedEntries: Map<number, MergedAnimeEntry>;
	users: { name: string; user: AnilistUser | null }[];
}

type SortKey = "title" | "avgScore" | string; // string for user-specific sorts
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

const USER_COLORS = ["from-pink-400 to-rose-400", "from-purple-400 to-indigo-400", "from-blue-400 to-cyan-400"];

export function CompareTable({ mergedEntries, users }: CompareTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const entries = Array.from(mergedEntries.values());

	const sorted = [...entries].sort((a, b) => {
		let comparison = 0;

		if (sortKey === "title") {
			comparison = a.media.title.userPreferred.localeCompare(b.media.title.userPreferred);
		} else if (sortKey === "avgScore") {
			comparison = (a.media.averageScore || 0) - (b.media.averageScore || 0);
		} else {
			// Sort by a specific user's score
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
									<span className={`bg-gradient-to-r ${USER_COLORS[i]} bg-clip-text text-transparent font-bold`}>
										{u.name}
									</span>
									<span className="text-[10px] text-gray-400">{sortIcon(u.name)}</span>
								</div>
							</TableHead>
						))}
						<TableHead
							className="cursor-pointer hover:bg-purple-100/50 transition-colors text-center min-w-[80px]"
							onClick={() => handleSort("avgScore")}
						>
							AL Avg{sortIcon("avgScore")}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map((entry) => (
						<TableRow key={entry.media.id} className="hover:bg-purple-50/30 transition-colors">
							<TableCell>
								<div className="flex items-center gap-3">
									<img
										src={entry.media.coverImage.large}
										alt={entry.media.title.userPreferred}
										className="w-10 h-14 rounded-lg object-cover shadow-sm"
									/>
									<div className="min-w-0">
										<p className="font-medium text-sm text-gray-800 truncate max-w-[200px]">
											{entry.media.title.userPreferred}
										</p>
										<p className="text-[10px] text-gray-400">
											{entry.media.format} {entry.media.episodes ? `· ${entry.media.episodes} eps` : ""}
										</p>
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
											{getStatusBadge(userData.status)}
										</div>
									</TableCell>
								);
							})}
							<TableCell className="text-center">
								<span className="text-sm text-gray-600 font-medium">
									{entry.media.averageScore ? `${entry.media.averageScore}%` : "-"}
								</span>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
