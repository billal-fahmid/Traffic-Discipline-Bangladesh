"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateProfile, updateAvatar, updateEmail } from "@/app/profile/actions";
import { Camera, Loader2 } from "lucide-react";
import type { Profile } from "@/lib/types";

const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function Msg({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <p className={`mt-2 rounded-md p-2 text-sm ${tone === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
      {text}
    </p>
  );
}

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AvatarCard profile={profile} />
      <DetailsCard profile={profile} />
      <EmailCard email={email} />
    </div>
  );
}

function AvatarCard({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setMsg(null);

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setMsg({ text: "Please choose a JPG, PNG, or WEBP image.", tone: "error" });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setMsg({ text: "Image must be under 5MB.", tone: "error" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      setMsg({ text: "Couldn't upload that image.", tone: "error" });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new photo shows immediately instead of a stale CDN copy.
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    const res = await updateAvatar({ avatarUrl: publicUrl });
    setUploading(false);
    if (!res.ok) {
      setMsg({ text: res.error, tone: "error" });
      return;
    }
    setAvatarUrl(publicUrl);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Profile Photo</CardTitle></CardHeader>
      <CardContent className="flex items-center gap-4 p-5 pt-0">
        <div className="relative">
          <UserAvatar
            avatarUrl={avatarUrl}
            name={profile.full_name}
            seed={profile.id}
            className="h-20 w-20 border text-xl"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted disabled:opacity-50"
            aria-label="Change profile photo"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Upload a photo</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP — up to 5MB.</p>
          {msg && <Msg {...msg} />}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsCard({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [district, setDistrict] = useState(profile.district ?? "");
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await updateProfile({ fullName, phone, address, district });
      setMsg(res.ok ? { text: "Profile updated.", tone: "success" } : { text: res.error, tone: "error" });
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
      <CardContent className="p-5 pt-0">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Dhaka" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, area" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
          </Button>
          {msg && <Msg {...msg} />}
        </form>
      </CardContent>
    </Card>
  );
}

function EmailCard({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(email);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await updateEmail({ email: value });
      setMsg(res.ok ? { text: res.message, tone: "success" } : { text: res.error, tone: "error" });
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Email</CardTitle></CardHeader>
      <CardContent className="p-5 pt-0">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" value={value} onChange={(e) => setValue(e.target.value)} required />
            <p className="text-xs text-muted-foreground">Changing your email requires confirming it via a link sent to the new address.</p>
          </div>
          <Button type="submit" disabled={pending || value === email}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update Email
          </Button>
          {msg && <Msg {...msg} />}
        </form>
      </CardContent>
    </Card>
  );
}
