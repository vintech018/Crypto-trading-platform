import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    ArrowLeftRight,
    PieChart,
    TrendingUp,
    Wallet,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/trade', icon: ArrowLeftRight, label: 'Trade' },
    { path: '/portfolio', icon: PieChart, label: 'Portfolio' },
    { path: '/markets', icon: TrendingUp, label: 'Markets' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
    const { logout } = useAuth();

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 80 : 260 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed left-0 top-0 h-screen bg-slate-900/80 backdrop-blur-xl border-r border-white/5 z-50 flex flex-col"
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-white/5">
                <motion.div
                    initial={false}
                    animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                    className="overflow-hidden"
                >
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                        CryptoVault
                    </span>
                </motion.div>
                {collapsed && (
                    <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        C
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
              ${isActive
                                ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-400 to-cyan-400 rounded-r-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                                <motion.span
                                    initial={false}
                                    animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                                    className="font-medium whitespace-nowrap overflow-hidden"
                                >
                                    {item.label}
                                </motion.span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-white/5">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <motion.span
                        initial={false}
                        animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                    >
                        Logout
                    </motion.span>
                </button>

                {/* Toggle button */}
                <button
                    onClick={onToggle}
                    className="mt-2 flex items-center justify-center w-full py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
