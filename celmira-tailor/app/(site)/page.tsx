import { HeroSection } from "@/components/home/HeroSection";
import { ServiceGrid } from "@/components/home/ServiceGrid";
import { AboutService } from "@/components/home/AboutService";
import { ProcessSteps } from "@/components/home/ProcessSteps";
import { DesignStudioPreview } from "@/components/home/DesignStudioPreview";
import { MeasurementStudioPreview } from "@/components/home/MeasurementStudioPreview";
import { PortfolioGrid } from "@/components/home/PortfolioGrid";
import { AdvantagesSection } from "@/components/home/AdvantagesSection";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServiceGrid />
      <AboutService />
      <ProcessSteps />
      <DesignStudioPreview />
      <MeasurementStudioPreview />
      <PortfolioGrid />
      <AdvantagesSection />
      <CTASection />
    </>
  );
}
