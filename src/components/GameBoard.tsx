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

interface GameBoardProps {
	mergedEntries: Map<number, MergedAnimeEntry>;
	users: { name: string; user: AnilistUser | null }[];
	userNames: string[];
}

const USER_COLORS = ["from-pink-400 to-rose-400", "from-purple-400 to-indigo-400", "from-blue-400 to-cyan-400"];

interface GameRow {
	entry: MergedAnimeEntry;
	tens: number;
	isPerfect: boolean;
	rowScore: number;
}

function computeGameRows(
	mergedEntries: Map<number, MergedAnimeEntry>,
	userNames: string[],
): { rows: GameRow[]; totalScore: number; basePoints: number; bonusPoints: number } {
	const rows: GameRow[] = [];
	let totalScore = 0;
	let basePoints = 0;
	let bonusPoints = 0;

	for (const entry of mergedEntries.values()) {
		let tens = 0;
		for (const name of userNames) {
			if (entry.users[name]?.score === 10) {
				tens++;
			}
		}

		if (tens === 0) continue;

		const isPerfect = tens === userNames.length;
		const rowScore = isPerfect ? tens * 2 : tens;
		basePoints += tens;
		if (isPerfect) bonusPoints += tens; // the extra from doubling

		rows.push({ entry, tens, isPerfect, rowScore });
		totalScore += rowScore;
	}

	// Sort: perfect rows first, then by tens count
	rows.sort((a, b) => {
		if (a.isPerfect !== b.isPerfect) return a.isPerfect ? -1 : 1;
		return b.tens - a.tens;
	});

	return { rows, totalScore, basePoints, bonusPoints };
}

export function GameBoard({ mergedEntries, users, userNames }: GameBoardProps) {
	const { rows, totalScore, basePoints, bonusPoints } = computeGameRows(mergedEntries, userNames);

	if (rows.length === 0) {
		return (
			<div className="text-center py-16">
				<div className="text-6xl mb-4">😢</div>
				<p className="text-xl text-gray-600 font-medium mb-2">
					No perfect 10s this season!
				</p>
				<p className="text-gray-400">
					Try a different season or year where your group rated anime 10/10
				</p>
			</div>
		);
	}

	const perfectCount = rows.filter((r) => r.isPerfect).length;

	return (
		<div className="space-y-6">
			{/* Score Banner */}
			<div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 rounded-3xl p-8 shadow-2xl text-center">
				<div className="text-6xl font-black text-white mb-2 drop-shadow-lg">
					{totalScore}
				</div>
				<div className="text-white/90 font-medium text-lg mb-4">
					Total Points
				</div>
				<div className="flex justify-center gap-6 text-sm">
					<div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
						<span className="font-bold">{basePoints}</span> base pts
					</div>
					{bonusPoints > 0 && (
						<div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
							<span className="font-bold">+{bonusPoints}</span> bonus (x2)
						</div>
					)}
					<div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
						<span className="font-bold">{rows.length}</span> anime with 10s
					</div>
					{perfectCount > 0 && (
						<div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
							<span className="font-bold">{perfectCount}</span> PERFECT
						</div>
					)}
				</div>
			</div>

			{/* Game Table */}
			<div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-yellow-200 shadow-lg overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-gradient-to-r from-yellow-50 to-amber-50">
							<TableHead className="min-w-[250px]">Anime</TableHead>
							{users.map((u, i) => (
								<TableHead key={u.name} className="text-center min-w-[100px]">
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
									</div>
								</TableHead>
							))}
							<TableHead className="text-center min-w-[80px]">Points</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map(({ entry, isPerfect, rowScore }) => (
							<TableRow
								key={entry.media.id}
								className={
									isPerfect
										? "bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 hover:from-yellow-100 hover:via-amber-100 hover:to-yellow-100 transition-colors"
										: "hover:bg-yellow-50/30 transition-colors"
								}
							>
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
												className="font-medium text-sm text-gray-800 hover:text-amber-600 truncate max-w-[200px] block transition-colors"
											>
												{entry.media.title.userPreferred}
											</a>
											<p className="text-[10px] text-gray-400">
												{entry.media.format} {entry.media.episodes ? `· ${entry.media.episodes} eps` : ""}
											</p>
										</div>
									</div>
								</TableCell>
								{users.map((u) => {
									const userData = entry.users[u.name];
									const score = userData?.score || 0;
									const isTen = score === 10;
									return (
										<TableCell key={u.name} className="text-center">
											{userData ? (
												<span
													className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
														isTen
															? "bg-gradient-to-br from-yellow-300 to-amber-400 text-white shadow-md ring-2 ring-yellow-300"
															: "bg-gray-100 text-gray-500"
													}`}
												>
													{score > 0 ? score : "-"}
												</span>
											) : (
												<span className="text-gray-300">---</span>
											)}
										</TableCell>
									);
								})}
								<TableCell className="text-center">
									<div className="flex flex-col items-center gap-1">
										<span className="font-bold text-lg text-amber-600">
											{rowScore}
										</span>
										{isPerfect && (
											<Badge className="bg-gradient-to-r from-yellow-400 to-amber-400 text-white border-0 text-[10px]">
												PERFECT x2
											</Badge>
										)}
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
