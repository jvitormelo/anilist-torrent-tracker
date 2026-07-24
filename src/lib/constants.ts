import type { AnimeSeason } from "server";

export const USER_GRADIENT_CLASSES = [
	"from-pink-400 to-rose-400",
	"from-purple-400 to-indigo-400",
	"from-blue-400 to-cyan-400",
];

export const USER_HEX_COLORS = ["#f472b6", "#a78bfa", "#60a5fa"];

export const SEASON_EMOJI: Record<AnimeSeason, string> = {
	WINTER: "❄️",
	SPRING: "🌸",
	SUMMER: "☀️",
	FALL: "🍂",
};

export const STATUS_META: Record<string, { label: string; className: string }> = {
	CURRENT: { label: "Watching", className: "bg-blue-100 text-blue-700 border-blue-200" },
	COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 border-green-200" },
	PLANNING: { label: "Planning", className: "bg-purple-100 text-purple-700 border-purple-200" },
	DROPPED: { label: "Dropped", className: "bg-red-100 text-red-700 border-red-200" },
	PAUSED: { label: "Paused", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
	REPEATING: { label: "Rewatching", className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

export const STATUS_ORDER = [
	"CURRENT",
	"COMPLETED",
	"REPEATING",
	"PAUSED",
	"PLANNING",
	"DROPPED",
];

export function getStatusMeta(status: string) {
	return (
		STATUS_META[status] || {
			label: status,
			className: "bg-gray-100 text-gray-700 border-gray-200",
		}
	);
}
