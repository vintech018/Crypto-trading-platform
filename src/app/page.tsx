'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  screenshots?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newUrls = newFiles.map((f) => URL.createObjectURL(f));
      setScreenshots((prev) => [...prev, ...newFiles]);
      setPreviewUrls((prev) => [...prev, ...newUrls]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
      const pastedFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
      if (pastedFiles.length > 0) {
        const newUrls = pastedFiles.map((f) => URL.createObjectURL(f));
        setScreenshots((prev) => [...prev, ...pastedFiles]);
        setPreviewUrls((prev) => [...prev, ...newUrls]);
      }
    }
  };

  const removeImage = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearAllImages = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setScreenshots([]);
    setPreviewUrls([]);
  };

  const handleCopy = (id: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && screenshots.length === 0) return;

    const newUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      screenshots: previewUrls.length > 0 ? [...previewUrls] : undefined,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    const messageToSend = input;
    const filesToSend = [...screenshots];

    setInput('');
    setScreenshots([]);
    setPreviewUrls([]);

    try {
      const formData = new FormData();
      if (messageToSend) formData.append('message', messageToSend);
      for (const file of filesToSend) {
        formData.append('screenshot', file);
      }

      // Send conversation history for context continuity
      if (messages.length > 0) {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        formData.append('history', JSON.stringify(history));
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: data.message }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: `Error: ${data.error || 'Failed to fetch analysis'}` }
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'assistant', content: 'Network error. Please check your connection and try again.' }
      ]);
    }
    setLoading(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden relative" style={{ background: '#000000' }}>

      {/* ───── Ambient Background Orbs ───── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[700px] h-[700px] rounded-full" style={{
          top: '-250px', left: '-150px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }} />
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{
          bottom: '-200px', right: '-100px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }} />
        <div className="absolute w-[400px] h-[400px] rounded-full" style={{
          top: '35%', left: '60%', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      </div>

      {/* ───── Header ───── */}
      <header className="relative z-30 flex items-center justify-between px-5 sm:px-8 h-16 flex-shrink-0" style={{
        background: 'rgba(6, 10, 18, 0.75)',
        backdropFilter: 'blur(24px) saturate(140%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            boxShadow: '0 0 24px rgba(255, 255, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            <img src="/logo.svg" alt="Solidus Logo" className="w-[60%] h-[60%] object-contain" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight" style={{ color: '#e2e8f0' }}>
              Solidus AI
              <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded" style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '10px',
                verticalAlign: 'middle',
              }}>AGENT</span>
            </h1>
            <p className="text-[11px] font-medium" style={{ color: '#64748b' }}>Trade Analysis Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}>
            <div className="status-dot connected" />
            <span className="text-[11px] font-medium" style={{ color: '#ffffff' }}>Online</span>
          </div>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={() => { setMessages([]); }}
            title="New Chat"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      {/* ───── Chat Area ───── */}
      <main className="relative z-10 flex-1 overflow-y-auto flex flex-col">
        {!hasMessages ? (
          /* ─── Empty State / Welcome ─── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
            {/* Animated logo */}
            <div className="relative mb-8 animate-float">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center animate-glow-pulse" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}>
                <img src="/logo.svg" alt="Solidus Logo" className="w-[60%] h-[60%] object-contain" />
              </div>
              <div className="absolute -inset-6 rounded-3xl" style={{
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
              }} />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-center" style={{
              color: '#e2e8f0',
              fontFamily: '"Sora", "Inter", sans-serif',
            }}>
              What can I analyze for you?
            </h2>
            <p className="text-sm mb-10 text-center max-w-md" style={{ color: '#64748b', lineHeight: '1.7' }}>
              Upload a trade screenshot or ask anything about crypto trading strategies, technical analysis, or market patterns.
            </p>

            {/* Quick action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {[
                { icon: '📊', title: 'Analyze a Trade', desc: 'Upload a screenshot for analysis', action: 'file' as const, prompt: '' },
                { icon: '📈', title: 'Chart Patterns', desc: 'Identify support & resistance', action: 'prompt' as const, prompt: 'Help me identify chart patterns and key levels' },
                { icon: '💡', title: 'Strategy Review', desc: 'Get feedback on your approach', action: 'prompt' as const, prompt: 'Review and critique my trading strategy' },
              ].map((card, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (card.action === 'file') {
                      fileInputRef.current?.click();
                    } else {
                      setInput(card.prompt);
                    }
                  }}
                  className="glass-card glass-card-hover group text-left p-5 transition-all duration-300"
                  onMouseEnter={(e) => {
                    if (card.action === 'prompt') setInput(card.prompt);
                  }}
                >
                  <span className="text-2xl mb-3 block">{card.icon}</span>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#e2e8f0' }}>{card.title}</h3>
                  <p className="text-xs" style={{ color: '#64748b' }}>{card.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ─── Messages ─── */
          <div className="flex-1 px-4 sm:px-6 py-6">
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 mr-3 mt-1 flex items-center justify-center" style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 0 12px rgba(255, 255, 255, 0.1)',
                    }}>
                      <img src="/logo.svg" alt="Solidus Logo" className="w-[60%] h-[60%] object-contain" />
                    </div>
                  )}

                  <div
                    className={`relative group max-w-[80%] sm:max-w-[70%] ${msg.role === 'user' ? '' : 'prose-chat'}`}
                    style={{
                      ...(msg.role === 'user' ? {
                        background: '#ffffff',
                        borderRadius: '20px 20px 6px 20px',
                        padding: '12px 18px',
                        color: '#000000',
                        boxShadow: '0 4px 20px rgba(255, 255, 255, 0.15)',
                      } : {
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px 20px 20px 6px',
                        padding: '14px 18px',
                        color: '#cbd5e1',
                        backdropFilter: 'blur(16px) saturate(140%)',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                      }),
                    }}
                  >
                    {msg.screenshots && msg.screenshots.length > 0 && (
                      <div className={`mb-3 flex flex-wrap gap-2`}>
                        {msg.screenshots.map((src, imgIdx) => (
                          <div key={imgIdx} className="relative group cursor-pointer" onClick={() => window.open(src, '_blank')}>
                            <img
                              src={src}
                              alt={`Screenshot ${imgIdx + 1}`}
                              className="rounded-xl object-contain"
                              style={{
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                maxHeight: msg.screenshots!.length > 1 ? '120px' : '224px',
                              }}
                            />
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'rgba(0,0,0,0.45)' }}>
                              <span className="text-xs font-medium text-white px-3 py-1.5 rounded-full" style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                              }}>View Full</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.content}</p>
                    ) : (
                      <>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white bg-[rgba(255,255,255,0.06)] backdrop-blur-md border border-white/10 hover:border-white/20 z-10 shadow-sm"
                          title="Copy to clipboard"
                        >
                          {copiedId === msg.id ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          )}
                        </button>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 ml-3 mt-1 flex items-center justify-center" style={{
                      background: '#ffffff',
                      boxShadow: '0 0 10px rgba(255, 255, 255, 0.15)',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="black" strokeWidth="0">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading state */}
              {loading && (
                <div className="flex justify-start animate-fadeIn">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 mr-3 mt-1 flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 0 12px rgba(255, 255, 255, 0.1)',
                  }}>
                    <img src="/logo.svg" alt="Solidus Logo" className="w-[60%] h-[60%] object-contain" />
                  </div>
                  <div className="rounded-2xl px-5 py-4" style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px 20px 20px 6px',
                    backdropFilter: 'blur(16px)',
                  }}>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: '#ffffff', animation: 'dotBounce1 1.4s infinite ease-in-out' }} />
                        <div className="w-2 h-2 rounded-full" style={{ background: '#ffffff', animation: 'dotBounce2 1.4s 0.2s infinite ease-in-out' }} />
                        <div className="w-2 h-2 rounded-full" style={{ background: '#ffffff', animation: 'dotBounce3 1.4s 0.4s infinite ease-in-out' }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: '#64748b' }}>Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          </div>
        )}

        {/* ───── Input Area ───── */}
        <div className="relative z-30 flex-shrink-0 px-4 sm:px-6 pb-5 pt-2" style={{
          background: 'linear-gradient(to top, #000000 60%, transparent 100%)',
        }}>
          <div className="max-w-3xl mx-auto">
            {/* Image Preview */}
            {previewUrls.length > 0 && (
              <div className="mb-3 flex flex-wrap items-start gap-2 animate-fadeIn">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`Preview ${idx + 1}`} className="h-16 w-auto rounded-xl object-cover" style={{
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }} />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                      style={{ background: '#ff4d6d', boxShadow: '0 2px 8px rgba(255, 77, 109, 0.4)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {previewUrls.length > 1 && (
                  <button onClick={clearAllImages} className="self-center text-[11px] font-medium px-2 py-1 rounded-lg transition-colors" style={{
                    color: '#ff4d6d',
                    background: 'rgba(255, 77, 109, 0.08)',
                    border: '1px solid rgba(255, 77, 109, 0.15)',
                  }}>
                    Clear all
                  </button>
                )}
              </div>
            )}

            {/* Input bar */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-end rounded-2xl transition-all duration-300" style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(20px) saturate(140%)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.boxShadow = '0 4px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.06)';
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.25)';
                }
              }}
              >
                {/* Attach button */}
                <label className="cursor-pointer p-3.5 flex items-center justify-center flex-shrink-0 transition-colors duration-150 rounded-xl m-1"
                  style={{ color: '#64748b' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </label>

                {/* Text input */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={hasMessages ? "Type your message..." : "Ask me about a trade or upload a screenshot..."}
                  className="flex-1 bg-transparent px-1 py-3.5 outline-none resize-none block w-full overflow-y-auto"
                  style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6', maxHeight: '140px', minHeight: '24px' }}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && screenshots.length === 0)}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center m-1.5 transition-all duration-200"
                  style={{
                    background: (loading || (!input.trim() && screenshots.length === 0))
                      ? 'rgba(255, 255, 255, 0.04)'
                      : '#ffffff',
                    cursor: (loading || (!input.trim() && screenshots.length === 0)) ? 'not-allowed' : 'pointer',
                    boxShadow: (loading || (!input.trim() && screenshots.length === 0))
                      ? 'none'
                      : '0 4px 18px rgba(255, 255, 255, 0.25)',
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 255, 255, 0.35)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.boxShadow = '0 4px 18px rgba(255, 255, 255, 0.25)';
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={(loading || (!input.trim() && screenshots.length === 0)) ? '#64748b' : 'black'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </form>

            <p className="text-center mt-3 text-[11px] font-medium tracking-wide" style={{ color: '#1e293b' }}>
              Solidus AI may produce inaccurate info. Verify critical trading decisions independently.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}