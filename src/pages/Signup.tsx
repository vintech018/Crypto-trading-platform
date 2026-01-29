import React, { useState, useEffect } from "react";
import { User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GlassCard from "../components/ui/GlassCard";
import FloatingInput from "../components/ui/FloatingInput";
import Button from "../components/ui/Button";
import Divider from "../components/ui/Divider";
import AuthLayout from "../layouts/AuthLayout";
import { apiFetch } from "../lib/api";

const Signup = () => {
    const navigate = useNavigate();
    const { user, setAccessToken, refreshMe } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [mode, setMode] = useState<"signup" | "2fa">("signup");
    const [twoFaToken, setTwoFaToken] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [totp, setTotp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await apiFetch<{ requires2faSetup: true; twoFaToken: string }>("/auth/signup", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            setTwoFaToken(res.twoFaToken);
            const setup = await apiFetch<{ qrDataUrl: string }>("/auth/setup-2fa", { method: "POST", token: res.twoFaToken });
            setQrDataUrl(setup.qrDataUrl);
            setMode("2fa");
        } catch (err: any) {
            setError(err.message ?? "Failed to create account.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twoFaToken) {
            setError("Missing 2FA token. Please sign up again.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = await apiFetch<{ ok: true; accessToken: string }>("/auth/verify-2fa", {
                method: "POST",
                body: JSON.stringify({ code: totp, twoFaToken })
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
                    <h1 className="text-3xl font-bold mb-2 text-white tracking-tight">
                        Create Account
                    </h1>
                    <p className="text-slate-400">
                        Join Project HQ today
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {mode === "signup" && (
                        <>
                            <Divider>Register with Gmail</Divider>

                            <form onSubmit={handleSignup} className="space-y-4">
                                <FloatingInput
                                    id="name"
                                    type="text"
                                    label="Full Name (optional)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={loading}
                                    rightIcon={<User className="w-5 h-5" />}
                                />

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

                                <FloatingInput
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    label="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />

                                <Button
                                    type="submit"
                                    className="w-full justify-center mt-6 py-3.5 text-lg"
                                    isLoading={loading}
                                    icon={<ArrowRight className="w-5 h-5" />}
                                >
                                    Create account
                                </Button>
                            </form>
                        </>
                    )}

                    {mode === "2fa" && (
                        <>
                            <Divider>Set up Authenticator</Divider>
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
                                    Verify & Finish
                                </Button>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-8 text-center text-sm text-slate-400">
                    Already have an account?{" "}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </div>
            </GlassCard>
        </AuthLayout>
    );
};

export default Signup;
