import type { Route } from "../router";
import { Cta, Features, Footer, Hero, News, Queue, Quotes, Services, Tiles, TrustStrip } from "../home/sections";

type Props = {
  onNavigate: (route: Route) => void;
};

export function Home({ onNavigate }: Props) {
  return (
    <div className="portal">
      <Hero onOpen={onNavigate} />
      <TrustStrip />
      <Queue />
      <Services />
      <Tiles />
      <Features />
      <Quotes />
      <News />
      <Cta />
      <Footer />
    </div>
  );
}
