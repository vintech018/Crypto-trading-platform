import React, { useState } from "react";
import clsx from "clsx";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    rightIcon?: React.ReactNode;
    onRightIconClick?: () => void;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
    label,
    id,
    className,
    error,
    rightIcon,
    onRightIconClick,
    disabled,
    onFocus,
    onBlur,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        setHasValue(!!e.target.value);
        onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHasValue(!!e.target.value);
        props.onChange?.(e);
    };

    return (
        <div className={clsx("relative", className)}>
            <div className="relative">
                <input
                    id={id}
                    className={clsx(
                        "peer w-full bg-white/5 border border-white/10 rounded-xl px-4 pt-6 pb-2 text-slate-100 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-200",
                        (error) && "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50",
                        disabled && "opacity-50 cursor-not-allowed bg-slate-800/50"
                    )}
                    placeholder={label}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={handleChange}
                    disabled={disabled}
                    {...props}
                />
                <label
                    htmlFor={id}
                    className={clsx(
                        "absolute left-4 transition-all duration-200 pointer-events-none text-slate-400",
                        (isFocused || hasValue || props.value)
                            ? "top-1.5 text-xs text-indigo-400"
                            : "top-4 text-base"
                    )}
                >
                    {label}
                </label>
                {rightIcon && (
                    <button
                        type="button"
                        onClick={onRightIconClick}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors focus:outline-none"
                        tabIndex={-1}
                    >
                        {rightIcon}
                    </button>
                )}
            </div>
            {error && (
                <p className="mt-1 text-xs text-red-400 ml-1">{error}</p>
            )}
        </div>
    );
};

export default FloatingInput;
