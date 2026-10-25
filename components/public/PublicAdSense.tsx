"use client";

import Script from "next/script";
import { useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function PublicAdSense() {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;
  const adRef = useRef<HTMLModElement>(null);
  const publisherConfigured = Boolean(publisherId && /^ca-pub-\d+$/.test(publisherId));
  const slotConfigured = Boolean(slotId && /^\d+$/.test(slotId));

  if (!publisherConfigured || !publisherId) return null;

  const initializeAd = () => {
    const element = adRef.current;
    if (!element || element.dataset.adInitialized === "true") return;
    try {
      (window.adsbygoogle ??= []).push({});
      element.dataset.adInitialized = "true";
    } catch (error) {
      console.warn("No se pudo inicializar el bloque publicitario.", error);
    }
  };

  return (
    <>
      {slotConfigured && slotId && (
        <aside className="border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-6" aria-label="Publicidad">
          <div className="mx-auto flex min-h-[58px] max-w-[1440px] flex-col items-center justify-center gap-1 sm:min-h-[100px]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Publicidad</span>
            <ins
              ref={adRef}
              className="adsbygoogle block w-full"
              style={{ display: "block", minHeight: "50px" }}
              data-ad-client={publisherId}
              data-ad-slot={slotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </aside>
      )}
      <Script
        id="google-adsense"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
        crossOrigin="anonymous"
        onReady={slotConfigured ? initializeAd : undefined}
      />
    </>
  );
}
