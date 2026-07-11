"use client";

import { useEffect, useRef, useState } from "react";

type Stat = { value: number; prefix?: string; suffix?: string; label: string };

const stats: Stat[] = [
  { value: 250, suffix: "K+", label: "Global community" },
  { value: 24, suffix: "/7", label: "Intelligence layer" },
  { value: 1, suffix: "B", label: "Total AIONEX supply" },
];

export function AnimatedStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [numbers, setNumbers] = useState(stats.map(() => 0));

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.25 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const duration = 1150;
    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setNumbers(stats.map((stat) => Math.round(stat.value * eased)));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [visible]);

  return <div ref={ref} className="mt-14 grid max-w-xl grid-cols-3 gap-3">
    {stats.map((stat, index) => <div key={stat.label} className="glass-card group p-3.5 sm:p-4">
      <strong className="block text-lg text-cyan-100 sm:text-2xl">{stat.prefix}{numbers[index]}{stat.suffix}</strong>
      <span className="mt-1 block text-[10px] leading-4 text-slate-400 sm:text-[11px]">{stat.label}</span>
    </div>)}
  </div>;
}
