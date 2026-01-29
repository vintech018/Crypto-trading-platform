import React from "react";
import clsx from "clsx";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className }) => {
    return (
        <div
            className={clsx(
                "glass rounded-2xl p-8 w-full max-w-md relative overflow-hidden",
                "border border-white/10",
                "bg-gradient-to-br from-white/10 to-transparent",
                className
            )}
        >
            <div className="absolute inset-0 bg-slate-900/40 -z-10" />
            {children}
        </div>
    );
};

export default GlassCard;
