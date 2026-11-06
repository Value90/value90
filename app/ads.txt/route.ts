import { NextResponse } from "next/server";
import { toAdsTxtPublisherId } from "@/lib/adsense";

export function GET() {
  const publisherId = toAdsTxtPublisherId(process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "pub-6147383489510665");
  if (!publisherId) {
    return new NextResponse("# Value90: AdSense todavía no está configurado.\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  }

  return new NextResponse(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
