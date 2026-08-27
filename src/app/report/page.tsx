import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ReportWizard } from "@/components/report/report-wizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Report a Violation — Traffic Discipline Bangladesh" };

export default function ReportPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12 lg:py-16">
        <ReportWizard />
      </main>
      <Footer />
    </>
  );
}
