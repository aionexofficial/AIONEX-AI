import { Reveal } from "./reveal";

const features = [
  ["01", "AI signal layer", "Turn complex on-chain data into clearer, actionable intelligence."],
  ["02", "Community owned", "A network built around aligned incentives and transparent participation."],
  ["03", "Built to connect", "Interoperable infrastructure designed for the next generation of web3."],
];

export function Ecosystem() {
  return <section id="ecosystem" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24 sm:py-32">
    <Reveal className="grid items-end gap-8 border-y border-white/10 py-10 md:grid-cols-[1fr_auto]">
      <div><p className="eyebrow">THE AIONEX ADVANTAGE</p><h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Intelligence that moves at the pace of markets.</h2></div>
      <p className="max-w-sm text-sm leading-7 text-slate-400">A refined operating layer for a world where information, capital, and community move together.</p>
    </Reveal>
    <div className="mt-6 grid gap-4 md:grid-cols-3">{features.map(([number, title, text], index) => <Reveal key={number} className={`reveal-delay-${index + 1}`}><article className="glass-card h-full p-7"><span className="text-sm font-semibold text-cyan-300">{number}</span><div className="mt-14 h-px w-full bg-gradient-to-r from-cyan-300/60 to-transparent" /><h3 className="mt-7 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></article></Reveal>)}</div>
  </section>;
}
