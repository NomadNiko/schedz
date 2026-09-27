"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Divider from "@mui/material/Divider";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { PublishedWeekSummary } from "@/services/api/types/schedule";
import {
  useGetPublishedWeeksService,
  usePostScheduleWeekService,
} from "@/services/api/services/schedule";
import { useSnackbar } from "@/hooks/use-snackbar";
import { useTranslation } from "@/services/i18n/client";
import { scheduleQueryKeys } from "./queries/queries";
import { staffQueryKeys } from "../staff/queries/queries";
import { formatWeekRange } from "./week-utils";

const PAGE_SIZE = 4;

// Shown for a week that hasn't been started: clone a previous published
// week (the most recent one is selected by default) or start blank.
export default function StartWeekPanel({ weekStart }: { weekStart: string }) {
  const { t } = useTranslation("admin-panel-schedule");
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const fetchPublishedWeeks = useGetPublishedWeeksService();
  const fetchPostWeek = usePostScheduleWeekService();
  const [selected, setSelected] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Pages of 4, each starting before the last week already shown.
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["schedule", "published-weeks", weekStart],
      initialPageParam: weekStart,
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchPublishedWeeks(
          { before: pageParam, limit: PAGE_SIZE },
          { signal }
        );
        if (response.status === HTTP_CODES_ENUM.OK) return response.data;
        return { data: [], hasNextPage: false };
      },
      getNextPageParam: (lastPage) =>
        lastPage.hasNextPage
          ? lastPage.data[lastPage.data.length - 1]?.weekStart
          : undefined,
      gcTime: 0,
    });

  const weeks = useMemo<PublishedWeekSummary[]>(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  // Default to the most recent published week.
  useEffect(() => {
    if (!selected && weeks.length) setSelected(weeks[0].weekStart);
  }, [weeks, selected]);

  const startWeek = async (cloneFrom?: string) => {
    setIsStarting(true);
    const response = await fetchPostWeek({ weekStart, cloneFrom });
    setIsStarting(false);
    if (
      response.status === HTTP_CODES_ENUM.CREATED ||
      // Already started, e.g. on another device: just load it.
      (response.status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY &&
        response.data.errors?.weekStart === "weekAlreadyExists")
    ) {
      // Staff too: a cloned week can add positions to people's suggestions.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: scheduleQueryKeys.week().sub.by(weekStart).key,
        }),
        queryClient.invalidateQueries({ queryKey: staffQueryKeys.all().key }),
      ]);
      return;
    }
    enqueueSnackbar(t("admin-panel-schedule:alerts.actionFailed"), {
      variant: "error",
    });
  };

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 2, sm: 4 }, maxWidth: 640, mx: "auto" }}
    >
      <Typography variant="h6" gutterBottom>
        {t("admin-panel-schedule:notStarted.title")}
      </Typography>

      {isLoading && <LinearProgress sx={{ my: 2 }} />}

      {!isLoading && weeks.length > 0 && (
        <>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {t("admin-panel-schedule:notStarted.cloneMessage")}
          </Typography>
          <RadioGroup
            value={selected ?? ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            {weeks.map((week) => (
              <FormControlLabel
                key={week.weekStart}
                value={week.weekStart}
                control={<Radio />}
                sx={{ minHeight: 48 }}
                label={
                  <Box>
                    <Typography>{formatWeekRange(week.weekStart)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("admin-panel-schedule:notStarted.shiftCount", {
                        count: week.shiftCount,
                      })}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
          {hasNextPage && (
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              sx={{ mt: 1, minHeight: 44 }}
            >
              {t("admin-panel-schedule:notStarted.loadMore")}
            </Button>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => selected && startWeek(selected)}
              disabled={!selected || isStarting}
            >
              {t("admin-panel-schedule:notStarted.clone")}
            </Button>
          </Box>
          <Divider sx={{ my: 3 }}>
            {t("admin-panel-schedule:notStarted.or")}
          </Divider>
        </>
      )}

      {!isLoading && weeks.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {t("admin-panel-schedule:notStarted.noPublished")}
        </Typography>
      )}

      <Button
        variant={weeks.length ? "outlined" : "contained"}
        size="large"
        onClick={() => startWeek()}
        disabled={isStarting}
      >
        {t("admin-panel-schedule:notStarted.startBlank")}
      </Button>
    </Paper>
  );
}
