interface OnlineUsersCounterProps {
    count: number | undefined;
}

export function OnlineUsersCounter({ count }: OnlineUsersCounterProps) {
    return (
        <div className="fixed top-4 right-4 z-50">
            <div className="bg-white/90 backdrop-blur-sm border-2 border-green-200 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700">
                        {count !== undefined ? count : 0} online
                    </span>
                    <span className="text-sm">👥</span>
                </div>
            </div>
        </div>
    );
} 