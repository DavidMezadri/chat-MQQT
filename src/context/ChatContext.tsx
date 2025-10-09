import React, { createContext, useState, useEffect } from "react";
import { ChatService } from "../service/ChatService";

interface Message {
  author: string;
  text: string;
  timestamp: string;
}

interface ChatContextType {
  messages: Message[];
  sendMessage: (text: string) => void;
}

export const ChatContext = createContext<ChatContextType>({
  messages: [],
  sendMessage: () => {},
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatService] = useState(() => new ChatService());

  useEffect(() => {
    chatService.connect((msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });
    // Optionally cleanup: return () => chatService.disconnect();
  }, [chatService]);

  const sendMessage = (text: string) => {
    chatService.send(text);
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
};
