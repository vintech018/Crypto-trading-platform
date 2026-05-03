"use client";

import { useState } from "react";
import { useChatHistory, type ChatMessage } from "@/hooks/useChatHistory";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { Bot, PlusIcon, Trash2Icon, MenuIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    isLoaded,
    setActiveSessionId,
    createNewSession,
    updateActiveSession,
    deleteSession
  } = useChatHistory();

  const [isTyping, setIsTyping] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSendMessage = async (content: string, imageBase64?: string) => {
    if (!activeSession) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      images: imageBase64 ? [imageBase64] : undefined
    };

    const newMessages = [...activeSession.messages, userMessage];
    updateActiveSession(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        
        updateActiveSession([...newMessages, { role: 'assistant', content: fullContent }]);
      }
    } catch (error) {
      console.error('Error in chat request:', error);
      updateActiveSession([...newMessages, { role: 'assistant', content: 'An error occurred while communicating with the AI. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center bg-black text-white">Loading Pablo...</div>;
  }

  const SidebarContent = () => (
    <>
      <div className="p-4">
        <button 
          onClick={() => {
            createNewSession();
            setMobileMenuOpen(false);
          }}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm font-medium text-white"
        >
          <span className="flex items-center gap-2">
            <img src="/logo-white.svg" alt="Solidus" className="w-4 h-4 object-contain" />
            New Chat
          </span>
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
        {sessions.map(session => (
          <div key={session.id} className="relative group">
            <button
              onClick={() => {
                setActiveSessionId(session.id);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors pr-10 truncate",
                activeSessionId === session.id 
                  ? "bg-white/10 text-white" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {session.title || "New Conversation"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(session.id);
              }}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity",
                activeSessionId === session.id && "opacity-100"
              )}
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 text-sm text-white/60">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 p-1.5">
            <img src="/logo-white.svg" alt="Solidus" className="w-full h-full object-contain" />
          </div>
          <div className="truncate">
            <p className="font-medium text-white/90">Pablo AI</p>
            <p className="text-xs">Trading Analyst</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans">
      {/* Mobile Header & Menu Toggle */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/10">
         <div className="flex items-center gap-2 text-white">
           <img src="/logo-white.svg" alt="Solidus" className="w-5 h-5 object-contain" />
           <span className="font-medium text-sm">Pablo AI</span>
         </div>
         <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white/80 p-2">
           {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
         </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/95 flex flex-col pt-16">
           <SidebarContent />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="w-64 bg-[#0a0a0a] border-r border-white/10 flex-col hidden md:flex shrink-0">
        <SidebarContent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full w-full max-w-full overflow-hidden pt-14 md:pt-0">
        <AnimatedAIChat 
          messages={activeSession?.messages || []}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
        />
      </div>
    </div>
  );
}
