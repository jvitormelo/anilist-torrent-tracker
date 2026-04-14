import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import type { AnimeSeason, AnilistUser, SeasonMediaEntry } from "server";
import { userQueryOptions, seasonListQueryOptions } from "~/lib/queries";
import {
	getCurrentSeason,
	getYearRange,
	SEASONS,
	filterBySeason,
	mergeUserData,
	type MergedAnimeEntry,
} from "~/lib/compare-utils";

export const seasonSearchSchema = z.object({
	userA: z.string().optional(),
	userB: z.string().optional(),
	userC: z.string().optional(),
	season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL", "ALL"]).optional(),
	year: z.coerce.number().optional(),
});

export type SeasonSearch = z.infer<typeof seasonSearchSchema>;

const YEARS = getYearRange();

export function useSeasonComparison(
	search: SeasonSearch,
	navigateTo: "/compare" | "/game",
) {
	const navigate = useNavigate();
	const currentSeason = getCurrentSeason();

	const [inputA, setInputA] = useState(search.userA || "sanfordmarshall");
	const [inputB, setInputB] = useState(search.userB || "Jediahsk");
	const [inputC, setInputC] = useState(search.userC || "");
	const [showThirdUser, setShowThirdUser] = useState(!!search.userC);
	const [selectedSeason, setSelectedSeason] = useState<AnimeSeason | "ALL">(
		search.season || currentSeason.season,
	);
	const [selectedYear, setSelectedYear] = useState(
		search.year || currentSeason.year,
	);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const submittedA = search.userA;
	const submittedB = search.userB;
	const submittedC = search.userC;
	const submittedSeason = search.season;
	const submittedYear = search.year;

	const userAQuery = useQuery(userQueryOptions(submittedA));
	const userBQuery = useQuery(userQueryOptions(submittedB));
	const userCQuery = useQuery(userQueryOptions(submittedC));

	const listAQuery = useQuery(seasonListQueryOptions(submittedA));
	const listBQuery = useQuery(seasonListQueryOptions(submittedB));
	const listCQuery = useQuery(seasonListQueryOptions(submittedC));

	const handleSubmit = () => {
		const newErrors: Record<string, string> = {};
		if (!inputA.trim()) newErrors.userA = "Username required";
		if (!inputB.trim()) newErrors.userB = "Username required";
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}
		setErrors({});

		navigate({
			to: navigateTo,
			search: {
				userA: inputA.trim(),
				userB: inputB.trim(),
				userC: showThirdUser && inputC.trim() ? inputC.trim() : undefined,
				season: selectedSeason,
				year: selectedYear,
			},
		});
	};

	const hasSubmitted = !!(submittedA && submittedB && submittedSeason && submittedYear);

	const isLoading =
		hasSubmitted &&
		(listAQuery.isLoading ||
			listBQuery.isLoading ||
			!!(submittedC && listCQuery.isLoading));

	const userErrors: string[] = [];
	if (userAQuery.error) userErrors.push(`User A (${submittedA}): ${userAQuery.error.message}`);
	if (userBQuery.error) userErrors.push(`User B (${submittedB}): ${userBQuery.error.message}`);
	if (submittedC && userCQuery.error) userErrors.push(`User C (${submittedC}): ${userCQuery.error.message}`);
	if (listAQuery.error) userErrors.push(`User A list (${submittedA}): ${listAQuery.error.message}`);
	if (listBQuery.error) userErrors.push(`User B list (${submittedB}): ${listBQuery.error.message}`);
	if (submittedC && listCQuery.error) userErrors.push(`User C list (${submittedC}): ${listCQuery.error.message}`);

	const { mergedEntries, activeUsers, activeUserNames } = useMemo(() => {
		if (!hasSubmitted || isLoading || !listAQuery.data || !listBQuery.data) {
			return { mergedEntries: null, activeUsers: [] as { name: string; user: AnilistUser | null }[], activeUserNames: [] as string[] };
		}

		const usersData: { userName: string; entries: SeasonMediaEntry[] }[] = [];
		const users: { name: string; user: AnilistUser | null }[] = [];
		const names: string[] = [];

		if (submittedA && listAQuery.data) {
			usersData.push({ userName: submittedA, entries: filterBySeason(listAQuery.data, submittedSeason as AnimeSeason | "ALL", submittedYear!) });
			users.push({ name: submittedA, user: userAQuery.data || null });
			names.push(submittedA);
		}

		if (submittedB && listBQuery.data) {
			usersData.push({ userName: submittedB, entries: filterBySeason(listBQuery.data, submittedSeason as AnimeSeason | "ALL", submittedYear!) });
			users.push({ name: submittedB, user: userBQuery.data || null });
			names.push(submittedB);
		}

		if (submittedC && listCQuery.data) {
			usersData.push({ userName: submittedC, entries: filterBySeason(listCQuery.data, submittedSeason as AnimeSeason | "ALL", submittedYear!) });
			users.push({ name: submittedC, user: userCQuery.data || null });
			names.push(submittedC);
		}

		return {
			mergedEntries: mergeUserData(usersData),
			activeUsers: users,
			activeUserNames: names,
		};
	}, [
		hasSubmitted, isLoading,
		submittedA, submittedB, submittedC,
		submittedSeason, submittedYear,
		listAQuery.data, listBQuery.data, listCQuery.data,
		userAQuery.data, userBQuery.data, userCQuery.data,
	]);

	return {
		// Form state
		inputA, setInputA,
		inputB, setInputB,
		inputC, setInputC,
		showThirdUser, setShowThirdUser,
		selectedSeason, setSelectedSeason,
		selectedYear, setSelectedYear,
		errors,
		years: YEARS,

		// Submission
		handleSubmit,
		hasSubmitted,
		isLoading,
		userErrors,

		// Processed data
		mergedEntries,
		activeUsers,
		activeUserNames,
		submittedSeason,
		submittedYear,
	};
}
