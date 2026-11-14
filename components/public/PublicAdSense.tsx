"use client";

import { useEffect, useRef } from "react";
import { normalizeAdSensePublisherId } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function PublicAdSense() {
  const publisherId = normalizeAdSensePublisherId(process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "pub-6147383489510665");
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID?.trim() || "4253906821";
  const adRef = useRef<HTMLModElement>(null);
  const slotConfigured = Boolean(slotId && /^\d+$/.test(slotId));

  useEffect(() => {
    const element = adRef.current;
    if (!publisherId || !slotConfigured || !element || element.dataset.adInitialized === "true") return;
    try {
      (window.adsbygoogle ??= []).push({});
      element.dataset.adInitialized = "true";
    } catch (error) {
      console.warn("No se pudo inicializar el bloque publicitario.", error);
    }
  }, [publisherId, slotConfigured]);

  if (!publisherId) return null;

  if (!slotConfigured || !slotId) return null;

  return (
    <aside className="border-y border-slate-200 bg-slate-50 px-2 py-1" aria-label="Publicidad">
      <div className="mx-auto flex min-h-[38px] max-w-[970px] items-center gap-2 sm:min-h-[48px]">
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-slate-400">Publicidad</span>
        <ins
          ref={adRef}
          className="adsbygoogle block min-w-0 flex-1"
          style={{ display: "block", minHeight: "36px" }}
          data-ad-client={publisherId}
          data-ad-slot={slotId}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
