'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onFileChange: (file: File | null) => void;
  initialImageUrl?: string | null;
}

export default function ImageUploader({ onFileChange, initialImageUrl }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageUrl) {
        setPreview(initialImageUrl);
    }
  }, [initialImageUrl])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        onFileChange(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleResetToInitial = () => {
    setPreview(initialImageUrl || null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        capture="environment" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {preview ? (
        <div className="relative group rounded-lg overflow-hidden border border-muted shadow-sm">
          <Image
            src={preview}
            alt="Product preview"
            width={550}
            height={310}
            className="object-cover aspect-video w-full"
            data-ai-hint="product photo"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
             <Button
                variant="secondary"
                size="sm"
                onClick={triggerFileSelect}
                aria-label="Change image"
              >
                เปลี่ยนรูปภาพ
              </Button>
             <Button
                variant="destructive"
                size="sm"
                onClick={initialImageUrl && preview === initialImageUrl ? handleRemoveImage : handleResetToInitial}
                aria-label="Remove image"
              >
                <X className="h-4 w-4 mr-1" />
                {initialImageUrl && preview === initialImageUrl ? "ลบ" : "ยกเลิก"}
              </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFileSelect}
          className="w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors duration-300"
        >
          <Camera className="h-10 w-10 mb-2" />
          <span className="font-semibold">ถ่าย/เลือกรูปภาพสินค้า</span>
          <span className="text-xs mt-1">
            ภาพตัวอย่างจะแสดงที่นี่
          </span>
        </button>
      )}
    </div>
  );
}
