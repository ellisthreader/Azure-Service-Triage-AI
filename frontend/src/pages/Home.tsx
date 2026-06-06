import type { Route } from "../router";
import { Cta, Features, Footer, Hero, News, Queue, Quotes, Services, Tiles, TrustStrip } from "../home/sections";

type Props = {
  onOpenChat: (prompt?: string) => void;
  onNavigate: (route: Route) => void;
};

export function Home({ onOpenChat, onNavigate }: Props) {
  return (
    <div className="portal">
      <Hero onAsk={onOpenChat} onOpen={onNavigate} />
      <TrustStrip />
      <Queue onOpen={onNavigate} />
      <Services onOpen={onNavigate} />
      <Tiles onOpen={onNavigate} />
      <Features onOpen={onNavigate} />
      <Quotes />
      <News />
      <Cta onAsk={() => onOpenChat()} />
      <Footer />
    </div>
  );
}
