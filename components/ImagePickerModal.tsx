"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Image, X, ScanLine, Check } from "lucide-react";
import { useSound } from "@/lib/use-sound";

type ImagePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (file: File) => void;
};

export function ImagePickerModal({ isOpen, onClose, onImageSelect }: ImagePickerModalProps) {
  const { play } = useSound();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreview(null);
      setScanning(false);
      setScanComplete(false);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = () => {
    if (!preview) return;
    setScanning(true);
    setScanComplete(false);

    // Tarama sesini çal (useSound üzerinden — ayarlara duyarlı)
    play("scan");

    // Tarama animasyonu - 2 saniye sürsün
    setTimeout(() => {
      setScanning(false);
      setScanComplete(true);

      // 1 saniye sonra sonucu gönder
      setTimeout(() => {
        if (selectedFile) {
          onImageSelect(selectedFile);
        }
        onClose();
      }, 1000);
    }, 2000);
  };

  const handleOpenCamera = () => {
    // Mobilde kamerayı açar
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.capture = "environment";
      fileInputRef.current.click();
    }
  };

  const handleOpenGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Fotoğraf Ekle</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="relative flex items-center justify-center p-5">
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 w-full object-contain"
              />
              {/* Grid overlay - teknolojik */}
              {scanning && <div className="scan-grid" />}

              {/* Köşe işaretleri */}
              {scanning && (
                <>
                  <div className="scan-corner scan-corner--tl" />
                  <div className="scan-corner scan-corner--tr" />
                  <div className="scan-corner scan-corner--bl" />
                  <div className="scan-corner scan-corner--br" />
                </>
              )}

              {/* Tarama çizgisi animasyonu - neon mavi kalın */}
              {scanning && (
                <div
                  ref={scanLineRef}
                  className="absolute left-0 right-0 h-1.5 animate-scan-line bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_4px_rgba(6,182,212,0.7)]"
                />
              )}
              {/* Tarama tamamlandı overlay */}
              {scanComplete && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40">
                      <Check className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white">Tarama tamamlandı!</span>
                    <span className="text-xs text-blue-300/70">Yapay zeka analizi başarılı</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10">
                <ScanLine className="h-10 w-10 text-purple-400" />
              </div>
              <p className="text-center text-sm text-zinc-400">
                Fotoğraf seçmek için aşağıdaki butonları kullan
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-white/5 px-5 py-4">
          {!preview ? (
            <>
              <button
                onClick={handleOpenCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 text-sm font-medium text-white transition hover:bg-purple-400 active:scale-95"
              >
                <Camera className="h-4 w-4" />
                Kamera
              </button>
              <button
                onClick={handleOpenGallery}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 active:scale-95"
              >
                <Image className="h-4 w-4" />
                Galeri
              </button>
            </>
          ) : (
            <button
              onClick={handleScan}
              disabled={scanning || scanComplete}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 py-3 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Taranıyor...
                </>
              ) : scanComplete ? (
                <>
                  <Check className="h-4 w-4" />
                  Tamamlandı
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4" />
                  Tara
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
