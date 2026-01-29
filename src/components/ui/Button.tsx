import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    isLoading?: boolean;
    icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = "primary",
    isLoading = false,
    icon,
    disabled,
    ...props
}) => {
    const baseStyles = "relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]";

    const variants = {
        primary: "bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/20",
        secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/10 focus:ring-white/20 backdrop-blur-sm",
        outline: "bg-transparent border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 focus:ring-indigo-500",
        ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white"
    };

    return (
        <button
            className={clsx(baseStyles, variants[variant], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-current" />
            ) : (
                <>
                    {icon && <span className="w-5 h-5">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
};

export default Button;
