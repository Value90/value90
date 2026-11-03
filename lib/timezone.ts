const MADRID_TIME_ZONE = "Europe/Madrid";

export function madridWallTimeToUtc(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) throw new Error("Fecha local no válida.");
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const wallClock = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  let instant = wallClock;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const offset = representedAsUtc - Math.floor(instant / 1000) * 1000;
    const next = wallClock - offset;
    if (next === instant) break;
    instant = next;
  }

  return new Date(instant).toISOString();
}

export function madridDateTimeInput(value: string | null | undefined) {
  if (!value) return { date: "", time: "" };
  if (!value.includes("T")) return { date: value.slice(0, 10), time: "" };

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: value.slice(0, 10), time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(parsed);
  const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${fields.year}-${fields.month}-${fields.day}`, time: `${fields.hour}:${fields.minute}` };
}

export function madridDateTimeToUtc(date: string, time: string) {
  return madridWallTimeToUtc(`${date}T${time || "00:00"}:00`);
}
