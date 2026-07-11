import { AnimatedStats } from "./animated-stats";

export function Hero() {
  return <section id="top" className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:pt-32">
    <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <p className="eyebrow mb-6"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" /> THE ON-CHAIN INTELLIGENCE LAYER</p>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">Build with the speed of <span className="text-gradient">intelligence.</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">AIONEX AI connects advanced intelligence, community ownership, and transparent on-chain infrastructure in one powerful ecosystem.</p>
        <div className="mt-9 flex flex-wrap gap-4"><a href="#tokenomics" className="rounded-xl bg-cyan-400 px-6 py-3.5 font-semibold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.3)] transition hover:-translate-y-0.5 hover:bg-cyan-300">Explore the token <span aria-hidden>↗</span></a><a href="#roadmap" className="rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:border-cyan-200/50 hover:bg-white/10">View roadmap</a></div>
        <AnimatedStats />
      </div>
      <div className="float relative mx-auto aspect-square w-full max-w-[430px]">
        <div className="pulse-ring absolute inset-[8%] rounded-full border border-cyan-300/20" /><div className="orbit absolute inset-[2%] rounded-full border border-dashed border-cyan-100/20" />
        <div className="absolute inset-[17%] rounded-full border border-cyan-300/25 bg-cyan-400/[.04] shadow-[inset_0_0_65px_rgba(8,145,255,.12),0_0_90px_rgba(0,129,255,.16)]" />
        <div className="absolute inset-[29%] grid place-items-center rounded-full border border-cyan-200/40 bg-[radial-gradient(circle_at_35%_25%,#54dfff,#0474d8_55%,#061a44)] shadow-[0_0_70px_rgba(20,174,255,.58)]"><div className="text-center"><span className="text-6xl font-bold tracking-tighter text-white">A</span><span className="block text-[10px] font-bold tracking-[.35em] text-cyan-100">AIONEX</span></div></div>
        <span className="absolute left-2 top-[22%] rounded-lg border border-cyan-200/20 bg-[#07182a]/80 px-3 py-2 text-xs text-cyan-100 backdrop-blur">AI-powered</span>
        <span className="absolute bottom-[18%] right-0 rounded-lg border border-cyan-200/20 bg-[#07182a]/80 px-3 py-2 text-xs text-cyan-100 backdrop-blur">Decentralized</span>
      </div>
    </div>
  </section>;
}
