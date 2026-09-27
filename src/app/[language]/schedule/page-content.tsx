"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NotesIcon from "@mui/icons-material/Notes";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { PublicShift } from "@/services/api/types/schedule";
import {
  useGetPublicWeekService,
  useGetPublicWeeksService,
  useVerifySchedulePinService,
} from "@/services/api/services/schedule";
import { useTranslation } from "@/services/i18n/client";
import {
  currentMonday,
  formatLongDay,
  formatTime,
  formatWeekRange,
  isOvernight,
  weekDates,
} from "../admin-panel/schedule/week-utils";

// Remembered on this device so staff enter the PIN once and see their own
// shifts by default. Storage can be unavailable (private browsing), so every
// access is guarded.
const PIN_KEY = "schedule-pin";
const STAFF_KEY = "schedule-my-staff";

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Not remembered on this device; the page still works.
  }
}

function PinScreen({
  message,
  onUnlocked,
}: {
  message: string | null;
  onUnlocked: (pin: string) => void;
}) {
  const { t } = useTranslation("schedule");
  const verifyPin = useVerifySchedulePinService();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(message);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.trim()) return;
    setIsChecking(true);
    const status = await verifyPin({ pin: pin.trim() });
    setIsChecking(false);
    if (status === HTTP_CODES_ENUM.NO_CONTENT) {
      onUnlocked(pin.trim());
    } else if (status === 429) {
      setError(t("schedule:pin.tooManyAttempts"));
    } else {
      setError(t("schedule:pin.wrong"));
      setPin("");
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h5" gutterBottom>
            {t("schedule:title")}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t("schedule:pin.prompt")}
          </Typography>
          <TextField
            fullWidth
            autoFocus
            type="password"
            label={t("schedule:pin.label")}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            inputProps={{ inputMode: "numeric", autoComplete: "off" }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={isChecking}
            sx={{ mt: 2 }}
          >
            {t("schedule:pin.submit")}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}

function ShiftRow({ shift }: { shift: PublicShift }) {
  const { t } = useTranslation("schedule");

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        py: 1,
        pl: 1.5,
        borderLeft: `6px solid ${shift.positionColor}`,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography fontWeight={600}>
          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
          {isOvernight(shift.startTime, shift.endTime) && (
            <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
              {t("schedule:nextDay")}
            </Typography>
          )}
        </Typography>
        <Typography>
          {shift.staffName ?? (
            <Box
              component="span"
              sx={{ color: "warning.main", fontWeight: 600 }}
            >
              {t("schedule:open")}
            </Box>
          )}
          <Box component="span" sx={{ color: shift.positionColor, ml: 1 }}>
            {shift.positionName}
          </Box>
        </Typography>
        {shift.note && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: "text.secondary",
            }}
          >
            <NotesIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">{shift.note}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function ScheduleView({
  pin,
  onPinRejected,
}: {
  pin: string;
  onPinRejected: () => void;
}) {
  const { t } = useTranslation("schedule");
  const fetchWeeks = useGetPublicWeeksService();
  const fetchWeek = useGetPublicWeekService();

  const weeksQuery = useQuery({
    queryKey: ["public-schedule", "weeks", pin],
    queryFn: async ({ signal }) => {
      const response = await fetchWeeks({ pin }, { signal });
      if (response.status === HTTP_CODES_ENUM.OK) return response.data;
      if ((response.status as number) === HTTP_CODES_ENUM.FORBIDDEN) {
        onPinRejected();
        return [];
      }
      throw new Error("Could not load schedule");
    },
  });

  // Oldest first, so "next" moves forward in time.
  const weekStarts = useMemo(
    () => (weeksQuery.data ?? []).map((w) => w.weekStart).sort(),
    [weeksQuery.data]
  );

  const [weekStart, setWeekStart] = useState<string | null>(null);

  // Open on this week if it's published, otherwise the latest published
  // week before it, otherwise the earliest upcoming one.
  useEffect(() => {
    if (weekStart || !weekStarts.length) return;
    const thisWeek = currentMonday();
    const pastOrCurrent = weekStarts.filter((w) => w <= thisWeek);
    setWeekStart(
      pastOrCurrent.length
        ? pastOrCurrent[pastOrCurrent.length - 1]
        : weekStarts[0]
    );
  }, [weekStarts, weekStart]);

  const weekQuery = useQuery({
    queryKey: ["public-schedule", "week", pin, weekStart],
    enabled: !!weekStart,
    queryFn: async ({ signal }) => {
      const response = await fetchWeek(
        { pin, weekStart: weekStart as string },
        { signal }
      );
      if (response.status === HTTP_CODES_ENUM.OK) return response.data;
      if ((response.status as number) === HTTP_CODES_ENUM.FORBIDDEN) {
        onPinRejected();
        return null;
      }
      throw new Error("Could not load week");
    },
  });

  const [myStaffId, setMyStaffId] = useState<string>(
    () => readStored(STAFF_KEY) ?? ""
  );
  const chooseStaff = (staffId: string) => {
    setMyStaffId(staffId);
    writeStored(STAFF_KEY, staffId || null);
  };

  const shifts = useMemo(() => weekQuery.data?.shifts ?? [], [weekQuery.data]);
  const people = useMemo(() => {
    const byId = new Map<string, string>();
    for (const shift of shifts) {
      if (shift.staffId && shift.staffName)
        byId.set(shift.staffId, shift.staffName);
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts]);

  const visibleShifts = myStaffId
    ? shifts.filter((shift) => shift.staffId === myStaffId)
    : shifts;
  const index = weekStart ? weekStarts.indexOf(weekStart) : -1;

  if (weeksQuery.isLoading) return <LinearProgress />;
  if (weeksQuery.isError) {
    return <Alert severity="error">{t("schedule:loadError")}</Alert>;
  }
  if (!weekStarts.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        {t("schedule:nothingPublished")}
      </Typography>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 2,
        }}
      >
        <IconButton
          size="large"
          aria-label={t("schedule:previousWeek")}
          disabled={index <= 0}
          onClick={() => setWeekStart(weekStarts[index - 1])}
        >
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          select
          size="small"
          value={weekStart ?? ""}
          onChange={(event) => setWeekStart(event.target.value)}
          sx={{ flexGrow: 1, maxWidth: 320 }}
          SelectProps={{
            MenuProps: { PaperProps: { sx: { maxHeight: 360 } } },
          }}
        >
          {[...weekStarts].reverse().map((w) => (
            <MenuItem key={w} value={w}>
              {formatWeekRange(w)}
            </MenuItem>
          ))}
        </TextField>
        <IconButton
          size="large"
          aria-label={t("schedule:nextWeek")}
          disabled={index === -1 || index >= weekStarts.length - 1}
          onClick={() => setWeekStart(weekStarts[index + 1])}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      <TextField
        select
        fullWidth
        label={t("schedule:showShiftsFor")}
        value={
          people.some((p) => p.id === myStaffId)
            ? myStaffId
            : myStaffId
              ? "__absent"
              : ""
        }
        onChange={(event) =>
          chooseStaff(
            event.target.value === "__absent" ? myStaffId : event.target.value
          )
        }
        sx={{ mb: 2 }}
      >
        <MenuItem value="">{t("schedule:everyone")}</MenuItem>
        {myStaffId && !people.some((p) => p.id === myStaffId) && (
          <MenuItem value="__absent">{t("schedule:youThisWeek")}</MenuItem>
        )}
        {people.map((person) => (
          <MenuItem key={person.id} value={person.id}>
            {person.name}
          </MenuItem>
        ))}
      </TextField>

      {weekQuery.isLoading && <LinearProgress />}
      {weekQuery.isError && (
        <Alert severity="error">{t("schedule:loadError")}</Alert>
      )}

      {weekQuery.data &&
        weekDates(weekQuery.data.weekStart).map((date) => {
          const dayShifts = visibleShifts
            .filter((shift) => shift.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return (
            <Paper key={date} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
              <Typography variant="h6" sx={{ mb: dayShifts.length ? 1 : 0 }}>
                {formatLongDay(date)}
              </Typography>
              {dayShifts.length === 0 ? (
                <Typography color="text.secondary">
                  {myStaffId ? t("schedule:dayOff") : t("schedule:noShifts")}
                </Typography>
              ) : (
                dayShifts.map((shift, i) => <ShiftRow key={i} shift={shift} />)
              )}
            </Paper>
          );
        })}
    </>
  );
}

// Public schedule for staff: no login, shared by direct link, behind the
// schedule PIN. Shows published weeks only.
export default function PublicSchedule() {
  const { t } = useTranslation("schedule");
  const [pin, setPin] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  useEffect(() => {
    setPin(readStored(PIN_KEY));
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  if (!pin) {
    return (
      <PinScreen
        message={pinMessage}
        onUnlocked={(value) => {
          writeStored(PIN_KEY, value);
          setPinMessage(null);
          setPin(value);
        }}
      />
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {t("schedule:title")}
      </Typography>
      <ScheduleView
        pin={pin}
        onPinRejected={() => {
          // The PIN was changed since this device saved it.
          writeStored(PIN_KEY, null);
          setPinMessage(t("schedule:pin.changed"));
          setPin(null);
        }}
      />
    </Container>
  );
}
