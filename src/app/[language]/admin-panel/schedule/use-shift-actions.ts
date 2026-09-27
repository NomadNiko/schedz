"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "@/hooks/use-snackbar";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { ScheduleWeek, Shift } from "@/services/api/types/schedule";
import {
  useDeleteShiftService,
  usePatchShiftService,
  usePostShiftService,
} from "@/services/api/services/schedule";
import { useTranslation } from "@/services/i18n/client";
import { scheduleQueryKeys } from "./queries/queries";

// Quick shift actions from the week view: move (drag to another day),
// duplicate (as an open shift) and delete. Each saves straight to the
// week's draft; failures are reported and the week is reloaded.
export function useShiftActions(weekStart: string) {
  const { t } = useTranslation("admin-panel-schedule");
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const fetchPostShift = usePostShiftService();
  const fetchPatchShift = usePatchShiftService();
  const fetchDeleteShift = useDeleteShiftService();

  const weekKey = scheduleQueryKeys.week().sub.by(weekStart).key;
  const refreshWeek = useCallback(
    () => queryClient.invalidateQueries({ queryKey: weekKey }),
    // weekKey is rebuilt each render but only changes with weekStart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, weekStart]
  );

  const reportError = useCallback(
    (errors?: Record<string, string>) => {
      const code = errors ? Object.values(errors)[0] : undefined;
      enqueueSnackbar(
        code
          ? t(`admin-panel-schedule:errors.${code}`, {
              defaultValue: t("admin-panel-schedule:errors.generic"),
            })
          : t("admin-panel-schedule:errors.generic"),
        { variant: "error" }
      );
    },
    [enqueueSnackbar, t]
  );

  // Moves the card straight away, then saves. If the save fails the week
  // is reloaded, which puts the card back.
  const moveShift = useCallback(
    async (shift: Shift, date: string) => {
      if (date === shift.date) return;
      queryClient.setQueryData<ScheduleWeek | null>(weekKey, (week) =>
        week
          ? {
              ...week,
              shifts: week.shifts.map((s) =>
                s.id === shift.id ? { ...s, date } : s
              ),
            }
          : week
      );
      const response = await fetchPatchShift({ id: shift.id, data: { date } });
      if (response.status !== HTTP_CODES_ENUM.OK) {
        reportError(
          response.status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY
            ? response.data.errors
            : undefined
        );
      }
      await refreshWeek();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, weekStart, fetchPatchShift, reportError, refreshWeek]
  );

  // An exact copy of the shift, left open (no staff).
  const duplicateShift = useCallback(
    async (shift: Shift): Promise<boolean> => {
      const response = await fetchPostShift({
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        positionId: shift.positionId,
        staffId: null,
        note: shift.note,
      });
      if (response.status !== HTTP_CODES_ENUM.CREATED) {
        reportError(
          response.status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY
            ? response.data.errors
            : undefined
        );
        return false;
      }
      await refreshWeek();
      return true;
    },
    [fetchPostShift, reportError, refreshWeek]
  );

  const deleteShift = useCallback(
    async (shift: Shift): Promise<boolean> => {
      const response = await fetchDeleteShift({ id: shift.id });
      if (response.status !== HTTP_CODES_ENUM.NO_CONTENT) {
        reportError();
        return false;
      }
      await refreshWeek();
      return true;
    },
    [fetchDeleteShift, reportError, refreshWeek]
  );

  return { moveShift, duplicateShift, deleteShift };
}
