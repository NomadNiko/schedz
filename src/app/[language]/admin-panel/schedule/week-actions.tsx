"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useQueryClient } from "@tanstack/react-query";
import useConfirmDialog from "@/components/confirm-dialog/use-confirm-dialog";
import { useSnackbar } from "@/hooks/use-snackbar";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { ScheduleWeek } from "@/services/api/types/schedule";
import {
  useDiscardScheduleWeekService,
  usePublishScheduleWeekService,
} from "@/services/api/services/schedule";
import { useTranslation } from "@/services/i18n/client";
import { scheduleQueryKeys } from "./queries/queries";

// Publish (first time), Republish and Discard changes. The public schedule
// only ever shows what was last published.
export default function WeekActions({ week }: { week: ScheduleWeek }) {
  const { t } = useTranslation("admin-panel-schedule");
  const { confirmDialog } = useConfirmDialog();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const fetchPublish = usePublishScheduleWeekService();
  const fetchDiscard = useDiscardScheduleWeekService();
  const [isBusy, setIsBusy] = useState(false);

  const refreshWeek = () =>
    queryClient.invalidateQueries({
      queryKey: scheduleQueryKeys.week().sub.by(week.weekStart).key,
    });

  const handlePublish = async () => {
    const action = week.status === "draft" ? "publish" : "republish";
    const isConfirmed = await confirmDialog({
      title: t(`admin-panel-schedule:confirm.${action}.title`),
      message:
        week.shifts.length === 0
          ? t("admin-panel-schedule:confirm.publishEmpty.message")
          : t(`admin-panel-schedule:confirm.${action}.message`),
    });
    if (!isConfirmed) return;

    setIsBusy(true);
    const response = await fetchPublish({ weekStart: week.weekStart });
    setIsBusy(false);
    if (response.status === HTTP_CODES_ENUM.OK) {
      await refreshWeek();
      enqueueSnackbar(t("admin-panel-schedule:alerts.published"), {
        variant: "success",
      });
    } else {
      enqueueSnackbar(t("admin-panel-schedule:alerts.actionFailed"), {
        variant: "error",
      });
    }
  };

  const handleDiscard = async () => {
    const isConfirmed = await confirmDialog({
      title: t("admin-panel-schedule:confirm.discard.title"),
      message: t("admin-panel-schedule:confirm.discard.message"),
    });
    if (!isConfirmed) return;

    setIsBusy(true);
    const response = await fetchDiscard({ weekStart: week.weekStart });
    setIsBusy(false);
    if (response.status === HTTP_CODES_ENUM.OK) {
      await refreshWeek();
      enqueueSnackbar(t("admin-panel-schedule:alerts.discarded"), {
        variant: "success",
      });
    } else {
      enqueueSnackbar(t("admin-panel-schedule:alerts.actionFailed"), {
        variant: "error",
      });
    }
  };

  // Published with nothing new: nothing to do.
  if (week.status === "published") return null;

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {week.status === "changed" && (
        <Button
          variant="outlined"
          color="warning"
          size="large"
          onClick={handleDiscard}
          disabled={isBusy}
        >
          {t("admin-panel-schedule:actions.discard")}
        </Button>
      )}
      <Button
        variant="contained"
        color="success"
        size="large"
        onClick={handlePublish}
        disabled={isBusy}
      >
        {week.status === "draft"
          ? t("admin-panel-schedule:actions.publish")
          : t("admin-panel-schedule:actions.republish")}
      </Button>
    </Box>
  );
}
