"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Star, Loader2, ImagePlus, AlertCircle
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { cn, formatFileSize } from "@/lib/utils";
import apiClient from "@/lib/api/client";

interface UploadedImage {
  id: string;
  display_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  file_size_bytes?: number;
}

interface ImageUploaderProps {
  machineId: string;
  existingImages?: UploadedImage[];
  onImagesChange?: (images: UploadedImage[]) => void;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp",
};

const MAX_FILES = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface PreviewFile {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

export function ImageUploader({ machineId, existingImages = [], onImagesChange }: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadedImage | null> => {
    try {
      // Compress before upload
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      const formData = new FormData();
      formData.append("file", compressed, `${Date.now()}.webp`);

      const { data } = await apiClient.post<UploadedImage>(
        `/vendor/listings/${machineId}/images`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    } catch {
      return null;
    }
  }, [machineId]);

  const processFiles = useCallback(async (files: File[]) => {
    const remaining = MAX_FILES - images.length - previews.length;
    const toProcess = files
      .filter((f) => ALLOWED_TYPES.includes(f.type))
      .slice(0, remaining);

    if (toProcess.length === 0) return;

    // Add preview placeholders
    const newPreviews: PreviewFile[] = toProcess.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Upload each
    for (let i = 0; i < toProcess.length; i++) {
      const result = await uploadFile(toProcess[i]);
      setPreviews((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((p) => p.preview === newPreviews[i].preview);
        if (idx !== -1) {
          if (result) {
            updated.splice(idx, 1);
            setImages((imgs) => {
              const next = [...imgs, result];
              onImagesChange?.(next);
              return next;
            });
          } else {
            updated[idx] = { ...updated[idx], uploading: false, error: "Upload failed" };
          }
        }
        return updated;
      });
    }
  }, [images.length, previews.length, uploadFile, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [processFiles]);

  const handleDelete = async (imageId: string) => {
    try {
      await apiClient.delete(`/vendor/listings/${machineId}/images/${imageId}`);
      setImages((prev) => {
        const next = prev.filter((img) => img.id !== imageId);
        onImagesChange?.(next);
        return next;
      });
    } catch {
      /* silent fail */
    }
  };

  const setPrimary = async (imageId: string) => {
    try {
      await apiClient.patch(`/vendor/listings/${machineId}/images/${imageId}/primary`);
      setImages((prev) => {
        const next = prev.map((img) => ({ ...img, is_primary: img.id === imageId }));
        onImagesChange?.(next);
        return next;
      });
    } catch {
      /* silent fail */
    }
  };

  const total = images.length + previews.filter((p) => p.uploading).length;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      {total < MAX_FILES && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors", isDragging ? "bg-primary/20" : "bg-muted")}>
            <ImagePlus className={cn("h-6 w-6", isDragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? "Drop images here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WebP · Max 10 photos · Auto-compressed to WebP
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              processFiles(files);
              e.target.value = ""; // Reset so same file can be re-selected
            }}
          />
        </div>
      )}

      {/* Image grid */}
      {(images.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {/* Uploaded images */}
            {images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted"
              >
                <Image
                  src={img.display_url}
                  alt={img.alt_text ?? "Machine image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {/* Primary badge */}
                {img.is_primary && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Cover
                  </div>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  {!img.is_primary && (
                    <button
                      onClick={() => setPrimary(img.id)}
                      className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/30 transition-colors w-full justify-center"
                    >
                      <Star className="h-3 w-3" /> Set as cover
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="flex items-center gap-1 rounded-lg bg-destructive/80 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-destructive transition-colors w-full justify-center"
                  >
                    <X className="h-3 w-3" /> Remove
                  </button>
                </div>
                {/* File size */}
                {img.file_size_bytes && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white/80">
                    {formatFileSize(img.file_size_bytes)}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Preview placeholders (uploading) */}
            {previews.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted"
              >
                <Image src={p.preview} alt="Uploading..." fill className="object-cover opacity-40" sizes="25vw" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {p.uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-[10px] text-white font-medium">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-destructive">
                      <AlertCircle className="h-6 w-6" />
                      <span className="text-[10px] font-medium">{p.error}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {total}/{MAX_FILES} photos uploaded
        {images.length > 0 && " · Hover an image to set it as cover or remove it"}
      </p>
    </div>
  );
}
