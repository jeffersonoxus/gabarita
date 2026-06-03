"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@supabase/ssr";
import { ImagePlus, Trash2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  bucket: string;
  folder?: string;
}

export default function ImageUploader({ value, onChange, bucket, folder = "" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const compressAndUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });

      const maxW = 1200;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject("Erro WebP"); }, "image/webp", 0.7);
      });

      const ext = "webp";
      const name = `${folder}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(name, blob, {
        contentType: "image/webp", upsert: false,
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(name);
      const url = urlData.publicUrl;
      setPreview(url);
      onChange(url);
    } catch (e: any) {
      alert("Erro no upload: " + (e.message || "Desconhecido"));
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, onChange]);

  const handleFile = (file: File) => { if (file.type.startsWith("image/")) compressAndUpload(file); };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onPaste={(e) => { const f = e.clipboardData.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
        ) : uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Comprimindo e enviando...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            <ImagePlus className="w-6 h-6 mx-auto mb-1" />
            Arraste, cole ou clique para enviar imagem
          </div>
        )}
      </div>
      {preview && (
        <Button size="sm" variant="ghost" className="mt-1 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); setPreview(""); onChange(""); }}>
          <Trash2 className="w-3 h-3 mr-1" /> Remover
        </Button>
      )}
    </div>
  );
}
