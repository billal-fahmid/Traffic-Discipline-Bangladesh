import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AdminNav } from "@/components/site/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-10">
        <AdminNav />
        {children}
      </main>
      <Footer />
    </>
  );
}
