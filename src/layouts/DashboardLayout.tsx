import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Background gradient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <Header sidebarCollapsed={sidebarCollapsed} />

            {/* Main content */}
            <motion.main
                initial={false}
                animate={{
                    marginLeft: sidebarCollapsed ? 80 : 260,
                    paddingTop: 64
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="min-h-screen relative z-10"
            >
                <div className="p-6">
                    {children}
                </div>
            </motion.main>
        </div>
    );
};

export default DashboardLayout;
