import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    ChevronDown,
    User,
    Settings,
    LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from '../GlobalSearch';

interface HeaderProps {
    sidebarCollapsed: boolean;
}

const Header: React.FC<HeaderProps> = ({ sidebarCollapsed }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const notifications = [
        { id: 1, title: 'BTC Price Alert', message: 'Bitcoin crossed $97,500', time: '2m ago', unread: true },
        { id: 2, title: 'Order Filled', message: 'Your ETH buy order completed', time: '1h ago', unread: true },
        { id: 3, title: 'Security Alert', message: 'New login from Chrome on Mac', time: '3h ago', unread: false },
    ];

    const unreadCount = notifications.filter(n => n.unread).length;

    return (
        <header
            className="fixed top-0 right-0 h-16 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-6 transition-all duration-300"
            style={{ left: sidebarCollapsed ? 80 : 260 }}
        >
            {/* Global Search - Command Palette (Cmd+K) */}
            <GlobalSearch onSelect={(coin) => navigate(`/trade?symbol=${coin.symbol}`)} />

            {/* Right section */}
            <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowDropdown(false);
                        }}
                        className="relative p-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-80 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                    <h3 className="font-semibold text-white">Notifications</h3>
                                    <button className="text-xs text-indigo-400 hover:text-indigo-300">Mark all read</button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${notif.unread ? 'bg-indigo-500/5' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {notif.unread && (
                                                    <span className="w-2 h-2 mt-2 bg-indigo-400 rounded-full flex-shrink-0" />
                                                )}
                                                <div className={notif.unread ? '' : 'ml-5'}>
                                                    <p className="font-medium text-white text-sm">{notif.title}</p>
                                                    <p className="text-slate-400 text-sm mt-0.5">{notif.message}</p>
                                                    <p className="text-slate-500 text-xs mt-1">{notif.time}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 border-t border-white/10">
                                    <button className="w-full py-2 text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                        View all notifications
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* User menu */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowDropdown(!showDropdown);
                            setShowNotifications(false);
                        }}
                        className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl bg-slate-800/50 border border-white/10 hover:border-white/20 transition-all"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-white text-sm font-medium truncate max-w-[120px]">
                                {user?.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-slate-500 text-xs">Pro Account</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                    </button>

                    <AnimatePresence>
                        {showDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-56 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            >
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            navigate('/settings');
                                            setShowDropdown(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        <span className="text-sm">Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigate('/settings');
                                            setShowDropdown(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span className="text-sm">Settings</span>
                                    </button>
                                </div>
                                <div className="border-t border-white/10 p-2">
                                    <button
                                        onClick={() => {
                                            logout();
                                            setShowDropdown(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="text-sm">Logout</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default Header;
