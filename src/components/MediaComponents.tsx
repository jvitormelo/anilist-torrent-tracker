import { api } from "convex/_generated/api";
import { useMutation as convexUseMutation } from "convex/react";
import type { MediaListEntry } from "server";
import { toast } from "sonner";
import { TorrentSection } from "~/components/TorrentSection";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface MediaListCardProps {
	entry: MediaListEntry;
	currentUser?: {
		id: number;
		name: string;
	};
}

interface TorrentActionsProps {
	magnetLink: string;
	animeName: string;
	episode: number;
	torrentName: string;
	resolution?: string;
	seeders?: number;
	currentUser?: {
		id: number;
		name: string;
	};
	size?: "sm" | "default";
}

// Utility functions for media cards
const calculateProgressPercentage = (
	progress: number,
	totalEpisodes?: number,
) => {
	return totalEpisodes ? (progress / totalEpisodes) * 100 : 0;
};

const getTimeRemaining = (nextAiringEpisode?: { timeUntilAiring: number }) => {
	if (!nextAiringEpisode) return null;

	const timeUntilAiring = nextAiringEpisode.timeUntilAiring;

	if (timeUntilAiring <= 0) return "Available now!";

	const days = Math.floor(timeUntilAiring / (24 * 60 * 60));
	const hours = Math.floor((timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
	const minutes = Math.floor((timeUntilAiring % (60 * 60)) / 60);

	if (days > 0) {
		return `${days}d ${hours}h`;
	} else if (hours > 0) {
		return `${hours}h ${minutes}m`;
	} else {
		return `${minutes}m`;
	}
};

const checkEpisodeAvailability = (
	userProgress: number,
	nextAiringEpisode?: { episode: number },
) => {
	if (!nextAiringEpisode) return true;

	const userNeedsEpisode = userProgress + 1;
	const nextAiringEpisodeNumber = nextAiringEpisode.episode;

	return userNeedsEpisode < nextAiringEpisodeNumber;
};

// Reusable component for torrent download and copy actions
export function TorrentActions({
	magnetLink,
	animeName,
	episode,
	torrentName,
	resolution,
	seeders,
	currentUser,
	size = "sm",
}: TorrentActionsProps) {
	const recordDownload = convexUseMutation(
		api.myFunctions.recordTorrentDownload,
	);

	const handleDownloadClick = async () => {
		if (currentUser) {
			try {
				await recordDownload({
					anilistId: currentUser.id,
					animeName: animeName,
					episode: episode,
					torrentName: torrentName,
					magnetLink: magnetLink,
					resolution: resolution,
					seeders: seeders,
				});
			} catch (error) {
				console.error("Failed to record download:", error);
			}
		}
	};

	const handleCopyClick = async () => {
		navigator.clipboard.writeText(magnetLink);
		toast.success("Magnet link copied to clipboard! 📋", {
			description: "You can now paste it in your torrent client",
			duration: 3000,
		});

		// Also record as download since copying usually means downloading
		if (currentUser) {
			try {
				await recordDownload({
					anilistId: currentUser.id,
					animeName: animeName,
					episode: episode,
					torrentName: torrentName,
					magnetLink: magnetLink,
					resolution: resolution,
					seeders: seeders,
				});
			} catch (error) {
				console.error("Failed to record download:", error);
			}
		}
	};

	return (
		<div className="flex flex-row sm:flex-col gap-2 items-stretch sm:items-end flex-shrink-0 w-full sm:w-[120px]">
			<Button
				asChild
				size={size}
				className="bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-200 w-full"
			>
				<a href={magnetLink} onClick={handleDownloadClick}>
					💾 Download
				</a>
			</Button>
			<Button
				size={size}
				variant="outline"
				onClick={handleCopyClick}
				className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-gray-200 w-full"
			>
				📋 Copy
			</Button>
		</div>
	);
}

export function MediaListCard({ entry, currentUser }: MediaListCardProps) {
	const nextEpisode = entry.progress + 1;
	const progressPercentage = calculateProgressPercentage(
		entry.progress,
		entry.media.episodes ?? undefined,
	);
	const timeRemaining = getTimeRemaining(
		entry.media.nextAiringEpisode ?? undefined,
	);
	const isEpisodeAvailable = checkEpisodeAvailability(
		entry.progress,
		entry.media.nextAiringEpisode ?? undefined,
	);

	console.log(entry.media.title);

	return (
		<Card className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-3xl shadow-xl hover:shadow-2xl transform transition-all duration-300 overflow-hidden">
			<CardContent className="p-6">
				<div className="flex gap-6">
					<div className="flex-shrink-0 relative">
						<div className="absolute -top-2 -left-2 text-2xl">✨</div>
						<img
							src={entry.media.coverImage.large}
							alt={entry.media.title.userPreferred}
							className="w-20 h-24 object-cover rounded-2xl shadow-lg border-2 border-purple-200"
						/>
					</div>
					<div className="flex-1 relative">
						<div className="absolute top-0 right-0 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
							{entry.status}
						</div>

						<a
							href={`https://anilist.co/anime/${entry.media.id}`}
							target="_blank"
							rel="noopener noreferrer"
							className="group inline-block pr-24 mb-2"
						>
							<h3 className="font-bold text-xl text-gray-800 hover:text-purple-600 transition-colors duration-200 group-hover:underline decoration-2 decoration-purple-400 underline-offset-2">
								{entry.media.title.userPreferred}
								<span className="ml-2 text-purple-500 group-hover:animate-bounce inline-block">
									🔗✨
								</span>
							</h3>
						</a>

						<div className="flex flex-wrap gap-2 mb-4">
							<div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-3 py-1 rounded-full">
								<p className="text-sm font-semibold text-blue-700">
									📺 Episode {entry.progress}
									{entry.media.episodes ? `/${entry.media.episodes}` : ""}
								</p>
							</div>

							{entry.media.nextAiringEpisode && (
								<div
									className={`px-3 py-1 rounded-full ${
										isEpisodeAvailable
											? "bg-gradient-to-r from-green-100 to-emerald-100"
											: "bg-gradient-to-r from-orange-100 to-yellow-100"
									}`}
								>
									<p
										className={`text-sm font-semibold ${
											isEpisodeAvailable ? "text-green-700" : "text-orange-700"
										}`}
									>
										⏰ Next: EP {entry.media.nextAiringEpisode.episode}
										{timeRemaining && (
											<span className="ml-1">
												{isEpisodeAvailable
													? " (Available!)"
													: ` (${timeRemaining})`}
											</span>
										)}
									</p>
								</div>
							)}

							{entry.score > 0 && (
								<div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-1 rounded-full">
									<p className="text-sm font-semibold text-orange-700">
										⭐ {entry.score}/10
									</p>
								</div>
							)}
						</div>

						{/* Progress Bar */}
						{entry.media.episodes && (
							<div className="mb-4">
								<div className="bg-gray-200 rounded-full h-2 overflow-hidden">
									<div
										className="bg-gradient-to-r from-purple-400 to-pink-400 h-full transition-all duration-300 rounded-full"
										style={{ width: `${progressPercentage}%` }}
									/>
								</div>
								<p className="text-xs text-gray-500 mt-1">
									{progressPercentage.toFixed(1)}% complete
								</p>
							</div>
						)}
					</div>
				</div>

				<TorrentSection
					searchParams={{
						romajiName: entry.media.title.romaji ?? "",
						englishName: entry.media.title.english ?? "",
						episode: nextEpisode,
					}}
					buttonText={`🔎 Find EP ${nextEpisode}`}
					currentUser={currentUser}
				/>
			</CardContent>
		</Card>
	);
}
