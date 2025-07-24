import { useState, useEffect, useRef } from "react";
import { useMutation as convexUseMutation, useQuery as convexUseQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { MessageCircle, Send, X, Minimize2, Maximize2 } from "lucide-react";

interface ChatMessage {
  _id: string;
  anilistId: number;
  userName: string;
  message: string;
  timestamp: number;
}

interface GlobalChatProps {
  currentUser?: {
    id: number;
    name: string;
  };
}

export function GlobalChat({ currentUser }: GlobalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const chatMessages = convexUseQuery(api.myFunctions.getChatMessages, { limit: 50 });
  const sendMessage = convexUseMutation(api.myFunctions.sendChatMessage);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && chatMessages) {
      const shouldScroll = chatMessages.length > lastMessageCountRef.current;
      if (shouldScroll && (isOpen && !isMinimized)) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
      
      // Update unread count when chat is closed/minimized
      if ((!isOpen || isMinimized) && shouldScroll) {
        setUnreadCount(prev => prev + (chatMessages.length - lastMessageCountRef.current));
      }
      
      lastMessageCountRef.current = chatMessages?.length || 0;
    }
  }, [chatMessages, isOpen, isMinimized]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    try {
      await sendMessage({
        anilistId: currentUser.id,
        userName: currentUser.name,
        message: message.trim(),
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: false 
      });
    } else {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <div className="fixed bottom-4 left-4 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-4 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 relative"
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 left-4 z-50 w-80 h-96 flex flex-col">
          <Card className="bg-white/95 backdrop-blur-sm border-2 border-purple-200 rounded-3xl shadow-2xl overflow-hidden h-full flex flex-col">
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <h3 className="font-bold text-purple-700">Global Chat</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-8 w-8 p-0 hover:bg-purple-200/50 rounded-full"
                  >
                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0 hover:bg-purple-200/50 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Chat Content */}
            {!isMinimized && (
              <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                  <div className="space-y-3">
                    {chatMessages?.map((msg: ChatMessage) => (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${
                          msg.anilistId === currentUser.id ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl ${
                            msg.anilistId === currentUser.id
                              ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white"
                              : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800"
                          }`}
                        >
                          {msg.anilistId !== currentUser.id && (
                            <p className="text-xs font-semibold mb-1 opacity-70">
                              {msg.userName}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed break-words">
                            {msg.message}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 px-1">
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    ))}
                    
                    {(!chatMessages || chatMessages.length === 0) && (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🌸</div>
                        <p className="text-gray-500 text-sm">
                          No messages yet. Be the first to say hello! ✨
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <Separator className="bg-purple-200" />

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message... ✨"
                      className="flex-1 border-2 border-purple-200 rounded-full focus:border-purple-400 focus:ring-purple-400"
                      maxLength={500}
                    />
                    <Button
                      type="submit"
                      disabled={!message.trim()}
                      className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-full px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {message.length}/500 characters
                  </p>
                </form>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
} 