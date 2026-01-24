import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { useState } from "react";
import {
	getCurrentlyWatching,
	getCurrentUser,
	type MediaListEntry,
} from "server";
import { AuthenticationCard } from "~/components/AuthenticationCard";
import { AnimeLoading, FullPageLoading } from "~/components/KawaiiLoading";
import { MediaListCard } from "~/components/MediaComponents";

export const Route = createFileRoute("/")({
	component: Home,
});

// ============================================================================
// Query Options
// ============================================================================

const useUserQueryOptions = (userName: string | null) =>
	queryOptions({
		queryKey: ["user", userName],
		queryFn: async () => {
			if (!userName) {
				throw new Error("No username provided");
			}
			const response = await getCurrentUser({
				data: { userName },
			});
			return response.data.User;
		},
		enabled: !!userName,
		retry: false,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

const useMediaListQueryOptions = (userName: string | null) =>
	queryOptions({
		queryKey: ["mediaList", userName],
		queryFn: async () => {
			if (!userName) return [];
			const mediaResponse = await getCurrentlyWatching({
				data: {
					userName: userName,
					perPage: 50,
				},
			});

			return mediaResponse.data.Page.mediaList;
		},
		enabled: !!userName,
		staleTime: 2 * 60 * 1000, // 2 minutes
	});

// ============================================================================
// Utility Functions
// ============================================================================

// Media list filtering and sorting logic
const filterAndSortMediaList = (
	mediaList: MediaListEntry[],
	showOnlyAvailable: boolean,
) => {
	return (
		mediaList
			?.filter((entry) => {
				if (!showOnlyAvailable) return true;

				const nextEpisode = entry.media.nextAiringEpisode;
				if (!nextEpisode) return true; // Show if no next episode info

				// Check if the episode the user needs (current progress + 1) is available
				const userNeedsEpisode = entry.progress + 1;
				const nextAiringEpisodeNumber = nextEpisode.episode;

				// If the episode user needs is before the next airing episode, it's available
				return userNeedsEpisode < nextAiringEpisodeNumber;
			})
			.sort((a, b) => {
				// Sort by next airing date (earliest first)
				const aNextAiring = a.media.nextAiringEpisode?.airingAt || 0;
				const bNextAiring = b.media.nextAiringEpisode?.airingAt || 0;

				// If both have next airing dates, sort by earliest
				if (aNextAiring && bNextAiring) {
					return aNextAiring - bNextAiring;
				}

				// If only one has next airing date, prioritize the one with date
				if (aNextAiring && !bNextAiring) return -1;
				if (!aNextAiring && bNextAiring) return 1;

				// If neither has next airing date, maintain original order
				return 0;
			}) || []
	);
};

// Group anime by day of the week
const groupAnimeByDay = (mediaList: MediaListEntry[]) => {
	return mediaList.reduce(
		(groups, entry) => {
			const nextAiring = entry.media.nextAiringEpisode;
			if (!nextAiring) {
				// If no next airing info, put in "Unknown" group
				if (!groups.unknown) groups.unknown = [];
				groups.unknown.push(entry);
				return groups;
			}

			const airingDate = new Date(nextAiring.airingAt * 1000);
			const dayName = airingDate.toLocaleDateString("en-US", {
				weekday: "long",
			});

			if (!groups[dayName]) groups[dayName] = [];
			groups[dayName].push(entry);
			return groups;
		},
		{} as Record<string, MediaListEntry[]>,
	);
};

// ============================================================================
// Constants
// ============================================================================

const DAY_COLORS = {
	Monday: "from-blue-100 to-cyan-100 border-blue-200",
	Tuesday: "from-purple-100 to-pink-100 border-purple-200",
	Wednesday: "from-green-100 to-emerald-100 border-green-200",
	Thursday: "from-orange-100 to-yellow-100 border-orange-200",
	Friday: "from-red-100 to-pink-100 border-red-200",
	Saturday: "from-indigo-100 to-purple-100 border-indigo-200",
	Sunday: "from-pink-100 to-rose-100 border-pink-200",
	unknown: "from-gray-100 to-slate-100 border-gray-200",
};

const DAY_ORDER = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
	"unknown",
];

// ============================================================================
// Custom Hooks
// ============================================================================

const useHomeState = () => {
	const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
	const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(
		() => {
			// Get current day name
			const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
			return { [today]: true };
		},
	);
	const [viewMode, setViewMode] = useState<"grouped" | "list">("list");

	return {
		showOnlyAvailable,
		setShowOnlyAvailable,
		expandedDays,
		setExpandedDays,
		viewMode,
		setViewMode,
	};
};

// ============================================================================
// Main Component Sections
// ============================================================================

interface MainHeaderProps {
	userName?: string;
	onLogout: () => void;
}

function MainHeader({ userName, onLogout }: MainHeaderProps) {
	return (
		<div className="text-center mb-8">
			<div className="flex items-center justify-center gap-4 mb-4">
				<h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
					🌸 AniList Torrent Tracker ✨
				</h1>
				<a
					href="https://github.com/jvitormelo/anilist-torrent-tracker"
					target="_blank"
					rel="noopener noreferrer"
					className="text-gray-600 hover:text-gray-800 hover:scale-110 transition-all duration-200"
					title="View on GitHub"
					aria-label="View project on GitHub"
				>
					<Github className="w-8 h-8" />
				</a>
			</div>
			<div className="flex flex-col items-center gap-2">
				<p className="text-lg text-gray-600 font-medium">
					(´｡• ᵕ •｡`) ♡ Welcome back, {userName}! ♡
				</p>
				<button
					type="button"
					onClick={onLogout}
					className="text-xs text-purple-400 hover:text-purple-600 underline cursor-pointer"
				>
					Change Username
				</button>
			</div>
		</div>
	);
}

interface FilterControlsProps {
	showOnlyAvailable: boolean;
	setShowOnlyAvailable: (value: boolean) => void;
	viewMode: "grouped" | "list";
	setViewMode: (value: "grouped" | "list") => void;
}

function FilterControls({
	showOnlyAvailable,
	setShowOnlyAvailable,
	viewMode,
	setViewMode,
}: FilterControlsProps) {
	return (
		<div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border-2 border-purple-100">
			<label className="flex items-center gap-2 cursor-pointer">
				<input
					type="checkbox"
					checked={showOnlyAvailable}
					onChange={(e) => setShowOnlyAvailable(e.target.checked)}
					className="w-4 h-4 text-purple-600 bg-gray-100 border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
				/>
				<span className="text-sm font-medium text-gray-700">
					🎯 Show only available episodes
				</span>
			</label>

			<div className="flex items-center gap-2">
				<span className="text-sm font-medium text-gray-700">📊 View:</span>
				<select
					value={viewMode}
					onChange={(e) => setViewMode(e.target.value as "grouped" | "list")}
					className="text-sm bg-white border-2 border-purple-200 rounded-lg px-3 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
				>
					<option value="grouped">📅 Grouped by Day</option>
					<option value="list">📋 Simple List</option>
				</select>
			</div>

			{!showOnlyAvailable && (
				<span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded-full">
					Showing all episodes
				</span>
			)}
		</div>
	);
}

interface DayGroupProps {
	day: string;
	animeList: MediaListEntry[];
	isExpanded: boolean;
	onToggle: () => void;
	currentUser?: {
		id: number;
		name: string;
	};
}

function DayGroup({
	day,
	animeList,
	isExpanded,
	onToggle,
	currentUser,
}: DayGroupProps) {
	const dayColor = DAY_COLORS[day as keyof typeof DAY_COLORS];

	return (
		<div className="space-y-4">
			<button
				type="button"
				className={`w-full bg-gradient-to-r ${dayColor} rounded-2xl p-4 border-2 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-left`}
				onClick={onToggle}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onToggle();
					}
				}}
				aria-expanded={isExpanded}
				aria-controls={`day-content-${day}`}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="text-lg transition-transform duration-200 hover:scale-110">
							{isExpanded ? "📂" : "📁"}
						</span>
						<h3 className="text-xl font-bold text-gray-800">
							{day === "unknown" ? "📺 No Airing Info" : `📅 ${day}`}
						</h3>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm font-medium text-gray-600 bg-white/60 px-3 py-1 rounded-full">
							{animeList.length} anime{animeList.length !== 1 ? "s" : ""}
						</span>
						<span className="text-lg transition-transform duration-200">
							{isExpanded ? "🔽" : "▶️"}
						</span>
					</div>
				</div>
			</button>

			{/* Anime Cards for this day */}
			{isExpanded && (
				<div className="space-y-4 ml-4 animate-in slide-in-from-top-2 duration-300">
					{animeList.map((entry) => (
						<MediaListCard
							key={entry.id}
							entry={entry}
							currentUser={currentUser}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

function Home() {
	const {
		showOnlyAvailable,
		setShowOnlyAvailable,
		expandedDays,
		setExpandedDays,
		viewMode,
		setViewMode,
	} = useHomeState();

	const storedUsername =
		typeof window !== "undefined"
			? localStorage.getItem("anilist_username")
			: null;

	// Check authentication using useQuery
	const {
		data: user,
		isLoading: isCheckingUser,
		error: userError,
	} = useQuery(useUserQueryOptions(storedUsername));

	// Fetch media list
	const { data: mediaListData, isLoading: isLoadingMediaList } = useQuery(
		useMediaListQueryOptions(storedUsername),
	);

	const handleLogout = () => {
		localStorage.removeItem("anilist_username");
		window.location.reload();
	};

	// Process media list data
	const filteredMediaList = filterAndSortMediaList(
		mediaListData || [],
		showOnlyAvailable,
	);
	const groupedByDay = groupAnimeByDay(filteredMediaList);

	if (isCheckingUser && storedUsername) {
		return <FullPageLoading message="Fetching user profile... ✨" />;
	}

	if (!storedUsername || !user || userError) {
		return (
			<main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8 flex items-center justify-center">
				<AuthenticationCard />
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8">
			<div className="max-w-4xl mx-auto">
				<MainHeader userName={user?.name} onLogout={handleLogout} />

				{/* Watching Section */}
				<div className="space-y-6">
					{isLoadingMediaList ? (
						<AnimeLoading />
					) : mediaListData && mediaListData.length > 0 ? (
						<>
							<div className="text-center mb-6">
								<h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
									📺 Currently Watching 📺
								</h2>
								<p className="text-gray-600 mb-4">
									Your ongoing anime series ♡ ({filteredMediaList.length} of{" "}
									{mediaListData.length} series)
								</p>

								<FilterControls
									showOnlyAvailable={showOnlyAvailable}
									setShowOnlyAvailable={setShowOnlyAvailable}
									viewMode={viewMode}
									setViewMode={setViewMode}
								/>
							</div>

							{filteredMediaList.length > 0 ? (
								viewMode === "grouped" ? (
									<div className="space-y-8">
										{DAY_ORDER.filter(
											(day) =>
												groupedByDay[day] && groupedByDay[day].length > 0,
										).map((day) => (
											<DayGroup
												key={day}
												day={day}
												animeList={groupedByDay[day]}
												isExpanded={expandedDays[day] || false}
												onToggle={() =>
													setExpandedDays((prev) => ({
														...prev,
														[day]: !prev[day],
													}))
												}
												currentUser={
													user ? { id: user.id, name: user.name } : undefined
												}
											/>
										))}
									</div>
								) : (
									<div className="space-y-4">
										{filteredMediaList.map((entry) => (
											<MediaListCard
												key={entry.id}
												entry={entry}
												currentUser={
													user ? { id: user.id, name: user.name } : undefined
												}
											/>
										))}
									</div>
								)
							) : (
								<div className="text-center py-12">
									<div className="text-4xl mb-4">⏰</div>
									<p className="text-lg text-gray-600">
										No episodes available right now!
										{!showOnlyAvailable && " Try enabling the filter above."}
									</p>
								</div>
							)}
						</>
					) : (
						<div className="text-center py-12">
							<div className="text-4xl mb-4">📚</div>
							<p className="text-lg text-gray-600">
								No anime in your watching list
							</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
