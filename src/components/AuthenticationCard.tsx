import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export function AuthenticationCard() {
	const [username, setUsername] = useState("");

	const handleStartTracking = () => {
		if (username.trim()) {
			localStorage.setItem("anilist_username", username.trim());
			window.location.reload();
		}
	};

	return (
		<div className="max-w-md mx-auto text-center">
			{/* Kawaii Header */}
			<div className="mb-12">
				<div className="text-8xl mb-6">🌸✨🌸</div>
				<h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
					🌸 AniList Torrent Tracker ✨
				</h1>
				<p className="text-lg text-gray-600 font-medium mb-4">
					(´｡• ᵕ •｡`) ♡ Your ultimate anime companion! ♡
				</p>
				<p className="text-sm text-gray-500 max-w-2xl mx-auto mb-8">
					Enter your AniList username to track your anime progress and find
					torrents for new episodes instantly. Never miss your favorite shows
					again! 🎬📺
				</p>
			</div>

			{/* Beautiful Input Card */}
			<Card className="bg-white/90 backdrop-blur-sm border-2 border-pink-200 rounded-3xl shadow-2xl overflow-hidden">
				<CardContent className="p-8">
					<div className="text-center mb-6">
						<div className="text-4xl mb-4">🎀</div>
						<h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
							Welcome! ♡
						</h2>
						<p className="text-gray-600">
							Enter your public AniList username to start!
						</p>
					</div>

					<div className="space-y-4">
						<Input
							type="text"
							placeholder="AniList Username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="rounded-2xl border-2 border-purple-100 focus:border-purple-300 h-12 text-center text-lg"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleStartTracking();
								}
							}}
						/>

						<div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-2xl">
							<div className="flex items-center gap-3 mb-2">
								<span className="text-2xl">📺</span>
								<span className="font-semibold text-blue-700">
									Watch Progress
								</span>
							</div>
							<p className="text-sm text-gray-600">
								Track your currently watching anime
							</p>
						</div>

						<div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-2xl">
							<div className="flex items-center gap-3 mb-2">
								<span className="text-2xl">🔍</span>
								<span className="font-semibold text-green-700">
									Find Torrents
								</span>
							</div>
							<p className="text-sm text-gray-600">
								Instantly search for anime torrents
							</p>
						</div>
					</div>

					<Button
						onClick={handleStartTracking}
						disabled={!username.trim()}
						className="w-full mt-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 text-lg disabled:opacity-50"
					>
						💖 Start Tracking 💖
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
