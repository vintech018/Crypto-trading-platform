import React, { useState, useEffect } from "react";
import { User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GlassCard from "../components/ui/GlassCard";
import FloatingInput from "../components/ui/FloatingInput";
import Button from "../components/ui/Button";
import Divider from "../components/ui/Divider";
import AuthLayout from "../layouts/AuthLayout";

const Login = () => {
    const navigate = useNavigate();
    const { user, signInWithGoogle } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate("/dashboard"); // Or whatever the protected route is
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            await signInWithGoogle();
            // Navigation handled by useEffect
        } catch (err: any) {
            setError("Failed to sign in with Google. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Note: Since we are using Firebase Auth, we would typically callsignInWithEmailAndPassword here.
            // However, the current AuthContext only exposes signInWithGoogle as per request for "Email (Gmail) + password login" 
            // which usually implies just Google Auth OR a custom Email flow. 
            // The user request said: "Email (Gmail) + password login (custom auth)" AND "Google OAuth".
            // Let's implement a mockup of the email login logic for now since explicit firebase email auth wasn't in the context interface yet
            // but I should add it to context or just handle it here if I imported auth.
            // Wait, the prompt said "Email + password login (custom auth)". I'll interpret this as standard firebase email/password for now.

            // For this step, I'll simulate a delay or implement the real thing if I update context.
            // Let's just update context to include it or import auth directly here.
            // I'll import { signInWithEmailAndPassword } from firebase/auth here to keep it simple without changing context interface too much 
            // unless I want to make it cleaner. Direct import is fine for now.

            const { signInWithEmailAndPassword } = await import("firebase/auth");
            const { auth } = await import("../lib/firebase");
            if (!auth) throw new Error("Firebase keys missing");
            await signInWithEmailAndPassword(auth, email, password);

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else {
                setError("Failed to log in. Please check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <GlassCard className="animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-white tracking-tight">
                        Welcome back
                    </h1>
                    <p className="text-slate-400">
                        Sign in to access your Project HQ dashboard
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <Button
                        variant="secondary"
                        className="w-full justify-center bg-white text-slate-900 hover:bg-slate-100 border-none font-semibold"
                        onClick={handleGoogleLogin}
                        isLoading={loading}
                        icon={
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        }
                    >
                        Continue with Google
                    </Button>

                    <Divider>Or continue with email</Divider>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <FloatingInput
                            id="email"
                            type="email"
                            label="Email address"
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

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-slate-400 hover:text-slate-300 cursor-pointer">
                                <input type="checkbox" className="mr-2 accent-indigo-500 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                                Remember me
                            </label>
                            <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        <Button
                            type="submit"
                            className="w-full justify-center mt-6 py-3.5 text-lg"
                            isLoading={loading}
                            icon={<ArrowRight className="w-5 h-5" />}
                        >
                            Sign In
                        </Button>
                    </form>
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
