import React from "react";

const Divider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    return (
        <div className="relative flex items-center w-full my-6">
            <div className="flex-grow border-t border-white/10"></div>
            {children && (
                <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-500 uppercase">
                    {children}
                </span>
            )}
            <div className="flex-grow border-t border-white/10"></div>
        </div>
    );
};

export default Divider;
