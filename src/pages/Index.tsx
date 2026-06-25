import Header from "../components/Header";
import Hero from "../components/Hero";
import Collection from "../components/Collection";
import PerfectMatch from "../components/PerfectMatch";
import Story from "../components/Story";
import Lookbook from "../components/Lookbook";
import BentoGrid from "../components/BentoGrid";
import CollectionsShowcase from "../components/CollectionsShowcase";
import Footer from "../components/Footer";

/** The landing page — kept mounted across routes so the product morph stays seamless. */
export default function Landing() {
  return (
    <>
      <Header />
      <Hero />
      <Collection />
      <PerfectMatch />
      <Story />
      <Lookbook />
      <BentoGrid />
      <CollectionsShowcase />
      <Footer />
    </>
  );
}
