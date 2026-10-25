import { NextResponse } from "next/server";

export function GET() {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  if (!publisherId || !/^ca-pub-\d+$/.test(publisherId)) {
    return new NextResponse("# Value90: AdSense todavía no está configurado.\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  }

  const publisherNumber = publisherId.slice("ca-pub-".length);
  return new NextResponse(`google.com, pub-${publisherNumber}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
