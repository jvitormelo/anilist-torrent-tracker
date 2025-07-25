import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export function AuthenticationCard() {
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
                    Connect with AniList to track your anime progress, get real-time
                    notifications, and find torrents for new episodes instantly. Never
                    miss your favorite shows again! 🎬📺
                </p>
            </div>

            {/* Beautiful Sign In Card */}
            <Card className="bg-white/90 backdrop-blur-sm border-2 border-pink-200 rounded-3xl shadow-2xl overflow-hidden">
                <CardContent className="p-8">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-4">🎀</div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                            Welcome Back! ♡
                        </h2>
                        <p className="text-gray-600">
                            Sign in with AniList to track your anime and find torrents!
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-2xl">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">🔔</span>
                                <span className="font-semibold text-purple-700">
                                    Notifications
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">
                                Get notified when new episodes air
                            </p>
                        </div>

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
                        asChild
                        className="w-full mt-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 hover:from-pink-500 hover:via-purple-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 text-lg"
                    >
                        <a
                            href={`https://anilist.co/api/v2/oauth/authorize?client_id=${import.meta.env.VITE_ANILIST_CLIENT_ID}&response_type=token`}
                        >
                            💖 Sign in with AniList 💖
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
} 