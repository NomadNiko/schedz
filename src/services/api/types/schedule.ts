// Dates are calendar dates ("2026-10-05") and times are wall-clock times
// ("16:00"), exactly as the API stores them. An end time earlier than the
// start time means the shift ends the next day.
export type Shift = {
  id: string;
  weekStart: string;
  date: string;
  startTime: string;
  endTime: string;
  positionId: string;
  // null means an open shift that nobody is assigned to yet.
  staffId: string | null;
  note: string | null;
};

export type ScheduleWeekStatus = "draft" | "published" | "changed";

export type ScheduleWeek = {
  weekStart: string;
  status: ScheduleWeekStatus;
  publishedAt: string | null;
  shifts: Shift[];
};

// A published week offered in the clone picker.
export type PublishedWeekSummary = {
  weekStart: string;
  publishedAt: string;
  shiftCount: number;
};

// What the public schedule page shows: the published copy only, with
// names and colours as they were when published.
export type PublicShift = {
  date: string;
  startTime: string;
  endTime: string;
  positionName: string;
  positionColor: string;
  staffId: string | null;
  staffName: string | null;
  note: string | null;
};

export type PublicScheduleWeek = {
  weekStart: string;
  publishedAt: string;
  shifts: PublicShift[];
};
