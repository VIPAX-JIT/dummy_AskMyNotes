"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool } from "lucide-react";
import { usePathname } from "next/navigation";

const loadingTexts = [
  "Sharpening pencils...",
  "Opening notebooks...",
  "Finding the right page...",
  "Getting things ready...",
];

/** Inline graph-paper background — no Tailwind needed */
function GraphPaperBg() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        backgroundColor: "#fdfbf7",
        backgroundImage:
          "linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        opacity: 0.08,
      }}
    />
  );
}

/** Inline logo — notebook + chat bubble, matches harsh_repo AskMyNotesLogo */
function AskMyNotesLogo({ size = 64 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Yellow blob */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          color: "#fde047",
          transform: "scale(1.35) translate(4px, 4px)",
          filter: "url(#preloader-squiggle)",
        }}
        viewBox="0 0 100 100"
      >
        <path d="M 15 40 Q 50 10 85 50 T 25 85 Z" fill="currentColor" />
      </svg>

      {/* Notebook icon */}
      <svg
        style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", color: "#1e293b", overflow: "visible", filter: "url(#preloader-squiggle)" }}
        viewBox="0 0 100 100"
      >
        {/* Chat bubble tail */}
        <path d="M 65 72 L 95 100 L 85 50 Z" fill="white" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
        {/* Open notebook */}
        <path d="M 10 25 Q 30 15 50 25 Q 70 15 90 25 L 90 75 Q 70 65 50 75 Q 30 65 10 75 Z" fill="white" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
        {/* Spine */}
        <path d="M 50 25 L 50 75" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        {/* Left page lines */}
        <path d="M 22 40 Q 30 37 40 39" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M 20 54 Q 30 51 40 53" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        {/* Question mark on right page */}
        <path d="M 60 40 Q 70 28 80 38 T 72 56" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <circle cx="72" cy="68" r="4" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function Preloader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(pathname === "/");
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const textInterval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 800);

    const hideTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3200);

    return () => {
      clearInterval(textInterval);
      clearTimeout(hideTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="preloader"
          exit={{ y: "-100%", opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fdfbf7",
          }}
        >
          {/* SVG squiggle filter */}
          <svg style={{ display: "none" }}>
            <defs>
              <filter id="preloader-squiggle">
                <feTurbulence type="fractalNoise" baseFrequency="0.015 0.015" numOctaves={3} result="noise" seed={0} />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} />
              </filter>
            </defs>
          </svg>

          {/* Graph-paper bg */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundColor: "#fdfbf7" }} />
            <GraphPaperBg />

            {/* Floating study doodles */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Spinning dashed circles */}
              <svg
                style={{ width: 600, height: 600, color: "#fde047", position: "absolute", zIndex: 0, opacity: 0.35, animation: "spin 80s linear infinite" }}
                viewBox="0 0 200 200"
                fill="none"
              >
                <path d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0" stroke="currentColor" strokeWidth="1" strokeDasharray="10 15" />
                <path d="M 100, 100 m -50, 0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0" stroke="currentColor" strokeWidth="1" strokeDasharray="5 10" opacity={0.5} />
              </svg>

              <motion.div animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", top: "20%", left: "15%", color: "#60a5fa", opacity: 0.5 }}>
                <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </motion.div>

              <motion.div animate={{ y: [0, 10, 0], rotate: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", bottom: "25%", right: "15%", color: "#34d399", opacity: 0.5 }}>
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
              </motion.div>

              <motion.div animate={{ scale: [1, 1.1, 1], rotate: [10, -10, 10] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", top: "25%", right: "25%", color: "#fb7185", opacity: 0.5 }}>
                <svg width="55" height="55" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" /><path d="m9 9 12-2" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </motion.div>

              <motion.div animate={{ x: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", bottom: "35%", left: "25%", color: "#c084fc", opacity: 0.5 }}>
                <svg width="65" height="65" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />
                </svg>
              </motion.div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Logo */}
            <div style={{ marginBottom: 48 }}>
              <motion.div animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ position: "relative" }}>
                <AskMyNotesLogo size={64} />
                <motion.svg
                  style={{ position: "absolute", top: -24, right: -32, width: 40, height: 40, color: "#facc15" }}
                  viewBox="0 0 50 50"
                  animate={{ rotate: 180, scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <path d="M 25 5 L 30 20 L 45 25 L 30 30 L 25 45 L 20 30 L 5 25 L 20 20 Z" fill="currentColor" style={{ filter: "url(#preloader-squiggle)" }} />
                </motion.svg>
              </motion.div>
            </div>

            {/* Sketchy progress bar */}
            <div style={{ position: "relative", width: 280, height: 40, marginBottom: 24 }}>
              {/* Border */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "4px solid #1e293b",
                  borderRadius: 6,
                  backgroundColor: "white",
                  filter: "url(#preloader-squiggle)",
                }}
              />
              {/* Fill */}
              <div style={{ position: "absolute", left: 8, right: 8, top: 8, bottom: 8, overflow: "hidden", borderRadius: 4, filter: "url(#preloader-squiggle)" }}>
                <motion.div
                  style={{ height: "100%", backgroundColor: "#fde047", transformOrigin: "left center" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
              {/* Pencil */}
              <motion.div
                style={{ position: "absolute", top: -40, left: 0 }}
                initial={{ x: "-5%" }}
                animate={{ x: "105%" }}
                transition={{ duration: 3, ease: "easeInOut" }}
              >
                <motion.div
                  animate={{ rotate: [-10, 0, -15, 5, -10], y: [0, -4, 2, -2, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                >
                  <PenTool size={38} color="#1e293b" fill="white" style={{ transform: "rotate(-100deg)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" }} />
                </motion.div>
              </motion.div>
            </div>

            {/* Cycling text */}
            <div style={{ height: 32, marginBottom: 8 }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={textIndex}
                  initial={{ opacity: 0, y: 10, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={{ opacity: 0, y: -10, rotate: 2 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontFamily: "var(--font-serif, serif)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1e293b",
                    letterSpacing: "0.03em",
                    filter: "url(#preloader-squiggle)",
                    margin: 0,
                  }}
                >
                  {loadingTexts[textIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Sub text */}
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", margin: 0 }}>
              ResearchPilot × AskMyNotes
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
