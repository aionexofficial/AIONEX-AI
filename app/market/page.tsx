import { AppShell } from "../components/app-shell";
import { MarketOverview } from "../dashboard/market-overview";
export default function Market() { return <AppShell eyebrow="MARKET INTELLIGENCE" title="Live market pulse."><div className="mt-10"><MarketOverview /></div></AppShell>; }
