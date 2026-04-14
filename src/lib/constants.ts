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
