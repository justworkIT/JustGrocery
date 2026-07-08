"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

type Props = {
  onDetected: (barcode: string) => void;
};

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (result && !hasDetectedRef.current) {
            hasDetectedRef.current = true;
            onDetected(result.getText());
          }
        }
      )
      .then((c) => {
        controls = c;
      })
      .catch(() => {
        setError(
          "Couldn't access the camera. Check your browser's camera permission and try again."
        );
      });

    return () => controls?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-ink/5 p-6 text-center text-sm text-ink/70">
        {error}
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-white/70" />
    </div>
  );
}
