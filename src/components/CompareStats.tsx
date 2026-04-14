import {
	Bar,
	BarChart,
	CartesianGrid,
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	XAxis,
	YAxis,
} from "recharts";
import type { CompareStats as CompareStatsType } from "~/lib/compare-utils";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "~/components/ui/chart";

import { USER_HEX_COLORS, USER_GRADIENT_CLASSES } from "~/lib/constants";

interface CompareStatsProps {
	stats: CompareStatsType;
	userNames: string[];
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewCards({ stats, userNames }: CompareStatsProps) {
	const mostAnime = userNames.reduce((a, b) =>
		(stats.animeCount[a] || 0) >= (stats.animeCount[b] || 0) ? a : b,
	);
	const highestAvg = userNames.reduce((a, b) =>
		(stats.averageScores[a] || 0) >= (stats.averageScores[b] || 0) ? a : b,
	);

	return (
		<div className="space-y-6">
			{/* Summary cards */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
				<div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl p-4 border-2 border-pink-200 text-center">
					<div className="text-3xl mb-1">{stats.sharedCount}</div>
					<div className="text-sm text-gray-600 font-medium">Shared Anime</div>
				</div>
				{userNames.map((name, i) => (
					<div
						key={name}
						className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border-2 border-purple-200 text-center"
					>
						<div className="text-3xl mb-1">{stats.animeCount[name] || 0}</div>
						<div className="text-sm text-gray-600 font-medium truncate">
							<span className={`bg-gradient-to-r ${USER_GRADIENT_CLASSES[i]} bg-clip-text text-transparent font-bold`}>
								{name}
							</span>
						</div>
						<div className="text-xs text-gray-400 mt-1">
							{stats.uniqueCounts[name] || 0} unique
						</div>
					</div>
				))}
			</div>

			{/* Average scores */}
			<div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-100">
				<h3 className="text-lg font-bold text-gray-800 mb-4">Average Scores</h3>
				<div className="space-y-3">
					{userNames.map((name, i) => {
						const avg = stats.averageScores[name] || 0;
						return (
							<div key={name} className="flex items-center gap-3">
								<span className={`bg-gradient-to-r ${USER_GRADIENT_CLASSES[i]} bg-clip-text text-transparent font-bold min-w-[100px] truncate`}>
									{name}
								</span>
								<div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
									<div
										className="h-full rounded-full transition-all duration-500"
										style={{
											width: `${(avg / 10) * 100}%`,
											backgroundColor: USER_HEX_COLORS[i],
										}}
									/>
								</div>
								<span className="font-bold text-gray-700 min-w-[40px] text-right">
									{avg > 0 ? avg.toFixed(1) : "N/A"}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Fun highlights */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-yellow-200">
					<div className="text-2xl mb-2">📺</div>
					<div className="text-sm font-medium text-gray-700">Watches the Most</div>
					<div className="text-lg font-bold text-gray-800">{mostAnime}</div>
					<div className="text-xs text-gray-500">{stats.animeCount[mostAnime]} anime this season</div>
				</div>
				<div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
					<div className="text-2xl mb-2">⭐</div>
					<div className="text-sm font-medium text-gray-700">Highest Average Score</div>
					<div className="text-lg font-bold text-gray-800">{highestAvg}</div>
					<div className="text-xs text-gray-500">
						{stats.averageScores[highestAvg] > 0
							? `${stats.averageScores[highestAvg].toFixed(1)} / 10`
							: "No scores yet"}
					</div>
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Score Distribution Tab
// ============================================================================

function ScoreDistributionChart({ stats, userNames }: CompareStatsProps) {
	const chartData = Array.from({ length: 10 }, (_, i) => {
		const score = i + 1;
		const row: Record<string, number | string> = { score: score.toString() };
		for (const name of userNames) {
			row[name] = stats.scoreDistribution[name]?.[score] || 0;
		}
		return row;
	});

	const chartConfig: ChartConfig = {};
	for (let i = 0; i < userNames.length; i++) {
		chartConfig[userNames[i]] = {
			label: userNames[i],
			color: USER_HEX_COLORS[i],
		};
	}

	return (
		<div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-100">
			<h3 className="text-lg font-bold text-gray-800 mb-4">Score Distribution</h3>
			<ChartContainer config={chartConfig} className="h-[300px] w-full">
				<BarChart data={chartData}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="score" label={{ value: "Score", position: "insideBottom", offset: -5 }} />
					<YAxis allowDecimals={false} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<ChartLegend content={<ChartLegendContent />} />
					{userNames.map((name, i) => (
						<Bar
							key={name}
							dataKey={name}
							fill={USER_HEX_COLORS[i]}
							radius={[4, 4, 0, 0]}
						/>
					))}
				</BarChart>
			</ChartContainer>
		</div>
	);
}

// ============================================================================
// Genre Radar Tab
// ============================================================================

function GenreRadarChart({ stats, userNames }: CompareStatsProps) {
	// Collect all genres and find top 8
	const genreTotals: Record<string, number> = {};
	for (const name of userNames) {
		for (const [genre, count] of Object.entries(stats.genreDistribution[name] || {})) {
			genreTotals[genre] = (genreTotals[genre] || 0) + count;
		}
	}
	const topGenres = Object.entries(genreTotals)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([genre]) => genre);

	if (topGenres.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No genre data available for this season.
			</div>
		);
	}

	const chartData = topGenres.map((genre) => {
		const row: Record<string, number | string> = { genre };
		for (const name of userNames) {
			row[name] = stats.genreDistribution[name]?.[genre] || 0;
		}
		return row;
	});

	const chartConfig: ChartConfig = {};
	for (let i = 0; i < userNames.length; i++) {
		chartConfig[userNames[i]] = {
			label: userNames[i],
			color: USER_HEX_COLORS[i],
		};
	}

	return (
		<div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-100">
			<h3 className="text-lg font-bold text-gray-800 mb-4">Genre Preferences</h3>
			<ChartContainer config={chartConfig} className="h-[350px] w-full">
				<RadarChart data={chartData}>
					<PolarGrid />
					<PolarAngleAxis dataKey="genre" className="text-xs" />
					<ChartTooltip content={<ChartTooltipContent />} />
					<ChartLegend content={<ChartLegendContent />} />
					{userNames.map((name, i) => (
						<Radar
							key={name}
							name={name}
							dataKey={name}
							stroke={USER_HEX_COLORS[i]}
							fill={USER_HEX_COLORS[i]}
							fillOpacity={0.15}
						/>
					))}
				</RadarChart>
			</ChartContainer>
		</div>
	);
}

// ============================================================================
// Tags & Disagreements Tab
// ============================================================================

function TagsAndDisagreements({ stats, userNames }: CompareStatsProps) {
	return (
		<div className="space-y-6">
			{/* Top tags per user */}
			<div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-100">
				<h3 className="text-lg font-bold text-gray-800 mb-4">Top Tags</h3>
				<div className="space-y-4">
					{userNames.map((name, i) => {
						const tags = Object.entries(stats.tagDistribution[name] || {})
							.sort((a, b) => b[1] - a[1])
							.slice(0, 10);
						return (
							<div key={name}>
								<div className={`bg-gradient-to-r ${USER_GRADIENT_CLASSES[i]} bg-clip-text text-transparent font-bold mb-2`}>
									{name}
								</div>
								<div className="flex flex-wrap gap-1.5">
									{tags.length > 0 ? (
										tags.map(([tag, count]) => (
											<Badge
												key={tag}
												variant="outline"
												className="text-xs"
												style={{ borderColor: USER_HEX_COLORS[i], color: USER_HEX_COLORS[i] }}
											>
												{tag} ({count})
											</Badge>
										))
									) : (
										<span className="text-sm text-gray-400">No tag data</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Biggest disagreements */}
			{stats.biggestDisagreements.length > 0 && (
				<div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200">
					<h3 className="text-lg font-bold text-gray-800 mb-4">
						🔥 Biggest Disagreements
					</h3>
					<div className="space-y-3">
						{stats.biggestDisagreements.map((item) => (
							<div
								key={item.media.id}
								className="flex items-center gap-3 bg-white/60 rounded-xl p-3"
							>
								<img
									src={item.media.coverImage.large}
									alt={item.media.title.userPreferred}
									className="w-8 h-12 rounded-lg object-cover"
								/>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm text-gray-800 truncate">
										{item.media.title.userPreferred}
									</p>
									<div className="flex gap-2 mt-1">
										{userNames.map((name, i) => (
											<span key={name} className="text-xs" style={{ color: USER_HEX_COLORS[i] }}>
												{item.scores[name] != null ? `${name}: ${item.scores[name]}` : ""}
											</span>
										))}
									</div>
								</div>
								<Badge variant="destructive" className="text-xs shrink-0">
									{item.maxDelta} gap
								</Badge>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Biggest agreements */}
			{stats.biggestAgreements.length > 0 && (
				<div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
					<h3 className="text-lg font-bold text-gray-800 mb-4">
						💚 Most Agreed On
					</h3>
					<div className="space-y-3">
						{stats.biggestAgreements.map((item) => (
							<div
								key={item.media.id}
								className="flex items-center gap-3 bg-white/60 rounded-xl p-3"
							>
								<img
									src={item.media.coverImage.large}
									alt={item.media.title.userPreferred}
									className="w-8 h-12 rounded-lg object-cover"
								/>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm text-gray-800 truncate">
										{item.media.title.userPreferred}
									</p>
									<div className="flex gap-2 mt-1">
										{userNames.map((name, i) => (
											<span key={name} className="text-xs" style={{ color: USER_HEX_COLORS[i] }}>
												{item.scores[name] != null ? `${name}: ${item.scores[name]}` : ""}
											</span>
										))}
									</div>
								</div>
								<Badge variant="outline" className="text-xs shrink-0 border-green-300 text-green-700">
									{item.maxDelta === 0 ? "Same!" : `${item.maxDelta} gap`}
								</Badge>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Main CompareStats Component
// ============================================================================

export function CompareStats({ stats, userNames }: CompareStatsProps) {
	return (
		<div className="space-y-6">
			<h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent text-center">
				📊 Statistics 📊
			</h2>

			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="w-full flex flex-wrap h-auto">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="scores">Scores</TabsTrigger>
					<TabsTrigger value="genres">Genres</TabsTrigger>
					<TabsTrigger value="tags">Tags & Opinions</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-4">
					<OverviewCards stats={stats} userNames={userNames} />
				</TabsContent>

				<TabsContent value="scores" className="mt-4">
					<ScoreDistributionChart stats={stats} userNames={userNames} />
				</TabsContent>

				<TabsContent value="genres" className="mt-4">
					<GenreRadarChart stats={stats} userNames={userNames} />
				</TabsContent>

				<TabsContent value="tags" className="mt-4">
					<TagsAndDisagreements stats={stats} userNames={userNames} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
