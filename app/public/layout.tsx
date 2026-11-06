import Script from "next/script";
import { normalizeAdSensePublisherId } from "@/lib/adsense";

const publisherId = normalizeAdSensePublisherId(
  process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "pub-6147383489510665",
);

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {publisherId && (
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`}
          crossOrigin="anonymous"
        />
      )}
      {children}
    </>
  );
}
