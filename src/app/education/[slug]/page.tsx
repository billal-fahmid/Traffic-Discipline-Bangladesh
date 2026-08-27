import { notFound } from "next/navigation";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { EducationTopicView } from "@/components/education/education-topic-view";
import { EDUCATION_TOPICS } from "@/lib/education-content";

export function generateStaticParams() {
  return EDUCATION_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = EDUCATION_TOPICS.find((t) => t.slug === slug);
  return { title: topic ? `${topic.title_en} — Traffic Education` : "Traffic Education" };
}

export default async function EducationTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = EDUCATION_TOPICS.find((t) => t.slug === slug);
  if (!topic) notFound();

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <EducationTopicView topic={topic} />
      </main>
      <Footer />
    </>
  );
}
