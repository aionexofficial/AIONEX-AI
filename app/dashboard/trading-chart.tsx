"use client";

import { useState } from "react";

const pairs = ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT"];
export function TradingChart() {
  const [pair, setPair] = useState(pairs[0]);
  const query = new URLSearchParams({ symbol: pair, interval: "60", theme: "dark", style: "1", locale: "en", toolbarbg: "#07101d", hide_top_toolbar: "0", allow_symbol_change: "0", save_image: "0", studies: "[]", withdateranges: "1" });
  return <section className="dashboard-card overflow-hidden"><div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="dashboard-kicker">MARKET TERMINAL</p><h2 className="mt-1 text-xl font-semibold">Interactive price chart</h2></div><div className="flex rounded-lg border border-white/10 bg-black/20 p-1">{pairs.map((item) => <button onClick={() => setPair(item)} key={item} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${pair === item ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:text-white"}`}>{item.split(":")[1].replace("USDT", "")}</button>)}</div></div><iframe key={pair} title={`${pair} interactive TradingView chart`} src={`https://s.tradingview.com/widgetembed/?${query.toString()}`} className="h-[430px] w-full border-0" loading="lazy" /></section>;
}
