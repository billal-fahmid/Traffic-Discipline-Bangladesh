import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login?next=/profile");

  return (
    <>
      <Navbar />
      <main id="main-content" className="container py-12">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold">My Profile</h1>
          <p className="mt-1 text-muted-foreground">Update your photo and personal details.</p>
        </div>
        <ProfileForm profile={profile} email={user.email ?? ""} />
      </main>
      <Footer />
    </>
  );
}
