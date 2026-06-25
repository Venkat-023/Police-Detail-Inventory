export function parseHHMMtoMinutes(hhMM: string): number {
  const [h, m] = hhMM.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToHHMM(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60).toString().padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${minutes < 0 ? "-" : ""}${h}:${m}`;
}

export function calculateHoursWorked(from: string, to: string): number {
  if (!from || !to) return 0;
  let toMins = parseHHMMtoMinutes(to);
  const fromMins = parseHHMMtoMinutes(from);
  if (toMins < fromMins) toMins += 1440;
  return Math.round(((toMins - fromMins) / 60) * 100) / 100;
}

export function isOvernight(from: string, to: string): boolean {
  if (!from || !to) return false;
  return parseHHMMtoMinutes(to) < parseHHMMtoMinutes(from);
}
