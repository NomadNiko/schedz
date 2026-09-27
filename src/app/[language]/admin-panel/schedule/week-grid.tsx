"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { Shift } from "@/services/api/types/schedule";
import { Position } from "@/services/api/types/position";
import { Staff } from "@/services/api/types/staff";
import { useTranslation } from "@/services/i18n/client";
import ShiftCard from "./shift-card";
import { formatMonthDay, formatWeekday, weekDates } from "./week-utils";
import { DayDragHandlers } from "./use-day-drag";

// Seven day columns, Monday to Sunday. Each column is a drop target
// (data-drop-date) for position chips and for shift cards being moved.
// When a chip has been tapped, tapping a column adds a shift there.
//
// Built for iPads: the whole week fits on screen in landscape and portrait
// (short time labels below the lg breakpoint); only phones scroll sideways.
export default function WeekGrid({
  weekStart,
  today,
  shifts,
  positionsById,
  staffById,
  highlightDate,
  isPlacing,
  onDayClick,
  onAddClick,
  onShiftOpen,
  shiftDragHandlersFor,
  consumeShiftDragClick,
  draggingShiftId,
}: {
  weekStart: string;
  today: string;
  shifts: Shift[];
  positionsById: Map<string, Position>;
  staffById: Map<string, Staff>;
  highlightDate: string | null;
  isPlacing: boolean;
  onDayClick: (date: string) => void;
  onAddClick: (date: string) => void;
  onShiftOpen: (shift: Shift, anchor: HTMLElement) => void;
  shiftDragHandlersFor: DayDragHandlers<Shift>;
  consumeShiftDragClick: () => boolean;
  draggingShiftId: string | null;
}) {
  const { t } = useTranslation("admin-panel-schedule");
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("lg"));

  return (
    <Box sx={{ overflowX: "auto", pb: 1 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 1,
          minWidth: { xs: 7 * 110, sm: 0 },
        }}
      >
        {weekDates(weekStart).map((date) => {
          const dayShifts = shifts
            .filter((shift) => shift.date === date)
            .sort(
              (a, b) =>
                a.startTime.localeCompare(b.startTime) ||
                (positionsById.get(a.positionId)?.name ?? "").localeCompare(
                  positionsById.get(b.positionId)?.name ?? ""
                )
            );
          const highlighted = highlightDate === date;

          return (
            <Paper
              key={date}
              variant="outlined"
              data-drop-date={date}
              onClick={() => isPlacing && onDayClick(date)}
              sx={{
                p: compact ? 0.75 : 1,
                minWidth: 0,
                // Tall enough to be an easy drop target on a tablet.
                minHeight: "max(360px, calc(100vh - 340px))",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                cursor: isPlacing ? "copy" : "default",
                borderWidth: highlighted ? 2 : 1,
                borderColor: highlighted
                  ? "primary.main"
                  : isPlacing
                    ? "primary.light"
                    : "divider",
                bgcolor: highlighted ? "action.selected" : "background.default",
                transition: "background-color 120ms",
              }}
            >
              <Box sx={{ textAlign: "center", pb: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  color={date === today ? "primary" : "text.secondary"}
                >
                  {formatWeekday(date)}
                </Typography>
                <Typography
                  variant="h6"
                  color={date === today ? "primary" : "text.primary"}
                  sx={{ lineHeight: 1.2 }}
                >
                  {formatMonthDay(date)}
                </Typography>
              </Box>

              {dayShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  position={positionsById.get(shift.positionId)}
                  staff={
                    shift.staffId ? staffById.get(shift.staffId) : undefined
                  }
                  compact={compact}
                  onOpen={(anchor) => onShiftOpen(shift, anchor)}
                  dragHandlersFor={shiftDragHandlersFor}
                  consumeDragClick={consumeShiftDragClick}
                  isDragging={shift.id === draggingShiftId}
                />
              ))}

              <Box sx={{ flexGrow: 1 }} />
              <Button
                fullWidth
                startIcon={<AddIcon />}
                sx={{ minHeight: 44 }}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddClick(date);
                }}
              >
                {t("admin-panel-schedule:grid.add")}
              </Button>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
