"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
import useConfirmDialog from "@/components/confirm-dialog/use-confirm-dialog";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { Shift } from "@/services/api/types/schedule";
import { Position } from "@/services/api/types/position";
import { Staff } from "@/services/api/types/staff";
import {
  useDeleteShiftService,
  usePatchShiftService,
  usePostShiftService,
} from "@/services/api/services/schedule";
import { useTranslation } from "@/services/i18n/client";
import { scheduleQueryKeys } from "./queries/queries";
import { staffQueryKeys } from "../staff/queries/queries";
import StaffPicker from "./staff-picker";
import {
  formatMonthDay,
  formatTime,
  formatWeekday,
  isOvernight,
  shiftsOverlap,
  TIME_OPTIONS,
  weekDates,
} from "./week-utils";

export type ShiftDraft = {
  // Set when editing an existing shift.
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  positionId: string;
  staffId: string | null;
  note: string;
};

const menuProps = { PaperProps: { sx: { maxHeight: 320 } } };

// Create or edit one shift. Saving writes straight to the week's draft.
export default function ShiftDialog({
  initial,
  weekStart,
  weekShifts,
  positions,
  staff,
  onClose,
}: {
  initial: ShiftDraft;
  weekStart: string;
  weekShifts: Shift[];
  positions: Position[];
  staff: Staff[];
  onClose: () => void;
}) {
  const { t } = useTranslation("admin-panel-schedule");
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const { confirmDialog } = useConfirmDialog();
  const fetchPostShift = usePostShiftService();
  const fetchPatchShift = usePatchShiftService();
  const fetchDeleteShift = useDeleteShiftService();

  const [draft, setDraft] = useState<ShiftDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!initial.id;

  const update = (changes: Partial<ShiftDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...changes }));
  };

  // Archived positions aren't offered, except the one already on the shift.
  const positionOptions = positions.filter(
    (position) => position.isActive || position.id === draft.positionId
  );

  const hasOverlap =
    !!draft.staffId &&
    weekShifts.some(
      (shift) =>
        shift.id !== draft.id &&
        shift.staffId === draft.staffId &&
        shiftsOverlap(weekStart, shift, draft)
    );

  // Staff are reloaded too: putting someone on a shift adds that position
  // to their suggestions.
  const refreshWeek = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.week().sub.by(weekStart).key,
      }),
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.all().key }),
    ]);

  const handleSave = async () => {
    if (!draft.positionId) {
      setError(t("admin-panel-schedule:errors.positionRequired"));
      return;
    }
    if (draft.startTime === draft.endTime) {
      setError(t("admin-panel-schedule:errors.sameAsStart"));
      return;
    }

    setIsSaving(true);
    const payload = {
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      positionId: draft.positionId,
      staffId: draft.staffId,
      note: draft.note.trim() === "" ? null : draft.note.trim(),
    };
    const response = draft.id
      ? await fetchPatchShift({ id: draft.id, data: payload })
      : await fetchPostShift(payload);
    setIsSaving(false);

    if (
      response.status === HTTP_CODES_ENUM.OK ||
      response.status === HTTP_CODES_ENUM.CREATED
    ) {
      await refreshWeek();
      onClose();
      return;
    }
    if (response.status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY) {
      const code = Object.values(response.data.errors ?? {})[0];
      setError(
        t(`admin-panel-schedule:errors.${code}`, {
          defaultValue: t("admin-panel-schedule:errors.generic"),
        })
      );
      return;
    }
    setError(t("admin-panel-schedule:errors.generic"));
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    const isConfirmed = await confirmDialog({
      title: t("admin-panel-schedule:confirm.delete.title"),
      message: t("admin-panel-schedule:confirm.delete.message"),
    });
    if (!isConfirmed) return;

    setIsSaving(true);
    await fetchDeleteShift({ id: draft.id });
    setIsSaving(false);
    await refreshWeek();
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      // Sit near the top so the iPad keyboard (when searching staff or
      // typing a note) doesn't cover the form.
      sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
      PaperProps={{ sx: { mt: { sm: 4 } } }}
    >
      <DialogTitle>
        {isEditing
          ? t("admin-panel-schedule:dialog.editTitle")
          : t("admin-panel-schedule:dialog.createTitle")}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            select
            label={t("admin-panel-schedule:dialog.position")}
            value={draft.positionId}
            onChange={(event) => update({ positionId: event.target.value })}
            SelectProps={{ MenuProps: menuProps }}
          >
            {positionOptions.map((position) => (
              <MenuItem key={position.id} value={position.id}>
                <Box
                  component="span"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: position.color,
                    display: "inline-block",
                    mr: 1,
                  }}
                />
                {position.name}
                {!position.isActive &&
                  ` (${t("admin-panel-schedule:dialog.staff.archived")})`}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t("admin-panel-schedule:dialog.day")}
            value={draft.date}
            onChange={(event) => update({ date: event.target.value })}
          >
            {weekDates(weekStart).map((date) => (
              <MenuItem key={date} value={date}>
                {formatWeekday(date)}, {formatMonthDay(date)}
              </MenuItem>
            ))}
          </TextField>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              select
              fullWidth
              label={t("admin-panel-schedule:dialog.start")}
              value={draft.startTime}
              onChange={(event) => update({ startTime: event.target.value })}
              SelectProps={{ MenuProps: menuProps }}
            >
              {TIME_OPTIONS.map((time) => (
                <MenuItem key={time} value={time}>
                  {formatTime(time)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label={t("admin-panel-schedule:dialog.end")}
              value={draft.endTime}
              onChange={(event) => update({ endTime: event.target.value })}
              SelectProps={{ MenuProps: menuProps }}
              helperText={
                isOvernight(draft.startTime, draft.endTime)
                  ? t("admin-panel-schedule:dialog.endsNextDay")
                  : " "
              }
            >
              {TIME_OPTIONS.map((time) => (
                <MenuItem key={time} value={time}>
                  {formatTime(time)}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <StaffPicker
            staff={staff}
            positionId={draft.positionId}
            value={draft.staffId}
            onChange={(staffId) => update({ staffId })}
          />

          {hasOverlap && (
            <Alert severity="warning">
              {t("admin-panel-schedule:dialog.overlapWarning")}
            </Alert>
          )}

          <TextField
            label={t("admin-panel-schedule:dialog.note")}
            value={draft.note}
            onChange={(event) => update({ note: event.target.value })}
            inputProps={{ maxLength: 200 }}
            multiline
            minRows={1}
            maxRows={3}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        {isEditing && (
          <Button
            color="error"
            size="large"
            onClick={handleDelete}
            disabled={isSaving}
            sx={{ mr: "auto" }}
          >
            {t("admin-panel-schedule:dialog.delete")}
          </Button>
        )}
        <Button size="large" onClick={onClose} disabled={isSaving}>
          {t("admin-panel-schedule:dialog.cancel")}
        </Button>
        <Button
          size="large"
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
        >
          {t("admin-panel-schedule:dialog.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
