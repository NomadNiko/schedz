"use client";

import ButtonBase from "@mui/material/ButtonBase";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import NotesIcon from "@mui/icons-material/Notes";
import { Shift } from "@/services/api/types/schedule";
import { Position } from "@/services/api/types/position";
import { Staff } from "@/services/api/types/staff";
import { useTranslation } from "@/services/i18n/client";
import { formatTime, formatTimeCompact, isOvernight } from "./week-utils";
import { DayDragHandlers } from "./use-day-drag";

// A shift in a day column. Tap to open its details; press and hold, then
// move, to drag it to another day. Also used (without handlers) as the copy
// that follows the finger while dragging.
export default function ShiftCard({
  shift,
  position,
  staff,
  compact,
  onOpen,
  dragHandlersFor,
  consumeDragClick,
  isDragging = false,
}: {
  shift: Shift;
  position: Position | undefined;
  staff: Staff | undefined;
  // Narrow columns (iPad portrait, smaller landscape): short time labels.
  compact: boolean;
  onOpen?: (anchor: HTMLElement) => void;
  dragHandlersFor?: DayDragHandlers<Shift>;
  consumeDragClick?: () => boolean;
  isDragging?: boolean;
}) {
  const { t } = useTranslation("admin-panel-schedule");
  const color = position?.color ?? "#546e7a";
  const overnight = isOvernight(shift.startTime, shift.endTime);

  return (
    <ButtonBase
      {...dragHandlersFor?.(shift)}
      onClick={(event) => {
        event.stopPropagation();
        if (consumeDragClick?.()) return;
        onOpen?.(event.currentTarget);
      }}
      sx={{
        width: "100%",
        display: "block",
        textAlign: "left",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        borderLeft: `6px solid ${color}`,
        bgcolor: "background.paper",
        px: compact ? 0.75 : 1,
        py: 1,
        minHeight: 56,
        opacity: isDragging ? 0.35 : 1,
        // No text selection or iPad copy menu on a long press.
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Typography variant="body2" fontWeight={600} noWrap>
        {compact
          ? `${formatTimeCompact(shift.startTime)}–${formatTimeCompact(shift.endTime)}`
          : `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`}
        {overnight && (
          <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
            {compact
              ? t("admin-panel-schedule:shift.nextDayShort")
              : t("admin-panel-schedule:shift.nextDay")}
          </Typography>
        )}
      </Typography>
      {staff ? (
        <Typography variant="body2" noWrap>
          {staff.name}
        </Typography>
      ) : (
        <Typography
          variant="body2"
          noWrap
          sx={{ color: "warning.main", fontWeight: 600 }}
        >
          {t("admin-panel-schedule:shift.open")}
        </Typography>
      )}
      <Typography variant="caption" noWrap component="div" sx={{ color }}>
        {position?.name ?? t("admin-panel-schedule:shift.unknownPosition")}
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
          <NotesIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" noWrap>
            {shift.note}
          </Typography>
        </Box>
      )}
    </ButtonBase>
  );
}
