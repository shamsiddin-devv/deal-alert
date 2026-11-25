import PublicNav from '@/components/feature/PublicNav';
import PublicFooter from '@/components/feature/PublicFooter';
import Hero from './components/Hero';
import { FeatureGrid, HowItWorks, MarketplaceStrip } from './components/Sections';
import { ComparisonShowcase, TrackingShowcase } from './components/Showcases';
import { Benefits, CallToAction, Faq } from './components/Closing';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background-100">
      <PublicNav />
      <main>
        <Hero />
        <MarketplaceStrip />
        <FeatureGrid />
        <HowItWorks />
        <TrackingShowcase />
        <ComparisonShowcase />
        <Benefits />
        <Faq />
        <CallToAction />
      </main>
      <PublicFooter />
    </div>
  );
}