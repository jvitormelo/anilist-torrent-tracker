interface KawaiiLoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "chat" | "anime" | "search";
}

export function KawaiiLoading({ 
  message = "Loading...", 
  size = "md",
  variant = "default" 
}: KawaiiLoadingProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl", 
    lg: "text-6xl"
  };

  const containerClasses = {
    sm: "py-4",
    md: "py-8",
    lg: "py-12"
  };

  const getVariantContent = () => {
    switch (variant) {
      case "chat":
        return {
          emojis: ["💬", "✨", "💝"],
          colors: "from-purple-400 via-pink-400 to-blue-400",
          message: message || "Loading chat... ✨"
        };
      case "anime":
        return {
          emojis: ["🌸", "📺", "✨"],
          colors: "from-pink-400 via-purple-400 to-blue-400", 
          message: message || "Loading anime... 🌸"
        };
      case "search":
        return {
          emojis: ["🔍", "💫", "🌟"],
          colors: "from-blue-400 via-cyan-400 to-purple-400",
          message: message || "Searching... 🔍"
        };
      default:
        return {
          emojis: ["🌸", "✨", "💖"],
          colors: "from-pink-400 via-purple-400 to-blue-400",
          message: message || "Loading... ✨"
        };
    }
  };

  const { emojis, colors, message: displayMessage } = getVariantContent();

  return (
    <div className={`text-center ${containerClasses[size]}`}>
      {/* Animated Emojis */}
      <div className="flex justify-center items-center gap-2 mb-4">
        {emojis.map((emoji, index) => (
          <div
            key={emoji}
            className={`${sizeClasses[size]} animate-bounce`}
            style={{
              animationDelay: `${index * 0.3}s`,
              animationDuration: "1.5s"
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Kawaii Pulsing Dots */}
      <div className="flex justify-center items-center gap-2 mb-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors} animate-pulse`}
            style={{
              animationDelay: `${index * 0.2}s`,
              animationDuration: "1s"
            }}
          />
        ))}
      </div>

      {/* Loading Message */}
      <p className={`text-gray-600 font-medium ${size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-sm"}`}>
        {displayMessage}
      </p>

      {/* Kawaii Loading Bar */}
      <div className="mt-4 max-w-xs mx-auto">
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${colors} rounded-full transition-all duration-1000 ease-in-out`}
            style={{
              width: "60%",
              animation: "pulse 2s ease-in-out infinite, slide 3s ease-in-out infinite"
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Specialized loading components for different use cases
export function ChatLoading() {
  return <KawaiiLoading variant="chat" size="sm" />;
}

export function AnimeLoading() {
  return <KawaiiLoading variant="anime" size="md" />;
}

export function SearchLoading() {
  return <KawaiiLoading variant="search" size="sm" />;
}

export function FullPageLoading({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
      <KawaiiLoading variant="default" size="lg" message={message} />
    </div>
  );
} 