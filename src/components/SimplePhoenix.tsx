import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Sparkles, Terminal } from 'lucide-react';

const SimplePhoenix = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2200; // Build up progress in 2.2 seconds
    const intervalTime = 30;
    const totalSteps = duration / intervalTime;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentProgress = Math.min(Math.round((step / totalSteps) * 100), 100);
      setProgress(currentProgress);

      if (step >= totalSteps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-950 text-white relative overflow-hidden select-none">
      {/* Background radial ambient lights (Auroras) */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-[#FF8C00]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#fec24e]/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Grid Pattern overlay for tech aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center max-w-md px-6 text-center">
        {/* Logo and Emblem Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-10"
        >
          {/* Pulsing Outer Rings */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-4 rounded-full border border-orange-500/20 blur-[2px]"
          />

          <motion.div
            animate={{
              scale: [1.1, 1.3, 1.1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute -inset-8 rounded-full border border-[#fec24e]/15 blur-[4px]"
          />

          {/* Deep Glow Behind Logo */}
          <motion.div
            animate={{
              opacity: [0.6, 0.85, 0.6],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-yellow-400 rounded-3xl blur-2xl opacity-40"
          />

          {/* Premium Logo Wrapper */}
          <div className="relative w-32 h-32 bg-gradient-to-b from-slate-900 to-black rounded-3xl p-1 shadow-2xl border border-orange-500/30 flex items-center justify-center overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FF8C00]/20 to-[#fec24e]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <img
              src="/uploads/projects/LOGO.png"
              alt="Fênix Logo"
              className="w-24 h-24 object-contain relative z-10 filter drop-shadow-[0_4px_12px_rgba(255,140,0,0.4)]"
              onError={(e) => {
                // If logo fails, gracefully render fallback shiny Flame icon
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('splash-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />

            {/* Glowing fallback Flame icon if logo doesn't render */}
            <div id="splash-fallback" className="hidden absolute inset-0 items-center justify-center z-10">
              <Flame className="w-16 h-16 text-orange-500 fill-orange-500/20" />
            </div>

            {/* Subtle decorative target borders */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-orange-500/40" />
            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-orange-500/40" />
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-orange-500/40" />
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-orange-500/40" />
          </div>

          {/* Float particles above the logo */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: 30, x: (i - 1.5) * 20, opacity: 0 }}
              animate={{
                y: -60,
                opacity: [0, 0.8, 0],
                x: (i - 1.5) * 20 + (Math.sin(i + progress) * 15)
              }}
              transition={{
                duration: 2.5 + Math.random(),
                repeat: Infinity,
                delay: i * 0.4
              }}
              className="absolute bottom-1/2 left-1/2"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400 fill-orange-400/20" />
            </motion.div>
          ))}
        </motion.div>

        {/* Brand Name Text with Cinematic Spacing */}
        <div className="space-y-3 mb-8">
          <motion.h1
            initial={{ letterSpacing: "-0.05em", opacity: 0 }}
            animate={{ letterSpacing: "0.2em", opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-3xl font-black bg-gradient-to-r from-white via-orange-100 to-[#fec24e] bg-clip-text text-transparent uppercase text-center pl-2"
          >
            FÊNIX
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400 text-xs font-bold tracking-[0.3em] uppercase"
          >
            Creative Innovation Studio
          </motion.p>
        </div>

        {/* Realistic High-Tech Progress Area */}
        <div className="w-64 relative">
          {/* Progress loader background */}
          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
            {/* Glowing progress line */}
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#FF8C00] to-[#fec24e] rounded-full relative"
            >
              {/* Dynamic shining spark */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-[2px] shadow-[0_0_8px_#FF8C00] animate-pulse" />
            </motion.div>
          </div>

          {/* Loading details */}
          <div className="flex justify-between items-center mt-3 text-[10px] text-gray-500 font-mono tracking-wider">
            <div className="flex items-center gap-1.5 uppercase">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
              <span>Iniciando App...</span>
            </div>
            <span className="text-[#FF8C00] font-bold text-xs">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePhoenix;
