"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, X, ScanLine, Check } from "lucide-react";
import { useSound } from "@/lib/use-sound";
import { useLang } from "@/lib/lang-context";

type ImagePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (file: File) => void;
};

export function ImagePickerModal({ isOpen, onClose, onImageSelect }: ImagePickerModalProps) {
  const { t } = useLang();
  const { play } = useSound();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const scanTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreview(null);
      setScanning(false);
      setScanComplete(false);
      scanTimeoutsRef.current.forEach(clearTimeout);
      scanTimeoutsRef.current = [];
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      scanTimeoutsRef.current.forEach(clearTimeout);
      scanTimeoutsRef.current = [];
    };
  }, []);

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
    play("scan");

    scanTimeoutsRef.current.forEach(clearTimeout);
    scanTimeoutsRef.current = [];

    const t1 = setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
      const t2 = setTimeout(() => {
        if (selectedFile) {
          onImageSelect(selectedFile);
        }
        onClose();
      }, 1000);
      scanTimeoutsRef.current.push(t2);
    }, 2000);
    scanTimeoutsRef.current.push(t1);
  };

  const handleOpenCamera = () => {
    // Uses OS camera picker via <input capture> — does not need getUserMedia.
    // Permissions-Policy camera=() remains deny (see docs/operations/store-readiness.md).
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
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{t("chat.photo")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="touch-44 flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="relative flex items-center justify-center p-5">
          {preview ? (
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob/data URL preview */}
              <img
                src={preview}
                alt={t("chat.preview_alt")}
                className="max-h-64 w-full object-contain"
              />
              {scanning && <div className="scan-grid" />}
              {scanning && (
                <>
                  <div className="scan-corner scan-corner--tl" />
                  <div className="scan-corner scan-corner--tr" />
                  <div className="scan-corner scan-corner--bl" />
                  <div className="scan-corner scan-corner--br" />
                </>
              )}
              {scanning && (
                <div
                  ref={scanLineRef}
                  className="absolute left-0 right-0 h-1.5 animate-scan-line bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_4px_rgba(6,182,212,0.7)]"
                />
              )}
              {scanComplete && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40">
                      <Check className="h-7 w-7 text-white" aria-hidden />
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {t("chat.scan_complete_title")}
                    </span>
                    <span className="text-xs text-blue-300/70">
                      {t("chat.scan_complete_subtitle")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10">
                <ScanLine className="h-10 w-10 text-purple-400" aria-hidden />
              </div>
              <p className="text-center text-sm text-zinc-400">
                {t("chat.picker_hint")}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/5 px-5 py-4">
          {!preview ? (
            <>
              <button
                type="button"
                onClick={handleOpenCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 text-sm font-medium text-white transition hover:bg-purple-400 active:scale-95"
              >
                <Camera className="h-4 w-4" aria-hidden />
                {t("chat.camera")}
              </button>
              <button
                type="button"
                onClick={handleOpenGallery}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 active:scale-95"
              >
                <ImageIcon className="h-4 w-4" aria-hidden />
                {t("chat.gallery")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning || scanComplete}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 py-3 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t("chat.scanning")}
                </>
              ) : scanComplete ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  {t("chat.scan_done")}
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4" aria-hidden />
                  {t("chat.scan")}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
