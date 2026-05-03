"use client";

import { motion } from "framer-motion";

export default function PabloLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-black overflow-hidden relative">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div 
          className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-4 backdrop-blur-xl"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.img 
            src="/logo-white.svg" 
            alt="Solidus" 
            className="w-full h-full object-contain"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        
        <motion.div 
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-medium tracking-tight text-white/90">Connecting to Pablo...</h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((dot) => (
              <motion.div
                key={dot}
                className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: dot * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
