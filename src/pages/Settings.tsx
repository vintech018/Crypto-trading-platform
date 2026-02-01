import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Bell, Palette, ChevronRight, LogOut, Check } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencySettings, type Currency } from '../contexts/CurrencyContext';

const Settings: React.FC = () => {
    const { user, logout } = useAuth();
    const { currency, setCurrency } = useCurrencySettings();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'display'>('profile');

    const tabs = [
        { id: 'profile' as const, label: 'Profile', icon: User },
        { id: 'security' as const, label: 'Security', icon: Shield },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
        { id: 'display' as const, label: 'Display', icon: Palette },
    ];

    const currencies: { value: Currency; label: string; symbol: string }[] = [
        { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
        { value: 'USD', label: 'US Dollar', symbol: '$' },
    ];

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                    <p className="text-slate-400">Manage your account preferences.</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-2">
                            {tabs.map((tab) => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-500/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}>
                                    <tab.icon className="w-5 h-5" />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            ))}
                            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-2">
                                <LogOut className="w-5 h-5" /><span className="font-medium">Logout</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* Content */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-3">
                        <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                                    <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-white text-2xl font-bold">{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                                        </div>
                                        <div><p className="text-white font-semibold">{user?.email?.split('@')[0] || 'User'}</p><p className="text-slate-500 text-sm">{user?.email}</p></div>
                                    </div>
                                    <div><label className="block text-slate-400 text-sm mb-2">Display Name</label>
                                        <input type="text" defaultValue={user?.email?.split('@')[0]} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white" />
                                    </div>
                                    <div><label className="block text-slate-400 text-sm mb-2">Email</label>
                                        <input type="email" defaultValue={user?.email || ''} disabled className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-500" />
                                    </div>
                                    <button className="px-6 py-3 bg-indigo-500 rounded-xl text-white font-semibold hover:bg-indigo-400">Save Changes</button>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-white">Security Settings</h2>
                                    <div className="p-4 bg-slate-900/50 rounded-xl flex items-center justify-between">
                                        <div><p className="text-white font-medium">Two-Factor Authentication</p><p className="text-slate-500 text-sm">Add an extra layer of security</p></div>
                                        <div className="flex items-center gap-2 text-green-400"><Check className="w-5 h-5" /><span className="text-sm">Enabled</span></div>
                                    </div>
                                    <div className="p-4 bg-slate-900/50 rounded-xl flex items-center justify-between">
                                        <div><p className="text-white font-medium">Change Password</p><p className="text-slate-500 text-sm">Update your password</p></div>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="p-4 bg-slate-900/50 rounded-xl flex items-center justify-between">
                                        <div><p className="text-white font-medium">Active Sessions</p><p className="text-slate-500 text-sm">Manage your logged-in devices</p></div>
                                        <span className="text-indigo-400 text-sm">2 devices</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                                    {['Price Alerts', 'Order Updates', 'Security Alerts', 'Newsletter'].map((item) => (
                                        <div key={item} className="p-4 bg-slate-900/50 rounded-xl flex items-center justify-between">
                                            <p className="text-white font-medium">{item}</p>
                                            <label className="relative inline-flex cursor-pointer">
                                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-700 peer-checked:bg-indigo-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'display' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-semibold text-white">Display Preferences</h2>

                                    {/* Currency Selector */}
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-3">Currency</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {currencies.map((curr) => (
                                                <button
                                                    key={curr.value}
                                                    onClick={() => setCurrency(curr.value)}
                                                    className={`p-4 rounded-xl border-2 transition-all ${currency === curr.value
                                                            ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                                            : 'bg-slate-900/50 border-white/10 text-slate-400 hover:border-white/30'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">{curr.symbol}</span>
                                                            <div className="text-left">
                                                                <p className="font-semibold">{curr.value}</p>
                                                                <p className="text-sm opacity-70">{curr.label}</p>
                                                            </div>
                                                        </div>
                                                        {currency === curr.value && (
                                                            <Check className="w-5 h-5 text-indigo-400" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-slate-500 text-sm mt-2">
                                            All prices will be displayed in {currency === 'INR' ? 'Indian Rupees (₹)' : 'US Dollars ($)'}
                                        </p>
                                    </div>

                                    {/* Theme Selector */}
                                    <div>
                                        <label className="block text-slate-400 text-sm mb-3">Theme</label>
                                        <div className="flex gap-3">
                                            <button className="flex-1 p-4 bg-slate-900 border-2 border-indigo-500 rounded-xl text-center">
                                                <p className="text-white font-medium">Dark</p>
                                            </button>
                                            <button className="flex-1 p-4 bg-slate-900/50 border border-white/10 rounded-xl text-center opacity-50 cursor-not-allowed">
                                                <p className="text-slate-400 font-medium">Light</p>
                                                <p className="text-slate-600 text-xs mt-1">Coming soon</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Settings;
