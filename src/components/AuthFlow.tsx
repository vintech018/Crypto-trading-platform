"use client";

import { useState, useEffect } from 'react'
import { DotPattern } from '@/components/DotPattern'
import { useRouter } from 'next/navigation'

// ============================================================
//  Backend URL — used for API calls and OAuth redirects
// ============================================================
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5050'
// ============================================================

/* ── Scoped styles ── */
const css = `
  :root {
    --bg-deep: #000000;
    --bg-card: #0a0a0a;
    --bg-input: #141414;
    --bg-hover: #1f1f1f;
    --accent: #ffffff;
    --accent-hover: #e0e0e0;
    --accent-dim: rgba(255,255,255,0.08);
    --text-primary: #ffffff;
    --text-secondary: #a3a3a3;
    --text-muted: #737373;
    --border: #262626;
    --danger: #ef4444;
    --success: #22c55e;
    --r: 8px;
    --rl: 14px;
  }

  /* ── Layout ── */
  .s-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    background: var(--bg-deep);
    overflow: hidden;
  }
  .s-glow {
    position: absolute; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
    width: 600px; height: 600px; top: -100px; left: -100px;
    animation: sFloatG 8s ease-in-out infinite alternate;
  }
  .s-glow2 {
    position: absolute; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%);
    width: 400px; height: 400px; bottom: -50px; right: -50px;
    animation: sFloatG 10s ease-in-out infinite alternate-reverse;
  }
  @keyframes sFloatG {
    from { transform: translate(0,0) scale(1); }
    to   { transform: translate(40px,40px) scale(1.1); }
  }

  /* ── Card ── */
  .s-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--rl);
    padding: 24px 32px;
    width: 100%; max-width: 480px;
    position: relative; z-index: 1;
    box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
    animation: sCardIn 0.4s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes sCardIn {
    from { opacity:0; transform: translateY(20px) scale(0.98); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }

  /* ── Logo ── */
  .s-logo { display:flex; align-items:center; gap:8px; margin-bottom:20px; }
  .s-logo-text {
    font-family: 'Syne', sans-serif;
    font-size: 20px; font-weight: 800;
    color: var(--accent); letter-spacing: -0.5px;
  }

  /* ── Tabs ── */
  .s-tabs { display:flex; border-bottom:1px solid var(--border); margin-bottom:20px; }
  .s-tab {
    flex:1; background:none; border:none;
    padding:12px 8px;
    font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600;
    color:var(--text-muted); cursor:pointer; position:relative;
    transition: color 0.2s;
  }
  .s-tab.active { color:var(--accent); }
  .s-tab.active::after {
    content:''; position:absolute; bottom:-1px; left:0; right:0;
    height:2px; background:var(--accent); border-radius:2px 2px 0 0;
  }

  /* ── Title ── */
  .s-title {
    font-family:'Syne',sans-serif; font-size:24px; font-weight:700;
    color:var(--text-primary); margin-bottom:16px; letter-spacing:-0.5px;
  }

  /* ── Fields ── */
  .s-field { margin-bottom:12px; }
  .s-label { display:block; font-size:12px; font-weight:500; color:var(--text-secondary); margin-bottom:6px; }
  .s-input-wrap { position:relative; }
  .s-input {
    width:100%; background:var(--bg-input); border:1.5px solid var(--border);
    border-radius:var(--r); padding:13px 16px;
    color:var(--text-primary); font-family:'Space Grotesk',sans-serif; font-size:14px;
    outline:none; transition:border-color 0.2s, box-shadow 0.2s;
  }
  .s-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(255,255,255,0.1); }
  .s-input::placeholder { color:var(--text-muted); }
  .s-input.padded { padding-right:44px; }
  .s-eye {
    position:absolute; right:14px; top:50%; transform:translateY(-50%);
    background:none; border:none; cursor:pointer; color:var(--text-muted);
    display:flex; align-items:center; transition:color 0.2s;
  }
  .s-eye:hover { color:var(--text-secondary); }
  .s-err { font-size:12px; color:var(--danger); margin-top:6px; }

  /* ── Password strength ── */
  .s-str { display:flex; gap:4px; margin-top:8px; }
  .s-str-s { flex:1; height:3px; border-radius:2px; background:var(--border); transition:background 0.3s; }
  .s-str-s.weak   { background:#f6465d; }
  .s-str-s.fair   { background:#f8a028; }
  .s-str-s.strong { background:#2ecc71; }
  .s-str-label { font-size:12px; color:var(--text-muted); margin-top:4px; }

  /* ── Checkbox ── */
  .s-check-row { display:flex; align-items:flex-start; gap:8px; margin-bottom:16px; }
  .s-checkbox {
    width:16px; height:16px; min-width:16px;
    border:1.5px solid var(--border); border-radius:3px;
    background:var(--bg-input); cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    margin-top:2px; transition:all 0.15s;
  }
  .s-checkbox.on { background:var(--accent); border-color:var(--accent); }
  .s-check-text { font-size:13px; color:var(--text-secondary); line-height:1.5; }
  .s-check-text a { color:var(--accent); text-decoration:none; }

  /* ── Buttons ── */
  .s-btn {
    width:100%; background:var(--accent); color:var(--bg-deep); border:none;
    border-radius:var(--r); padding:14px;
    font-family:'Space Grotesk',sans-serif; font-size:15px; font-weight:600;
    cursor:pointer; transition:background 0.2s, transform 0.1s, box-shadow 0.2s, color 0.2s;
    margin-bottom:12px;
  }
  .s-btn:hover  { background:#ffffff; color:#000000; box-shadow:0 4px 20px rgba(255,255,255,0.3); }
  .s-btn:active { transform:scale(0.99); }
  .s-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .s-divider {
    display:flex; align-items:center; gap:12px;
    margin:12px 0; color:var(--text-muted); font-size:12px;
  }
  .s-divider::before, .s-divider::after { content:''; flex:1; height:1px; background:var(--border); }
  .s-social {
    width:100%; background:var(--bg-input); border:1.5px solid var(--border);
    border-radius:var(--r); padding:13px 16px; color:var(--text-primary);
    font-family:'Space Grotesk',sans-serif; font-size:14px; font-weight:500;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    gap:10px; margin-bottom:10px;
    transition:background 0.2s, border-color 0.2s, transform 0.1s, color 0.2s;
  }
  .s-social:hover  { background:#ffffff; color:#000000; border-color:#ffffff; transform:translateY(-1px); }
  .s-social:active { transform:scale(0.99); }

  /* ── Footer ── */
  .s-footer { margin-top:20px; text-align:center; font-size:13px; color:var(--text-secondary); }
  .s-lnk {
    color:var(--accent); font-weight:500; background:none; border:none;
    cursor:pointer; font-family:inherit; font-size:inherit; padding:0;
    transition:color 0.2s; text-decoration:none;
  }
  .s-lnk:hover { color:var(--accent-hover); }

  /* ── Overlay / Modal ── */
  .s-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,0.78);
    backdrop-filter:blur(5px);
    display:flex; align-items:center; justify-content:center;
    z-index:200; padding:20px;
    animation:sFadeIn 0.2s ease;
  }
  @keyframes sFadeIn { from{opacity:0} to{opacity:1} }
  .s-modal {
    background:var(--bg-card); border:1px solid var(--border);
    border-radius:var(--rl); padding:0; width:100%; max-width:400px;
    box-shadow:0 24px 80px rgba(0,0,0,0.65);
    animation:sCardIn 0.3s cubic-bezier(0.16,1,0.3,1);
    position:relative; overflow:hidden;
  }
  .s-modal-x {
    position:absolute; top:14px; right:14px;
    background:none; border:none; cursor:pointer;
    color:var(--text-muted); font-size:22px; line-height:1;
    padding:4px 8px; border-radius:6px;
    transition:color 0.2s, background 0.2s; z-index:1;
  }
  .s-modal-x:hover { color:var(--text-primary); background:var(--bg-input); }

  /* ── OAuth flow ── */
  .s-popup-bar {
    background:#141a24; padding:10px 14px;
    display:flex; align-items:center; gap:8px;
    border-bottom:1px solid #2d3748;
  }
  .s-popup-dot { width:10px; height:10px; border-radius:50%; }
  .s-popup-url {
    flex:1; background:#0d1117; border-radius:4px;
    padding:4px 10px; font-size:11px; color:var(--text-muted);
    font-family:monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .s-prog-wrap { padding:0 28px; }
  .s-prog-track {
    height:3px; background:var(--border); border-radius:2px;
    margin-top:18px; margin-bottom:12px; overflow:hidden;
  }
  .s-prog-fill {
    height:100%; background:var(--accent); border-radius:2px;
    transition:width 0.45s cubic-bezier(0.4,0,0.2,1);
  }
  .s-dots { display:flex; gap:6px; justify-content:center; margin-bottom:4px; }
  .s-dot {
    width:6px; height:6px; border-radius:50%; background:var(--border);
    transition:all 0.3s;
  }
  .s-dot.active { background:var(--accent); width:18px; border-radius:3px; }
  .s-dot.done   { background:rgba(255,255,255,0.35); }
  .s-step { padding:28px; }
  .s-badge {
    display:inline-flex; align-items:center; gap:8px;
    background:var(--accent-dim); border:1px solid rgba(255,255,255,0.2);
    border-radius:20px; padding:4px 14px;
    font-size:12px; font-weight:600; color:var(--accent);
    margin-bottom:18px; text-transform:uppercase; letter-spacing:0.5px;
  }
  .s-step-title {
    font-family:'Syne',sans-serif; font-size:20px; font-weight:700;
    margin-bottom:8px; color:var(--text-primary);
  }
  .s-step-sub { font-size:13px; color:var(--text-secondary); line-height:1.6; margin-bottom:22px; }

  /* Account picker */
  .s-account {
    background:var(--bg-input); border:1.5px solid var(--border);
    border-radius:8px; padding:12px 14px;
    display:flex; align-items:center; gap:12px;
    margin-bottom:10px; cursor:pointer;
    transition:border-color 0.2s, background 0.2s;
  }
  .s-account:hover    { border-color:#3d4551; }
  .s-account.selected { border-color:var(--accent); background:var(--accent-dim); }
  .s-avatar {
    width:38px; height:38px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:15px; font-weight:700; color:#fff; flex-shrink:0;
  }
  .s-ainfo { flex:1; }
  .s-aname  { font-size:14px; font-weight:500; color:var(--text-primary); }
  .s-aemail { font-size:12px; color:var(--text-secondary); }
  .s-acheck {
    width:18px; height:18px; border-radius:50%;
    background:var(--accent); display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity 0.2s;
  }
  .s-account.selected .s-acheck { opacity:1; }

  /* Code block */
  .s-code {
    background:#0d1117; border:1px solid #2d3748;
    border-radius:8px; padding:14px;
    font-family:monospace; font-size:12px; line-height:1.75;
    overflow-x:auto; margin-top:16px; margin-bottom:4px;
    color:#c9d1d9;
  }
  .c-comment { color:#6a737d; }
  .c-key     { color:#79b8ff; }
  .c-val     { color:#9ecbff; }
  .c-str     { color:#85e89d; }
  .c-warn    { color:#f8a028; }

  /* Spinner */
  .s-spin-wrap { display:flex; flex-direction:column; align-items:center; gap:14px; padding:8px 0 4px; }
  .s-spinner {
    width:40px; height:40px;
    border:3px solid var(--border);
    border-top-color:var(--accent);
    border-radius:50%;
    animation:sSpin 0.8s linear infinite;
  }
  @keyframes sSpin { to { transform:rotate(360deg); } }
  .s-spin-label { font-size:13px; color:var(--text-secondary); }

  /* Success */
  .s-ok-icon {
    width:56px; height:56px; border-radius:50%;
    background:rgba(46,204,113,0.12); border:2px solid rgba(46,204,113,0.3);
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 16px;
    animation:sPopIn 0.4s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes sPopIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
  .s-ok-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; text-align:center; margin-bottom:6px; }
  .s-ok-sub   { font-size:13px; color:var(--text-secondary); text-align:center; margin-bottom:22px; }
  .s-user-pill {
    display:flex; align-items:center; gap:12px;
    background:var(--bg-input); border:1px solid var(--border);
    border-radius:10px; padding:12px 16px; margin-bottom:20px;
  }
  .s-pill-name  { font-size:14px; font-weight:600; color:var(--text-primary); }
  .s-pill-email { font-size:12px; color:var(--text-secondary); }
  .s-verified   {
    background:rgba(46,204,113,0.12); border:1px solid rgba(46,204,113,0.2);
    border-radius:20px; padding:3px 10px;
    font-size:11px; font-weight:600; color:#2ecc71;
    white-space:nowrap;
  }

  /* Toast */
  .s-toast {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    border-radius:30px; padding:12px 22px;
    font-size:14px; font-weight:500;
    z-index:300; white-space:nowrap;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:sToastIn 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  .s-toast.success { background:#0d1a12; border:1px solid rgba(46,204,113,0.3); color:#2ecc71; }
  .s-toast.error   { background:#1a0d10; border:1px solid rgba(246,70,93,0.3);  color:#f6465d; }
  @keyframes sToastIn {
    from { opacity:0; transform:translateX(-50%) translateY(12px); }
    to   { opacity:1; transform:translateX(-50%) translateY(0); }
  }

  /* Responsive */
  @media(max-width:480px) {
    .s-card  { padding:28px 18px; }
    .s-step  { padding:22px 18px; }
    .s-modal { max-width:100%; }
  }
`

/* ── Icons ── */
const SolidusLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="6" fill="var(--accent)" />
        <path d="M16 6L22 10V14L16 18L10 14V10L16 6Z" fill="var(--bg-deep)" opacity=".9" />
        <path d="M22 14V18L16 22L10 18V14L16 18L22 14Z" fill="var(--bg-deep)" opacity=".6" />
        <path d="M10 18L16 22V26L10 22V18Z" fill="var(--bg-deep)" opacity=".4" />
        <path d="M22 18V22L16 26V22L22 18Z" fill="var(--bg-deep)" opacity=".3" />
    </svg>
)

const GIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 13.075 17.64 11.27 17.64 9.2z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
)

const AIcon = () => (
    <svg width="18" height="18" viewBox="0 10 330 460" fill="currentColor">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
)

const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {open
            ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
            : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" /></>}
    </svg>
)

const Tick = ({ color = 'var(--bg-deep)' }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5l2.5 2.5L8 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

/* ── Helpers ── */
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const pwStrength = (pw: string) => {
    if (!pw) return 0
    return [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length
}

/* ── Mock OAuth accounts ── */
const MOCK_ACCOUNTS: Record<string, { name: string, email: string, color: string, initial: string }[]> = {
    google: [
        { name: 'Alex Johnson', email: 'alex.johnson@gmail.com', color: '#4285F4', initial: 'A' },
        { name: 'Alex Work', email: 'alex@company.io', color: '#34A853', initial: 'A' },
    ],
    apple: [
        { name: 'Alex J.', email: 'alex@icloud.com', color: '#555', initial: 'A' },
        { name: 'Hide My Email', email: 'abc123@privaterelay.appleid.com', color: '#888', initial: '🔒' },
    ],
}

const STEP_URLS: Record<string, string[]> = {
    google: [
        'accounts.google.com/o/oauth2/v2/auth?client_id=...',
        'accounts.google.com/signin/oauth/consent',
        'oauth2.googleapis.com/token',
        'Redirecting to Solidus...',
    ],
    apple: [
        'appleid.apple.com/auth/authorize?client_id=...',
        'appleid.apple.com/auth/consent',
        'appleid.apple.com/auth/token',
        'Redirecting to Solidus...',
    ],
}

/* ────────────────────────────────────────────────
   OAuth Flow Modal
──────────────────────────────────────────────── */
function OAuthModal({ provider, onClose, onSuccess }: { provider: string, onClose: () => void, onSuccess: (acc: unknown) => void }) {
    const [step, setStep] = useState(0)
    const [selected, setSelected] = useState<number | null>(null)
    const accounts = MOCK_ACCOUNTS[provider]
    const urls = STEP_URLS[provider]
    const progress = [25, 55, 82, 100][step]

    const proceed = async () => {
        if (selected === null) return
        setStep(1)
        await delay(1400)
        setStep(2)
        await delay(1300)
        setStep(3)
    }

    return (
        <div className="s-overlay" onClick={e => e.target === e.currentTarget && step < 1 && onClose()}>
            <div className="s-modal">
                <button className="s-modal-x" onClick={onClose} disabled={step === 1 || step === 2}>×</button>

                {/* Browser chrome */}
                <div className="s-popup-bar">
                    <div className="s-popup-dot" style={{ background: '#ff5f57' }} />
                    <div className="s-popup-dot" style={{ background: '#febc2e' }} />
                    <div className="s-popup-dot" style={{ background: '#28c840' }} />
                    <div className="s-popup-url">🔒 {urls[step]}</div>
                </div>

                {/* Progress */}
                <div className="s-prog-wrap">
                    <div className="s-prog-track">
                        <div className="s-prog-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="s-dots">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`s-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
                        ))}
                    </div>
                </div>

                {/* ── Step 0: pick account ── */}
                {step === 0 && (
                    <div className="s-step">
                        <div className="s-badge">
                            {provider === 'google' ? <GIcon /> : <AIcon />}
                            {provider === 'google' ? 'Google' : 'Apple'} Sign In
                        </div>
                        <div className="s-step-title">Choose an account</div>
                        <div className="s-step-sub">Select the account you&apos;d like to use to continue to Solidus.</div>

                        {accounts.map((acc, i) => (
                            <div key={i} className={`s-account ${selected === i ? 'selected' : ''}`} onClick={() => setSelected(i)}>
                                <div className="s-avatar" style={{ background: acc.color }}>{acc.initial}</div>
                                <div className="s-ainfo">
                                    <div className="s-aname">{acc.name}</div>
                                    <div className="s-aemail">{acc.email}</div>
                                </div>
                                <div className="s-acheck"><Tick /></div>
                            </div>
                        ))}

                        <button className="s-btn" onClick={proceed} disabled={selected === null} style={{ marginTop: '8px' }}>
                            Continue as {selected !== null ? accounts[selected].name.split(' ')[0] : '…'}
                        </button>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            By continuing, Solidus will receive your name and email address.
                        </div>
                    </div>
                )}

                {/* ── Step 1: granting ── */}
                {step === 1 && (
                    <div className="s-step">
                        <div className="s-step-title">Granting access…</div>
                        <div className="s-step-sub">Redirecting through {provider === 'google' ? 'Google' : 'Apple'}&apos;s consent screen.</div>
                        <div className="s-spin-wrap">
                            <div className="s-spinner" />
                            <div className="s-spin-label">Waiting for authorization…</div>
                        </div>
                        <div className="s-code">
                            <div><span className="c-comment">{`/* Real code — open OAuth popup: */`}</span></div>
                            <div><span className="c-key">window</span>.open(</div>
                            <div style={{ paddingLeft: '16px' }}><span className="c-str">`https://accounts.google.com/o/oauth2/auth`</span></div>
                            <div style={{ paddingLeft: '16px' }}><span className="c-key">+</span> <span className="c-str">`?client_id=<span className="c-warn">{'{GOOGLE_CLIENT_ID}'}</span>`</span></div>
                            <div style={{ paddingLeft: '16px' }}><span className="c-key">+</span> <span className="c-str">`&redirect_uri=${'${REDIRECT_URI}'}`</span></div>
                            <div style={{ paddingLeft: '16px' }}><span className="c-key">+</span> <span className="c-str">`&scope=email profile&response_type=code`</span></div>
                            <div>)</div>
                        </div>
                    </div>
                )}

                {/* ── Step 2: token exchange ── */}
                {step === 2 && (
                    <div className="s-step">
                        <div className="s-step-title">Exchanging token…</div>
                        <div className="s-step-sub">Auth code received. Your backend is exchanging it for an access token.</div>
                        <div className="s-spin-wrap">
                            <div className="s-spinner" />
                            <div className="s-spin-label">POST /auth/{provider}/callback…</div>
                        </div>
                        <div className="s-code">
                            <div><span className="c-comment">{`/* Your SERVER does this (secret stays safe): */`}</span></div>
                            <div><span className="c-key">POST</span> <span className="c-str">https://oauth2.googleapis.com/token</span></div>
                            <div><span className="c-key">client_id    :</span> <span className="c-str">YOUR_CLIENT_ID</span></div>
                            <div><span className="c-key">client_secret:</span> <span className="c-warn">YOUR_SECRET ← server-side only</span></div>
                            <div><span className="c-key">code         :</span> <span className="c-val">auth_code_from_redirect</span></div>
                            <div><span className="c-key">grant_type   :</span> <span className="c-str">authorization_code</span></div>
                        </div>
                    </div>
                )}

                {/* ── Step 3: success ── */}
                {step === 3 && selected !== null && (
                    <div className="s-step">
                        <div className="s-ok-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13l4 4L19 7" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className="s-ok-title">Authenticated!</div>
                        <div className="s-ok-sub">Token exchanged. User profile received from {provider === 'google' ? 'Google' : 'Apple'}.</div>

                        <div className="s-user-pill">
                            <div className="s-avatar" style={{ background: accounts[selected].color }}>{accounts[selected].initial}</div>
                            <div style={{ flex: 1 }}>
                                <div className="s-pill-name">{accounts[selected].name}</div>
                                <div className="s-pill-email">{accounts[selected].email}</div>
                            </div>
                            <div className="s-verified">✓ Verified</div>
                        </div>

                        <div className="s-code">
                            <div><span className="c-comment">{`/* Token payload you'll receive: */`}</span></div>
                            <div><span className="c-key">access_token :</span> <span className="c-val">&quot;ya29.a0AfH6SMBx...&quot;</span></div>
                            <div><span className="c-key">id_token     :</span> <span className="c-val">&quot;eyJhbGciOiJSUzI1...&quot;</span></div>
                            <div><span className="c-key">user.email   :</span> <span className="c-str">&quot;{accounts[selected].email}&quot;</span></div>
                            <div><span className="c-key">user.name    :</span> <span className="c-str">&quot;{accounts[selected].name}&quot;</span></div>
                        </div>

                        <button className="s-btn" style={{ marginTop: '16px' }} onClick={() => onSuccess(accounts[selected])}>
                            Continue to Solidus →
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ────────────────────────────────────────────────
   Main App
──────────────────────────────────────────────── */
export function AuthFlow({ initialTab = 'login' }: { initialTab?: 'login' | 'signup' }) {
    const router = useRouter()
    const [tab, setTab] = useState<'login' | 'signup'>(initialTab)
    const [modal, setModal] = useState<string | null>(null)
    const [toast, setToast] = useState<{ msg: string, type: string } | null>(null)

    // Helper for redirection — use hard redirect to ensure cookies are seen by middleware
    const navigateNext = () => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const from = params.get('from')
        window.location.href = from || '/hub'
    }

    // Read OAuth error codes redirected back from the backend
    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const err = params.get('error')
        if (!err) return
        const messages: Record<string, string> = {
            NOT_REGISTERED: 'No account found. Please sign up first.',
            ALREADY_EXISTS: 'An account with this email already exists. Please log in instead.',
            oauth_failed:   'Google sign-in failed. Please try again.',
        }
        const msg = messages[err] || 'Authentication failed. Please try again.'
        // Auto-switch tab based on error type
        if (err === 'NOT_REGISTERED') setTab('signup')
        if (err === 'ALREADY_EXISTS') setTab('login')
        setToast({ msg, type: 'error' })
        setTimeout(() => setToast(null), 5000)
        // Clean URL so the error doesn't persist on refresh
        window.history.replaceState({}, '', window.location.pathname)
    }, [])

    /* Login state */
    const [lEmail, setLEmail] = useState('')
    const [lPass, setLPass] = useState('')
    const [showLP, setShowLP] = useState(false)
    const [lErr, setLErr] = useState<Record<string, string>>({})
    const [lLoading, setLLoading] = useState(false)

    /* Signup state */
    const [sEmail, setSEmail] = useState('')
    const [sPass, setSPass] = useState('')
    const [sConf, setSConf] = useState('')
    const [showSP, setShowSP] = useState(false)
    const [showSC, setShowSC] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const [sErr, setSErr] = useState<Record<string, string>>({})
    const [sLoading, setSLoading] = useState(false)

    const fire = (msg: string, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

    const doLogin = async () => {
        const e: Record<string, string> = {}
        if (!lEmail) e.email = 'Email is required'
        else if (!isEmail(lEmail)) e.email = 'Enter a valid email'
        if (!lPass) e.pass = 'Password is required'
        if (Object.keys(e).length) { setLErr(e); return }
        setLErr({}); setLLoading(true)
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: lEmail, password: lPass }),
            })
            const data = await res.json()
            if (!data.success) {
                fire(data.message || 'Login failed', 'error')
                setLLoading(false)
                return
            }
            localStorage.setItem('accessToken', data.data.accessToken)
            localStorage.setItem('refreshToken', data.data.refreshToken)
            // Set auth cookie for Next.js middleware route guard
            document.cookie = 'solidus_authed=true; path=/; max-age=604800; SameSite=Lax'
            fire('Welcome back to Solidus! 🎉')
            setTimeout(navigateNext, 1200)
        } catch {
            fire('Cannot connect to server. Is the backend running?', 'error')
        }
        setLLoading(false)
    }

    const doSignup = async () => {
        const e: Record<string, string> = {}
        if (!sEmail) e.email = 'Email is required'
        else if (!isEmail(sEmail)) e.email = 'Enter a valid email'
        if (!sPass) e.pass = 'Password is required'
        else if (sPass.length < 8) e.pass = 'Must be at least 8 characters'
        if (!sConf) e.conf = 'Please confirm your password'
        else if (sPass !== sConf) e.conf = 'Passwords do not match'
        if (!agreed) e.agree = 'You must agree to the Privacy Notice'
        if (Object.keys(e).length) { setSErr(e); return }
        setSErr({}); setSLoading(true)
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: sEmail.split('@')[0], email: sEmail, password: sPass }),
            })
            const data = await res.json()
            if (!data.success) {
                fire(data.message || 'Signup failed', 'error')
                setSLoading(false)
                return
            }
            localStorage.setItem('accessToken', data.data.accessToken)
            localStorage.setItem('refreshToken', data.data.refreshToken)
            // Set auth cookie for Next.js middleware route guard
            document.cookie = 'solidus_authed=true; path=/; max-age=604800; SameSite=Lax'
            fire('Account created! Welcome to Solidus 🚀')
            setTimeout(navigateNext, 1200)
        } catch {
            fire('Cannot connect to server. Is the backend running?', 'error')
        }
        setSLoading(false)
    }

    const str = pwStrength(sPass)
    const strLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][str]
    const strCls = ['', 'weak', 'fair', 'fair', 'strong'][str]

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: css }} />
            <div className="s-page relative w-full h-full">
                <DotPattern
                    dotSize={2}
                    gap={20}
                    baseColor="#262626"
                    glowColor="#ffffff"
                    proximity={150}
                    glowIntensity={0.6}
                    waveSpeed={0.3}
                />

                <div className="absolute top-8 left-8 z-50 cursor-pointer text-white/50 hover:text-white transition-colors text-sm font-medium" onClick={() => router.push('/')}>
                    ← Back to Home
                </div>

                <div className="s-card relative z-10 w-full max-w-md mx-auto">
                    <div className="s-logo"><SolidusLogo /><span className="s-logo-text">Solidus</span></div>

                    <div className="s-tabs">
                        <button className={`s-tab ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => { setTab('login'); setLErr({}) }}>Log In</button>
                        <button className={`s-tab ${tab === 'signup' ? 'active' : ''}`}
                            onClick={() => { setTab('signup'); setSErr({}) }}>Sign Up</button>
                    </div>

                    {/* ── LOGIN ── */}
                    {tab === 'login' && (
                        <>
                            <div className="s-title">Welcome back</div>

                            <div className="s-field">
                                <label className="s-label">Email / Phone number</label>
                                <input className="s-input" placeholder="Email/Phone (without country code)"
                                    value={lEmail}
                                    onChange={e => { setLEmail(e.target.value); setLErr(p => ({ ...p, email: '' })) }} />
                                {lErr.email && <div className="s-err">{lErr.email}</div>}
                            </div>

                            <div className="s-field">
                                <label className="s-label">Password</label>
                                <div className="s-input-wrap">
                                    <input className="s-input padded" type={showLP ? 'text' : 'password'} placeholder="Enter your password"
                                        value={lPass}
                                        onChange={e => { setLPass(e.target.value); setLErr(p => ({ ...p, pass: '' })) }}
                                        onKeyDown={e => e.key === 'Enter' && doLogin()} />
                                    <button className="s-eye" onClick={() => setShowLP(!showLP)}><EyeIcon open={showLP} /></button>
                                </div>
                                {lErr.pass && <div className="s-err">{lErr.pass}</div>}
                            </div>

                            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                                <button className="s-lnk" style={{ fontSize: '13px' }}>Forgot password?</button>
                            </div>

                            <button className="s-btn" onClick={doLogin} disabled={lLoading}>
                                {lLoading ? 'Signing in…' : 'Continue'}
                            </button>
                            <div className="s-divider">or</div>
                            <button className="s-social" onClick={() => { window.location.href = `${BACKEND_URL}/api/auth/google?mode=login` }}><GIcon /> Continue with Google</button>
                            <button className="s-social" onClick={() => setModal('apple')}><AIcon /> Continue with Apple</button>
                            <div className="s-footer">
                                Don&apos;t have an account?{' '}
                                <button className="s-lnk" onClick={() => setTab('signup')}>Sign Up</button>
                            </div>
                        </>
                    )}

                    {/* ── SIGNUP ── */}
                    {tab === 'signup' && (
                        <>
                            <div className="s-title">Welcome to Solidus</div>

                            <div className="s-field">
                                <label className="s-label">Email / Phone number</label>
                                <input className="s-input" placeholder="Email/Phone (without country code)"
                                    value={sEmail}
                                    onChange={e => { setSEmail(e.target.value); setSErr(p => ({ ...p, email: '' })) }} />
                                {sErr.email && <div className="s-err">{sErr.email}</div>}
                            </div>

                            <div className="s-field">
                                <label className="s-label">Password</label>
                                <div className="s-input-wrap">
                                    <input className="s-input padded" type={showSP ? 'text' : 'password'} placeholder="Create a strong password"
                                        value={sPass}
                                        onChange={e => { setSPass(e.target.value); setSErr(p => ({ ...p, pass: '' })) }} />
                                    <button className="s-eye" onClick={() => setShowSP(!showSP)}><EyeIcon open={showSP} /></button>
                                </div>
                                {sPass && (
                                    <div className="s-str">
                                        {[1, 2, 3, 4].map(i => <div key={i} className={`s-str-s ${i <= str ? strCls : ''}`} />)}
                                    </div>
                                )}
                                {sPass && <div className="s-str-label">{strLabel} password</div>}
                                {sErr.pass && <div className="s-err">{sErr.pass}</div>}
                            </div>

                            <div className="s-field">
                                <label className="s-label">Confirm Password</label>
                                <div className="s-input-wrap">
                                    <input className="s-input padded" type={showSC ? 'text' : 'password'} placeholder="Re-enter your password"
                                        value={sConf}
                                        onChange={e => { setSConf(e.target.value); setSErr(p => ({ ...p, conf: '' })) }}
                                        onKeyDown={e => e.key === 'Enter' && doSignup()} />
                                    <button className="s-eye" onClick={() => setShowSC(!showSC)}><EyeIcon open={showSC} /></button>
                                </div>
                                {sErr.conf && <div className="s-err">{sErr.conf}</div>}
                            </div>

                            <div className="s-check-row">
                                <div className={`s-checkbox ${agreed ? 'on' : ''}`} onClick={() => setAgreed(!agreed)}>
                                    {agreed && <Tick />}
                                </div>
                                <div className="s-check-text">
                                    I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Notice</a>
                                </div>
                            </div>
                            {sErr.agree && <div className="s-err" style={{ marginTop: '-12px', marginBottom: '12px' }}>{sErr.agree}</div>}

                            <button className="s-btn" onClick={doSignup} disabled={sLoading}>
                                {sLoading ? 'Creating account…' : 'Create Account'}
                            </button>
                            <div className="s-divider">or</div>
                            <button className="s-social" onClick={() => { window.location.href = `${BACKEND_URL}/api/auth/google?mode=signup` }}><GIcon /> Continue with Google</button>
                            <button className="s-social" onClick={() => setModal('apple')}><AIcon /> Continue with Apple</button>
                            <div className="s-footer">
                                Already have an account?{' '}
                                <button className="s-lnk" onClick={() => setTab('login')}>Log In</button>
                            </div>
                        </>
                    )}
                </div>

                {/* ── MODALS & TOASTS ── */}
                {modal && (
                    <OAuthModal
                        provider={modal}
                        onClose={() => setModal(null)}
                        onSuccess={() => {
                            setModal(null)

                            fire('Authenticated via ' + (modal === 'google' ? 'Google' : 'Apple') + '!')
                            setTimeout(() => router.push('/dashboard'), 1500)
                        }}
                    />
                )}

                {toast && (
                    <div className={`s-toast ${toast.type}`}>
                        {toast.msg}
                    </div>
                )}
            </div>
        </>
    )
}
