export default function TeamCrest({ name, shortName, isNational = false, size = 144 }: { name: string; shortName?: string; isNational?: boolean; size?: number }) {
  const label = (shortName || name).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 4).toLocaleUpperCase("es");
  return <svg role="img" aria-label={`Escudo ilustrativo de ${name}`} viewBox="0 0 128 144" width={size} height={size} className="shrink-0 drop-shadow-sm">
    <path d="M12 12h104v70c0 25-21 42-52 55C33 124 12 107 12 82z" fill="#e2e8f0" />
    <path d="M22 22h84v60c0 19-16 33-42 45-26-12-42-26-42-45z" fill="#475569" />
    <path d="M26 27h76v15H26z" fill={isNational ? "#0f766e" : "#10b981"} />
    <path d="M31 54h66v5H31zm0 13h66v5H31z" fill="#fff" opacity=".88" />
    <circle cx="64" cy="57" r="10" fill="#fff" />
    <path d="m59 51 4 2 5-2 4 4-2 5 2 4-5 3-5-2-5 2-3-5 2-5z" fill="#334155" />
    <text x="64" y="101" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize={label.length > 3 ? "9" : "11"} fontWeight="700" fill="#fff">{label || (isNational ? "SEL" : "V90")}</text>
  </svg>;
}
