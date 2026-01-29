import React from "react";
import AntigravityBackground from "../components/background/AntigravityBackground";
import { motion } from "framer-motion";

interface AuthLayoutProps {
    children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
            <AntigravityBackground />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative z-10 w-full flex justify-center"
            >
                {children}
            </motion.div>

            <div className="absolute bottom-4 text-slate-500 text-xs text-center w-full z-10">
                &copy; {new Date().getFullYear()} Project HQ. Enterprise Secure Login.
            </div>
        </div>
    );
};

export default AuthLayout;
