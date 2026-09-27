import { Shift } from "@/services/api/types/schedule";

// Calendar-date helpers. Dates are "YYYY-MM-DD" strings and are only ever
// turned into local-midnight Date objects for arithmetic and labels, so a
// date never shifts by a day whatever the device's time zone.

export const DEFAULT_START_TIME = "10:00";
export const DEFAULT_END_TIME = "16:00";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const result = toDate(date);
  result.setDate(result.getDate() + days);
  return toDateString(result);
}

// Weeks run Monday to Sunday and are identified by their Monday.
export function mondayOf(date: string): string {
  const dayOfWeek = toDate(date).getDay(); // 0 = Sunday
  return addDays(date, -((dayOfWeek + 6) % 7));
}

export function currentMonday(): string {
  return mondayOf(toDateString(new Date()));
}

// Today's date on this device.
export function today(): string {
  return toDateString(new Date());
}

export function isValidMonday(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  return toDateString(toDate(value)) === value && mondayOf(value) === value;
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatWeekday(date: string): string {
  return toDate(date).toLocaleDateString("en-US", { weekday: "short" });
}

export function formatMonthDay(date: string): string {
  return toDate(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// "Monday, Oct 5"
export function formatLongDay(date: string): string {
  return toDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatWeekRange(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const year = toDate(end).getFullYear();
  return `${formatMonthDay(weekStart)} – ${formatMonthDay(end)}, ${year}`;
}

// Every 15 minutes, as "HH:mm".
export const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, index) => {
  const hours = String(Math.floor(index / 4)).padStart(2, "0");
  const minutes = String((index % 4) * 15).padStart(2, "0");
  return `${hours}:${minutes}`;
});

// "16:00" -> "4:00 PM"
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// Short form for narrow day columns (iPad portrait): "10:00" -> "10a",
// "16:30" -> "4:30p".
export function formatTimeCompact(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "a" : "p";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minutes).padStart(2, "0")}${suffix}`;
}

export function isOvernight(startTime: string, endTime: string): boolean {
  return endTime < startTime;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// A shift as a [start, end) range of minutes from the start of its week,
// so shifts on different days (including overnight ones) can be compared.
function shiftRange(
  weekStart: string,
  shift: Pick<Shift, "date" | "startTime" | "endTime">
): [number, number] {
  const dayIndex = weekDates(weekStart).indexOf(shift.date);
  const start = dayIndex * 1440 + toMinutes(shift.startTime);
  let end = dayIndex * 1440 + toMinutes(shift.endTime);
  if (end <= start) end += 1440;
  return [start, end];
}

export function shiftsOverlap(
  weekStart: string,
  a: Pick<Shift, "date" | "startTime" | "endTime">,
  b: Pick<Shift, "date" | "startTime" | "endTime">
): boolean {
  const [aStart, aEnd] = shiftRange(weekStart, a);
  const [bStart, bEnd] = shiftRange(weekStart, b);
  return aStart < bEnd && bStart < aEnd;
}
