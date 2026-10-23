export default function PlayerAvatar({ name, size = 128 }: { name: string; size?: number }) {
  return (
    <svg
      role="img"
      aria-label={`Ilustración de jugador para ${name}`}
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className="shrink-0 rounded-2xl shadow-sm"
    >
      <defs>
        <linearGradient id="player-silhouette-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#dbe4ed" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="24" fill="url(#player-silhouette-bg)" />
      <circle cx="64" cy="47" r="23" fill="#64748b" />
      <path d="M24 128c2-29 16-45 40-45s38 16 40 45" fill="#475569" />
      <path d="M42 97c6-8 13-12 22-12s16 4 22 12l-8 31H50z" fill="#334155" opacity=".45" />
      <path d="M44 40c2-17 10-26 23-26 12 0 20 9 21 24-8-4-15-10-19-17-6 9-14 15-25 19z" fill="#334155" />
    </svg>
  );
}
