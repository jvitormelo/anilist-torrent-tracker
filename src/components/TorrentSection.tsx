import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { scrapNyaa, type TorrentResult } from "server";
import { TorrentActions } from "~/components/MediaComponents";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

interface TorrentSectionProps {
	searchParams: {
		romajiName: string;
		englishName: string;
		episode?: number;
		episodes?: number[];
	};
	buttonText?: string;
	currentUser?: {
		id: number;
		name: string;
	};
}

interface TorrentItemProps {
	torrent: TorrentResult;
	animeName: string;
	currentUser?: {
		id: number;
		name: string;
	};
}

function TorrentItem({ torrent, animeName, currentUser }: TorrentItemProps) {
	return (
		<Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-100 rounded-2xl hover:shadow-lg transition-all duration-200">
			<CardContent className="p-4">
				<div className="flex flex-col sm:flex-row items-start gap-4">
					<div className="flex-1 min-w-0 w-full sm:max-w-[calc(100%-140px)]">
						<h5
							title={torrent.name}
							className="font-semibold text-sm text-gray-800 truncate mb-2"
						>
							{torrent.name}
						</h5>
						<div className="flex flex-wrap gap-2">
							<Badge
								variant="secondary"
								className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 font-semibold border-green-200 rounded-full px-3 py-1"
							>
								🌱 {torrent.seeders} seeders
							</Badge>
							{torrent.resolution && (
								<Badge
									variant="outline"
									className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 font-semibold border-blue-200 rounded-full px-3 py-1"
								>
									📺 {torrent.resolution}
								</Badge>
							)}
							{torrent.episode && (
								<Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-semibold border-purple-200 rounded-full px-3 py-1">
									🎬 EP {torrent.episode}
								</Badge>
							)}
							<Badge
								variant="secondary"
								className="bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 font-semibold border-orange-200 rounded-full px-3 py-1"
							>
								📅 {torrent.date.toLocaleDateString()}
							</Badge>
						</div>
					</div>
					<TorrentActions
						magnetLink={torrent.magnetLink}
						animeName={animeName}
						episode={torrent.episode || 0}
						torrentName={torrent.name}
						resolution={torrent.resolution}
						seeders={parseInt(torrent.seeders) || undefined}
						currentUser={currentUser}
						size="sm"
					/>
				</div>
			</CardContent>
		</Card>
	);
}

export function TorrentSection({
	searchParams,
	buttonText = "🔎 Find Torrents",
	currentUser,
}: TorrentSectionProps) {
	const [showTorrents, setShowTorrents] = useState(false);
	const [torrentsByEpisode, setTorrentsByEpisode] = useState<
		Record<number, TorrentResult[]>
	>({});

	const getLinkMutation = useMutation({
		mutationFn: async (params: {
			romajiName: string;
			englishName: string;
			episode?: number;
			episodes?: number[];
		}) => {
			if (params.episodes && params.episodes.length > 0) {
				const results = await Promise.all(
					params.episodes.map(async (ep) => {
						const torrents = await scrapNyaa({
							data: {
								romajiName: params.romajiName,
								englishName: params.englishName,
								episode: ep,
							},
						});
						return { ep, torrents };
					}),
				);
				return results.reduce(
					(acc, { ep, torrents }) => {
						acc[ep] = torrents;
						return acc;
					},
					{} as Record<number, TorrentResult[]>,
				);
			}

			const ep = params.episode || 0;
			const torrents = await scrapNyaa({
				data: {
					romajiName: params.romajiName,
					englishName: params.englishName,
					episode: ep,
				},
			});
			return { [ep]: torrents };
		},
		onSuccess: (data) => {
			setTorrentsByEpisode(data);
			setShowTorrents(true);
		},
	});

	const totalTorrents = Object.values(torrentsByEpisode).flat().length;
	const episodesFound = Object.keys(torrentsByEpisode)
		.map(Number)
		.sort((a, b) => a - b);

	return (
		<>
			<div className="flex gap-3 mt-6">
				<Button
					onClick={() => {
						getLinkMutation.mutate(searchParams);
					}}
					disabled={getLinkMutation.isPending}
					className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-200"
				>
					{getLinkMutation.isPending ? (
						<div className="flex items-center gap-2">
							<span className="animate-spin">🔍</span>
							Searching...
						</div>
					) : (
						buttonText
					)}
				</Button>

				{totalTorrents > 0 && (
					<Button
						onClick={() => setShowTorrents(!showTorrents)}
						variant="secondary"
						className="bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 text-blue-700 font-semibold px-6 py-2 rounded-full shadow-md hover:shadow-lg transform transition-all duration-200 border-2 border-blue-200"
					>
						{showTorrents ? "🙈 Hide" : "👀 Show"} Torrents ({totalTorrents}) ✨
					</Button>
				)}
			</div>

			{/* Toggleable Torrent Results */}
			{showTorrents && totalTorrents > 0 && (
				<>
					<Separator className="my-6 bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 h-0.5" />
					<div className="space-y-8">
						<h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
							<span>🌈</span> Available Torrents <span>🌈</span>
						</h4>

						{episodesFound.map((ep) => {
							const torrents = torrentsByEpisode[ep];
							if (!torrents || torrents.length === 0) return null;

							return (
								<div key={ep} className="space-y-4">
									<div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 rounded-xl border border-purple-100">
										<span className="text-xl">📦</span>
										<h5 className="font-bold text-gray-700">Episode {ep}</h5>
										<Badge variant="secondary" className="ml-auto">
											{torrents.length} results
										</Badge>
									</div>
									<div className="space-y-3 pr-4 ml-4">
										{torrents.map((torrent) => (
											<TorrentItem
												key={`${torrent.name}-${torrent.date.getTime()}`}
												torrent={torrent}
												animeName={searchParams.romajiName}
												currentUser={currentUser}
											/>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</>
			)}
		</>
	);
}
