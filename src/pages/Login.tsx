import React, { useEffect, useState } from "react";
import { User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GlassCard from "../components/ui/GlassCard";
import FloatingInput from "../components/ui/FloatingInput";
import Button from "../components/ui/Button";
import Divider from "../components/ui/Divider";
import AuthLayout from "../layouts/AuthLayout";
import { apiFetch } from "../lib/api";

const Login = () => {
    const navigate = useNavigate();
    const { user, setAccessToken, refreshMe } = useAuth();

    const [mode, setMode] = useState<"choose" | "phone" | "phone-otp" | "gmail" | "gmail-2fa">("choose");

    // Phone
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");

    // Gmail
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // 2FA
    const [twoFaToken, setTwoFaToken] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [totp, setTotp] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) navigate("/dashboard");
    }, [user, navigate]);

    const handlePhoneSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await apiFetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });
            setMode("phone-otp");
        } catch (err: any) {
            setError(err.message ?? "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await apiFetch<{ ok: true; accessToken: string }>("/auth/verify-otp", {
                method: "POST",
                body: JSON.stringify({ phone, otp }),
            });
            setAccessToken(res.accessToken);
            await refreshMe();
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message ?? "Failed to verify OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleGmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setQrDataUrl(null);
        setTwoFaToken(null);
        setLoading(true);
        try {
            const res = await apiFetch<{
                ok: true;
                requires2fa?: boolean;
                requires2faSetup?: boolean;
                twoFaToken: string;
            }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

            setTwoFaToken(res.twoFaToken);
            setMode("gmail-2fa");

            if (res.requires2faSetup) {
                const setup = await apiFetch<{ qrDataUrl: string }>("/auth/setup-2fa", { method: "POST", token: res.twoFaToken });
                setQrDataUrl(setup.qrDataUrl);
            }
        } catch (err: any) {
            setError(err.message ?? "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twoFaToken) {
            setError("Missing 2FA token. Please login again.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = await apiFetch<{ ok: true; accessToken: string }>("/auth/verify-2fa", {
                method: "POST",
                body: JSON.stringify({ code: totp, twoFaToken }),
            });
            setAccessToken(res.accessToken);
            await refreshMe();
            navigate("/dashboard");
        } catch (err: any) {
            setError(err.message ?? "Invalid authenticator code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <GlassCard className="animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-white tracking-tight">Welcome back</h1>
                    <p className="text-slate-400">Sign in to access your dashboard</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {mode === "choose" && (
                        <div className="space-y-3">
                            <Button className="w-full justify-center" onClick={() => setMode("gmail")} disabled={loading}>
                                Login with Gmail
                            </Button>
                            <Button variant="secondary" className="w-full justify-center" onClick={() => setMode("phone")} disabled={loading}>
                                Login with Phone Number
                            </Button>
                        </div>
                    )}

                    {mode === "phone" && (
                        <>
                            <Divider>Phone OTP</Divider>
                            <form onSubmit={handlePhoneSendOtp} className="space-y-4">
                                <FloatingInput
                                    id="phone"
                                    type="tel"
                                    label="Phone number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    disabled={loading}
                                    rightIcon={<User className="w-5 h-5" />}
                                />
                                <Button type="submit" className="w-full justify-center" isLoading={loading}>
                                    Send OTP
                                </Button>
                                <button type="button" className="w-full text-sm text-slate-400 hover:text-slate-300" onClick={() => setMode("choose")}>
                                    Back
                                </button>
                            </form>
                        </>
                    )}

                    {mode === "phone-otp" && (
                        <>
                            <Divider>Enter OTP</Divider>
                            <form onSubmit={handlePhoneVerifyOtp} className="space-y-4">
                                <FloatingInput
                                    id="otp"
                                    type="text"
                                    label="6-digit OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <Button type="submit" className="w-full justify-center" isLoading={loading}>
                                    Verify OTP
                                </Button>
                                <button type="button" className="w-full text-sm text-slate-400 hover:text-slate-300" onClick={() => setMode("phone")}>
                                    Back
                                </button>
                            </form>
                        </>
                    )}

                    {mode === "gmail" && (
                        <>
                            <Divider>Gmail + Password</Divider>
                            <form onSubmit={handleGmailLogin} className="space-y-4">
                                <FloatingInput
                                    id="email"
                                    type="email"
                                    label="Gmail address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    rightIcon={<User className="w-5 h-5" />}
                                />

                                <FloatingInput
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    label="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    rightIcon={showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    onRightIconClick={() => setShowPassword(!showPassword)}
                                />

                                <Button type="submit" className="w-full justify-center mt-2 py-3.5 text-lg" isLoading={loading} icon={<ArrowRight className="w-5 h-5" />}>
                                    Continue
                                </Button>
                                <button type="button" className="w-full text-sm text-slate-400 hover:text-slate-300" onClick={() => setMode("choose")}>
                                    Back
                                </button>
                            </form>
                        </>
                    )}

                    {mode === "gmail-2fa" && (
                        <>
                            <Divider>Authenticator</Divider>
                            {qrDataUrl && (
                                <div className="rounded-lg bg-white p-3 flex justify-center">
                                    <img src={qrDataUrl} alt="Scan QR in Microsoft Authenticator" className="w-44 h-44" />
                                </div>
                            )}
                            <form onSubmit={handleVerifyTotp} className="space-y-4">
                                <FloatingInput
                                    id="totp"
                                    type="text"
                                    label="6-digit Authenticator code"
                                    value={totp}
                                    onChange={(e) => setTotp(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <Button type="submit" className="w-full justify-center" isLoading={loading}>
                                    Verify & Sign In
                                </Button>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-8 text-center text-sm text-slate-400">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Create account
                    </Link>
                </div>
            </GlassCard>
        </AuthLayout>
    );
};

export default Login;
