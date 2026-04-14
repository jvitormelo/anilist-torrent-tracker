import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
	getCurrentUser,
	getSeasonAnimeList,
	type AnimeSeason,
	type AnilistUser,
	type SeasonMediaEntry,
} from "server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { AnimeLoading } from "~/components/KawaiiLoading";
import { GameBoard } from "~/components/GameBoard";
import {
	getCurrentSeason,
	getYearRange,
	SEASONS,
	filterBySeason,
	mergeUserData,
} from "~/lib/compare-utils";

// ============================================================================
// Route Definition
// ============================================================================

const gameSearchSchema = z.object({
	userA: z.string().optional(),
	userB: z.string().optional(),
	userC: z.string().optional(),
	season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
	year: z.coerce.number().optional(),
});

export const Route = createFileRoute("/game")({
	component: GamePage,
	validateSearch: gameSearchSchema,
});

// ============================================================================
// Query Options
// ============================================================================

const useUserQuery = (userName: string | undefined) =>
	queryOptions({
		queryKey: ["user", userName],
		queryFn: async () => {
			if (!userName) throw new Error("No username");
			const response = await getCurrentUser({ data: { userName } });
			if (response.errors?.length) {
				throw new Error(response.errors[0].message);
			}
			return response.data.User;
		},
		enabled: !!userName,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

const useSeasonListQuery = (userName: string | undefined) =>
	queryOptions({
		queryKey: ["seasonAnimeList", userName],
		queryFn: async () => {
			if (!userName) throw new Error("No username");
			const response = await getSeasonAnimeList({ data: { userName } });
			if (response.errors?.length) {
				throw new Error(response.errors[0].message);
			}
			const lists = response.data.MediaListCollection?.lists || [];
			return lists.flatMap((list) => list.entries);
		},
		enabled: !!userName,
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

// ============================================================================
// Components
// ============================================================================

function GamePage() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const currentSeason = getCurrentSeason();
	const years = getYearRange();

	const [inputA, setInputA] = useState(search.userA || "sanfordmarshall");
	const [inputB, setInputB] = useState(search.userB || "Jediahsk");
	const [inputC, setInputC] = useState(search.userC || "");
	const [showThirdUser, setShowThirdUser] = useState(!!search.userC);
	const [selectedSeason, setSelectedSeason] = useState<AnimeSeason>(
		search.season || currentSeason.season,
	);
	const [selectedYear, setSelectedYear] = useState(
		search.year || currentSeason.year,
	);

	const submittedA = search.userA;
	const submittedB = search.userB;
	const submittedC = search.userC;
	const submittedSeason = search.season;
	const submittedYear = search.year;

	const userAQuery = useQuery(useUserQuery(submittedA));
	const userBQuery = useQuery(useUserQuery(submittedB));
	const userCQuery = useQuery(useUserQuery(submittedC));

	const listAQuery = useQuery(useSeasonListQuery(submittedA));
	const listBQuery = useQuery(useSeasonListQuery(submittedB));
	const listCQuery = useQuery(useSeasonListQuery(submittedC));

	const [errors, setErrors] = useState<Record<string, string>>({});

	const handlePlay = () => {
		const newErrors: Record<string, string> = {};
		if (!inputA.trim()) newErrors.userA = "Username required";
		if (!inputB.trim()) newErrors.userB = "Username required";
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}
		setErrors({});

		navigate({
			to: "/game",
			search: {
				userA: inputA.trim(),
				userB: inputB.trim(),
				userC: showThirdUser && inputC.trim() ? inputC.trim() : undefined,
				season: selectedSeason,
				year: selectedYear,
			},
		});
	};

	const hasSubmitted = submittedA && submittedB && submittedSeason && submittedYear;

	const isLoading =
		hasSubmitted &&
		(listAQuery.isLoading ||
			listBQuery.isLoading ||
			(submittedC && listCQuery.isLoading));

	const userErrors: string[] = [];
	if (userAQuery.error) userErrors.push(`User A (${submittedA}): ${userAQuery.error.message}`);
	if (userBQuery.error) userErrors.push(`User B (${submittedB}): ${userBQuery.error.message}`);
	if (submittedC && userCQuery.error) userErrors.push(`User C (${submittedC}): ${userCQuery.error.message}`);
	if (listAQuery.error) userErrors.push(`User A list (${submittedA}): ${listAQuery.error.message}`);
	if (listBQuery.error) userErrors.push(`User B list (${submittedB}): ${listBQuery.error.message}`);
	if (submittedC && listCQuery.error) userErrors.push(`User C list (${submittedC}): ${listCQuery.error.message}`);

	let mergedEntries: Map<number, import("~/lib/compare-utils").MergedAnimeEntry> | null = null;
	const activeUsers: { name: string; user: AnilistUser | null }[] = [];
	const activeUserNames: string[] = [];

	if (hasSubmitted && !isLoading && listAQuery.data && listBQuery.data) {
		const usersData: { userName: string; entries: SeasonMediaEntry[] }[] = [];

		if (submittedA && listAQuery.data) {
			const filtered = filterBySeason(listAQuery.data, submittedSeason as AnimeSeason, submittedYear);
			usersData.push({ userName: submittedA, entries: filtered });
			activeUsers.push({ name: submittedA, user: userAQuery.data || null });
			activeUserNames.push(submittedA);
		}

		if (submittedB && listBQuery.data) {
			const filtered = filterBySeason(listBQuery.data, submittedSeason as AnimeSeason, submittedYear);
			usersData.push({ userName: submittedB, entries: filtered });
			activeUsers.push({ name: submittedB, user: userBQuery.data || null });
			activeUserNames.push(submittedB);
		}

		if (submittedC && listCQuery.data) {
			const filtered = filterBySeason(listCQuery.data, submittedSeason as AnimeSeason, submittedYear);
			usersData.push({ userName: submittedC, entries: filtered });
			activeUsers.push({ name: submittedC, user: userCQuery.data || null });
			activeUserNames.push(submittedC);
		}

		mergedEntries = mergeUserData(usersData);
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-8">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent mb-2">
						🎮 Perfect 10 Game 🏆
					</h1>
					<p className="text-lg text-gray-600 font-medium">
						How many perfect 10s can your group score this season?
					</p>
					<p className="text-sm text-gray-400 mt-1">
						Each 10 = 1 point | All users score 10 = PERFECT row (x2 multiplier!)
					</p>
				</div>

				{/* Input Form */}
				<Card className="bg-white/90 backdrop-blur-sm border-2 border-yellow-200 rounded-3xl shadow-2xl overflow-hidden mb-8">
					<CardContent className="p-8">
						<div className="space-y-6">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent mb-2">
										Player 1
									</label>
									<Input
										type="text"
										placeholder="AniList Username"
										value={inputA}
										onChange={(e) => setInputA(e.target.value)}
										className={`rounded-2xl border-2 ${errors.userA ? "border-red-300" : "border-yellow-100"} focus:border-yellow-300 h-12 text-center text-lg`}
										onKeyDown={(e) => { if (e.key === "Enter") handlePlay(); }}
									/>
									{errors.userA && <p className="text-red-400 text-xs mt-1">{errors.userA}</p>}
								</div>
								<div>
									<label className="block text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-2">
										Player 2
									</label>
									<Input
										type="text"
										placeholder="AniList Username"
										value={inputB}
										onChange={(e) => setInputB(e.target.value)}
										className={`rounded-2xl border-2 ${errors.userB ? "border-red-300" : "border-amber-100"} focus:border-amber-300 h-12 text-center text-lg`}
										onKeyDown={(e) => { if (e.key === "Enter") handlePlay(); }}
									/>
									{errors.userB && <p className="text-red-400 text-xs mt-1">{errors.userB}</p>}
								</div>
							</div>

							{showThirdUser ? (
								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="block text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
											Player 3 (Optional)
										</label>
										<button
											type="button"
											onClick={() => { setShowThirdUser(false); setInputC(""); }}
											className="text-xs text-gray-400 hover:text-red-400 cursor-pointer"
										>
											Remove
										</button>
									</div>
									<Input
										type="text"
										placeholder="AniList Username"
										value={inputC}
										onChange={(e) => setInputC(e.target.value)}
										className="rounded-2xl border-2 border-orange-100 focus:border-orange-300 h-12 text-center text-lg"
										onKeyDown={(e) => { if (e.key === "Enter") handlePlay(); }}
									/>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setShowThirdUser(true)}
									className="text-sm text-amber-500 hover:text-amber-600 font-medium cursor-pointer"
								>
									+ Add Player 3
								</button>
							)}

							<div className="flex flex-col sm:flex-row gap-4">
								<div className="flex-1">
									<label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
									<Select value={selectedSeason} onValueChange={(v) => setSelectedSeason(v as AnimeSeason)}>
										<SelectTrigger className="rounded-2xl border-2 border-yellow-100 h-12">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{SEASONS.map((s) => (
												<SelectItem key={s} value={s}>
													{s === "WINTER" && "❄️ "}{s === "SPRING" && "🌸 "}{s === "SUMMER" && "☀️ "}{s === "FALL" && "🍂 "}{s}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex-1">
									<label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
									<Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
										<SelectTrigger className="rounded-2xl border-2 border-yellow-100 h-12">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{years.map((y) => (
												<SelectItem key={y} value={y.toString()}>{y}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{userErrors.length > 0 && (
								<div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
									{userErrors.map((err) => (
										<p key={err} className="text-sm text-red-600">{err}</p>
									))}
								</div>
							)}

							<Button
								onClick={handlePlay}
								disabled={!inputA.trim() || !inputB.trim()}
								className="w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 hover:from-yellow-500 hover:via-amber-500 hover:to-orange-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 text-lg disabled:opacity-50"
							>
								🎮 Play! 🏆
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Results */}
				{hasSubmitted && (
					<div className="space-y-8">
						{isLoading ? (
							<AnimeLoading />
						) : mergedEntries ? (
							<>
								<div className="text-center mb-4">
									<h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent mb-2">
										🏆 {submittedSeason} {submittedYear} Results 🏆
									</h2>
								</div>
								<GameBoard
									mergedEntries={mergedEntries}
									users={activeUsers}
									userNames={activeUserNames}
								/>
							</>
						) : null}
					</div>
				)}
			</div>
		</main>
	);
}
