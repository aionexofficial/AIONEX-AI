import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { Navbar } from "./components/navbar";
import { Faq } from "./components/faq";
import { Ecosystem } from "./components/ecosystem";
import { Roadmap } from "./components/roadmap";
import { Tokenomics } from "./components/tokenomics";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#02050b] text-white">
      <div className="stars -z-20" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[780px] bg-[radial-gradient(ellipse_at_top,rgba(0,119,255,.18),transparent_55%)]" />
      <Navbar />
      <Hero />
      <Ecosystem />
      <Tokenomics />
      <Roadmap />
      <Faq />
      <Footer />
    </main>
  );
}
