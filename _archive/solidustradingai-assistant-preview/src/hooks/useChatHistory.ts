import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('solidus-chat-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out any empty sessions so they don't pile up on reload
        const validSessions = parsed.filter((s: ChatSession) => s.messages && s.messages.length > 0);
        
        const newSession: ChatSession = {
          id: uuidv4(),
          title: 'New Conversation',
          updatedAt: Date.now(),
          messages: []
        };
        
        setSessions([newSession, ...validSessions]);
        setActiveSessionId(newSession.id);
      } catch (e) {
        console.error("Failed to load chat history", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
    setIsLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to local storage whenever sessions change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('solidus-chat-history', JSON.stringify(sessions));
    }
  }, [sessions, isLoaded]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Conversation',
      updatedAt: Date.now(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const updateActiveSession = (messages: ChatMessage[]) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        // Auto-generate title from first user message if it's currently "New Conversation"
        let title = session.title;
        if (title === 'New Conversation' && messages.length > 0) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
             title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        
        return {
          ...session,
          title,
          updatedAt: Date.now(),
          messages
        };
      }
      return session;
    }));
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          // Don't call createNewSession here to avoid set state loop, 
          // just let the activeSessionId be null temporarily and useEffect will handle it
          setTimeout(() => createNewSession(), 0);
        }
      }
      return remaining;
    });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return {
    sessions,
    activeSessionId,
    activeSession,
    isLoaded,
    setActiveSessionId,
    createNewSession,
    updateActiveSession,
    deleteSession
  };
}
