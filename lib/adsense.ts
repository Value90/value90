/** Normaliza los formatos de identificador de editor que muestra AdSense. */
export function normalizeAdSensePublisherId(value: string | undefined): string | null {
  const match = value?.trim().match(/^(?:ca-)?pub-(\d{16})$/);
  return match ? `ca-pub-${match[1]}` : null;
}

export function toAdsTxtPublisherId(value: string | undefined): string | null {
  return normalizeAdSensePublisherId(value)?.replace(/^ca-/, "") ?? null;
}
