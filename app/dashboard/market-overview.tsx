"use client";

import { useEffect, useState } from "react";

type Coin = { symbol: string; name: string; color: string; price: number; change: number; id: string };
const fallback: Coin[] = [
  { symbol: "BTC", name: "Bitcoin", color: "from-orange-300 to-amber-600", price: 68342.18, change: 2.48, id: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", color: "from-indigo-300 to-violet-600", price: 3542.76, change: 1.72, id: "ethereum" },
  { symbol: "SOL", name: "Solana", color: "from-fuchsia-400 to-cyan-400", price: 172.46, change: -0.84, id: "solana" },
];

export function MarketOverview() {
  const [coins, setCoins] = useState(fallback);
  const [updated, setUpdated] = useState("Market snapshot");
  useEffect(() => {
    let live = true;
    const fetchPrices = async () => {
      try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true");
        if (!response.ok) throw new Error("Price feed unavailable");
        const data = await response.json();
        if (!live) return;
        setCoins(fallback.map((coin) => ({ ...coin, price: data[coin.id]?.usd ?? coin.price, change: data[coin.id]?.usd_24h_change ?? coin.change })));
        setUpdated("Live via CoinGecko · just updated");
      } catch { if (live) setUpdated("Market snapshot · feed reconnecting"); }
    };
    fetchPrices();
    const timer = window.setInterval(fetchPrices, 30000);
    return () => { live = false; window.clearInterval(timer); };
  }, []);
  return <section><div className="mb-5 flex items-center justify-between"><div><p className="dashboard-kicker">MARKET PULSE</p><h2 className="mt-1 text-xl font-semibold">Live crypto overview</h2></div><p className="hidden text-xs text-slate-500 sm:block">{updated}</p></div><div className="grid gap-4 md:grid-cols-3">{coins.map((coin) => <article key={coin.symbol} className="dashboard-card group p-5"><div className="flex items-center justify-between"><div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${coin.color} text-sm font-black text-white shadow-lg`}>{coin.symbol.slice(0, 1)}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coin.change >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{coin.change >= 0 ? "+" : ""}{coin.change.toFixed(2)}%</span></div><div className="mt-6"><p className="text-sm text-slate-400">{coin.name} <span className="text-slate-600">· {coin.symbol}</span></p><p className="mt-1 text-2xl font-semibold tracking-tight">${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div><div className="mt-5 h-9 opacity-70"><svg viewBox="0 0 160 36" className="h-full w-full overflow-visible" preserveAspectRatio="none"><path d={coin.change >= 0 ? "M0 28 C22 27 23 12 47 20 S72 25 91 13 S130 21 160 2" : "M0 7 C22 6 31 22 52 15 S82 8 105 23 S140 15 160 29"} fill="none" stroke="currentColor" strokeWidth="2" className={coin.change >= 0 ? "text-emerald-300" : "text-rose-300"}/></svg></div></article>)}</div></section>;
}
