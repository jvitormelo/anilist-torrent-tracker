import { useState, useEffect, useRef } from "react";
import { useMutation as convexUseMutation, useQuery as convexUseQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { MessageCircle, Send, X } from "lucide-react";
import { ChatLoading } from "~/components/KawaiiLoading";

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

// Utility function to format timestamp
const formatTime = (timestamp: number): string => {
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

// Chat toggle button component
const ChatToggleButton = ({
  unreadCount,
  onOpen
}: {
  unreadCount: number;
  onOpen: () => void;
}) => (
  <div className="fixed bottom-4 left-4 z-50">
    <Button
      onClick={onOpen}
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
);

// Chat header component
const ChatHeader = ({
  onClose
}: {
  onClose: () => void;
}) => (
  <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 flex-shrink-0">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg">💬</span>
        <h3 className="font-bold text-purple-700">Global Chat</h3>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0 hover:bg-purple-200/50 rounded-full"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  </CardHeader>
);

// Message bubble component
const MessageBubble = ({
  message,
  isCurrentUser
}: {
  message: ChatMessage;
  isCurrentUser: boolean;
}) => (
  <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
    <div
      className={`max-w-[80%] p-3 rounded-2xl ${isCurrentUser
        ? "bg-gradient-to-r from-purple-400 to-pink-400 text-white"
        : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800"
        }`}
    >
      {!isCurrentUser && (
        <p className="text-xs font-semibold mb-1 opacity-70">
          {message.userName}
        </p>
      )}
      <p className="text-sm leading-relaxed break-words">
        {message.message}
      </p>
    </div>
    <p className="text-xs text-gray-500 mt-1 px-1">
      {formatTime(message.timestamp)}
    </p>
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className="text-center py-8">
    <div className="text-4xl mb-2">🌸</div>
    <p className="text-gray-500 text-sm">
      No messages yet. Be the first to say hello! ✨
    </p>
  </div>
);

// Messages area component
const MessagesArea = ({
  messages,
  currentUser,
  scrollAreaRef
}: {
  messages: ChatMessage[] | undefined;
  currentUser: { id: number; name: string };
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div className="flex-1 overflow-hidden">
    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
      <div className="space-y-3">
        {messages === undefined ? (
          <ChatLoading />
        ) : messages?.map((msg: ChatMessage) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isCurrentUser={msg.anilistId === currentUser.id}
          />
        ))}

        {(!messages || messages.length === 0) && <EmptyState />}
      </div>
    </ScrollArea>
  </div>
);

// Message input component
const MessageInput = ({
  message,
  onMessageChange,
  onSubmit,
  disabled
}: {
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}) => (
  <form onSubmit={onSubmit} className="p-4 flex-shrink-0">
    <div className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Type your message... ✨"
        className="flex-1 border-2 border-purple-200 rounded-full focus:border-purple-400 focus:ring-purple-400"
        maxLength={500}
      />
      <Button
        type="submit"
        disabled={disabled}
        className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-full px-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
    <p className="text-xs text-gray-500 mt-2 text-center">
      {message.length}/500 characters
    </p>
  </form>
);

// Chat window component
const ChatWindow = ({
  onClose,
  messages,
  currentUser,
  scrollAreaRef,
  message,
  onMessageChange,
  onSubmit
}: {
  onClose: () => void;
  messages: ChatMessage[] | undefined;
  currentUser: { id: number; name: string };
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  message: string;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) => (
  <div className="fixed bottom-4 left-4 z-50 w-96 h-[32rem] bg-white/95 backdrop-blur-sm border-2 border-purple-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
    <ChatHeader onClose={onClose} />

    <div className="flex-1 flex flex-col min-h-0">
      <MessagesArea
        messages={messages}
        currentUser={currentUser}
        scrollAreaRef={scrollAreaRef}
      />

      <Separator className="bg-purple-200" />

      <MessageInput
        message={message}
        onMessageChange={onMessageChange}
        onSubmit={onSubmit}
        disabled={!message.trim()}
      />
    </div>
  </div>
);

// Main component
export function GlobalChat({ currentUser }: GlobalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);

  const chatMessages = convexUseQuery(api.myFunctions.getChatMessages, { limit: 50 });
  const sendMessage = convexUseMutation(api.myFunctions.sendChatMessage);

  // Handle auto-scroll and unread count
  const handleMessageUpdates = () => {
    if (scrollAreaRef.current && chatMessages) {
      const shouldScroll = chatMessages.length > lastMessageCountRef.current;

      if (shouldScroll && isOpen) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }

      if (!isOpen && shouldScroll) {
        setUnreadCount(prev => prev + (chatMessages.length - lastMessageCountRef.current));
      }

      lastMessageCountRef.current = chatMessages?.length || 0;
    }
  };

  // Handle message sending
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    try {
      await sendMessage({
        anilistId: currentUser.id,
        message: message.trim(),
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Chat state handlers
  const handleOpenChat = () => setIsOpen(true);
  const handleCloseChat = () => setIsOpen(false);

  // Effects
  useEffect(handleMessageUpdates, [chatMessages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  if (!currentUser) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <ChatToggleButton
          unreadCount={unreadCount}
          onOpen={handleOpenChat}
        />
      )}

      {isOpen && (
        <ChatWindow
          onClose={handleCloseChat}
          messages={chatMessages}
          currentUser={currentUser}
          scrollAreaRef={scrollAreaRef}
          message={message}
          onMessageChange={setMessage}
          onSubmit={handleSendMessage}
        />
      )}
    </>
  );
} 