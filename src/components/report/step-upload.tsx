"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, FileVideo, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILES = 5;
const MAX_SIZE_MB = 50;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];

export function StepUpload({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list);
    const accepted: File[] = [];

    for (const f of incoming) {
      if (!ACCEPTED.includes(f.type)) {
        setError(`${f.name}: unsupported file type.`);
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`${f.name}: exceeds ${MAX_SIZE_MB}MB limit.`);
        continue;
      }
      accepted.push(f);
    }

    const combined = [...files, ...accepted].slice(0, MAX_FILES);
    if (files.length + accepted.length > MAX_FILES) {
      setError(`You can attach up to ${MAX_FILES} files.`);
    }
    onChange(combined);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
      >
        <UploadCloud className="h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-medium">Drag & drop photo or video evidence, or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WEBP, MP4, MOV, WEBM — up to {MAX_SIZE_MB}MB each, {MAX_FILES} files max
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="group relative overflow-hidden rounded-lg border bg-muted">
              {f.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(f)} alt={f.name} className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <FileVideo className="h-6 w-6" />
                  <span className="text-[10px]">{f.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" /> Evidence is optional but significantly speeds up review.
      </p>
    </div>
  );
}
