"use client";

import { useState } from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NotesIcon from "@mui/icons-material/Notes";
import { Shift } from "@/services/api/types/schedule";
import { Position } from "@/services/api/types/position";
import { Staff } from "@/services/api/types/staff";
import { useTranslation } from "@/services/i18n/client";
import { formatLongDay, formatTime, isOvernight } from "./week-utils";

// Small, equal-sized icon buttons with a rounded border that visibly press
// in when tapped.
const actionButtonSx = {
  width: 40,
  height: 40,
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  transition: "transform 100ms, background-color 100ms",
  "&:active": { transform: "scale(0.9)", bgcolor: "action.selected" },
} as const;

// The larger card that pops up over a shift when it's tapped: full details
// on the left; Edit, Duplicate (as an open shift) and Delete (with a small
// confirmation) as icon buttons down the right side.
export default function ShiftPopover({
  anchorEl,
  shift,
  position,
  staff,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  anchorEl: HTMLElement;
  shift: Shift;
  position: Position | undefined;
  staff: Staff | undefined;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const { t } = useTranslation("admin-panel-schedule");
  const [isBusy, setIsBusy] = useState(false);
  // Duplicate and Delete each ask first, in a small pop-up next to the button.
  const [confirm, setConfirm] = useState<{
    action: "duplicate" | "delete";
    anchor: HTMLElement;
  } | null>(null);
  const color = position?.color ?? "#546e7a";

  const run = async (action: () => Promise<boolean>) => {
    setIsBusy(true);
    const succeeded = await action();
    setIsBusy(false);
    if (succeeded) onClose();
  };

  return (
    <Popover
      open
      anchorEl={anchorEl}
      onClose={onClose}
      // Grows out of the tapped card.
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{
        paper: {
          sx: {
            width: 260,
            maxWidth: "calc(100vw - 32px)",
            borderTop: `8px solid ${color}`,
            display: "flex",
          },
        },
      }}
    >
      <Box sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ color, fontWeight: 700 }}>
          {position?.name ?? t("admin-panel-schedule:shift.unknownPosition")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {formatLongDay(shift.date)}
        </Typography>

        <Typography variant="h6" sx={{ mt: 1 }}>
          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
        </Typography>
        {isOvernight(shift.startTime, shift.endTime) && (
          <Typography variant="body2" color="text.secondary">
            {t("admin-panel-schedule:dialog.endsNextDay")}
          </Typography>
        )}

        <Typography
          variant="subtitle1"
          sx={{
            mt: 1,
            fontWeight: 600,
            ...(!staff && { color: "warning.main" }),
          }}
        >
          {staff?.name ?? t("admin-panel-schedule:shift.open")}
          {staff &&
            !staff.isActive &&
            ` (${t("admin-panel-schedule:dialog.staff.archived")})`}
        </Typography>

        {shift.note && (
          <Box
            sx={{
              display: "flex",
              gap: 0.75,
              mt: 1,
              color: "text.secondary",
            }}
          >
            <NotesIcon sx={{ fontSize: 18, mt: 0.25 }} />
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {shift.note}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: 1,
          borderLeft: 1,
          borderColor: "divider",
        }}
      >
        <IconButton
          color="primary"
          aria-label={t("admin-panel-schedule:popover.edit")}
          onClick={onEdit}
          disabled={isBusy}
          sx={actionButtonSx}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          aria-label={t("admin-panel-schedule:popover.duplicate")}
          onClick={(event) =>
            setConfirm({ action: "duplicate", anchor: event.currentTarget })
          }
          disabled={isBusy}
          sx={actionButtonSx}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
        <IconButton
          color="error"
          aria-label={t("admin-panel-schedule:popover.delete")}
          onClick={(event) =>
            setConfirm({ action: "delete", anchor: event.currentTarget })
          }
          disabled={isBusy}
          sx={actionButtonSx}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      <Popover
        open={!!confirm}
        anchorEl={confirm?.anchor}
        onClose={() => setConfirm(null)}
        // Opens to the left of the button so it stays on screen.
        anchorOrigin={{ vertical: "center", horizontal: "left" }}
        transformOrigin={{ vertical: "center", horizontal: "right" }}
      >
        {confirm && (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t(`admin-panel-schedule:popover.${confirm.action}Confirm`)}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button
                size="small"
                onClick={() => setConfirm(null)}
                disabled={isBusy}
                sx={{ minHeight: 40 }}
              >
                {t("admin-panel-schedule:popover.cancel")}
              </Button>
              <Button
                size="small"
                variant="contained"
                color={confirm.action === "delete" ? "error" : "primary"}
                onClick={() => {
                  const action =
                    confirm.action === "delete" ? onDelete : onDuplicate;
                  setConfirm(null);
                  run(action);
                }}
                disabled={isBusy}
                sx={{ minHeight: 40 }}
              >
                {t(`admin-panel-schedule:popover.${confirm.action}`)}
              </Button>
            </Box>
          </Box>
        )}
      </Popover>
    </Popover>
  );
}
