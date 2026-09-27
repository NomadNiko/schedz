"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { RoleEnum } from "@/services/api/types/role";
import { useTranslation } from "@/services/i18n/client";
import { Position } from "@/services/api/types/position";
import { Staff } from "@/services/api/types/staff";
import { ScheduleWeekStatus, Shift } from "@/services/api/types/schedule";
import { useGetPositionsQuery } from "../positions/queries/queries";
import { useGetAllStaffQuery } from "../staff/queries/queries";
import { useGetScheduleWeekQuery } from "./queries/queries";
import WeekActions from "./week-actions";
import StartWeekPanel from "./start-week-panel";
import { useDayDrag } from "./use-day-drag";
import { useShiftActions } from "./use-shift-actions";
import PositionPalette from "./position-palette";
import WeekGrid from "./week-grid";
import ShiftCard from "./shift-card";
import ShiftPopover from "./shift-popover";
import ShiftDialog, { ShiftDraft } from "./shift-dialog";
import {
  addDays,
  currentMonday,
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  formatWeekRange,
  isValidMonday,
  today,
} from "./week-utils";

const STATUS_COLORS: Record<
  ScheduleWeekStatus,
  "default" | "success" | "warning"
> = {
  draft: "default",
  published: "success",
  changed: "warning",
};

function Schedule() {
  const { t } = useTranslation("admin-panel-schedule");
  const searchParams = useSearchParams();
  const router = useRouter();

  // The week is kept in the URL (?week=YYYY-MM-DD, a Monday) so it survives
  // a refresh and can be shared.
  const requestedWeek = searchParams.get("week");
  const weekStart = isValidMonday(requestedWeek)
    ? requestedWeek
    : currentMonday();
  const todayDate = useMemo(() => today(), []);

  const goToWeek = (monday: string) => {
    router.replace(`${window.location.pathname}?week=${monday}`);
  };

  const { data: week, isLoading, isError } = useGetScheduleWeekQuery(weekStart);
  const { data: positions = [] } = useGetPositionsQuery({
    includeArchived: true,
  });
  const { data: staff = [] } = useGetAllStaffQuery();

  const activePositions = useMemo(
    () => positions.filter((position) => position.isActive),
    [positions]
  );
  const positionsById = useMemo(
    () => new Map<string, Position>(positions.map((p) => [p.id, p])),
    [positions]
  );
  const staffById = useMemo(
    () => new Map<string, Staff>(staff.map((member) => [member.id, member])),
    [staff]
  );

  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    null
  );
  const [dialog, setDialog] = useState<{
    key: number;
    draft: ShiftDraft;
  } | null>(null);

  const openCreate = useCallback((date: string, positionId: string) => {
    setDialog({
      key: Date.now(),
      draft: {
        date,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        positionId,
        staffId: null,
        note: "",
      },
    });
  }, []);

  const openEdit = (shift: Shift) =>
    setDialog({
      key: Date.now(),
      draft: {
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        positionId: shift.positionId,
        staffId: shift.staffId,
        note: shift.note ?? "",
      },
    });

  // Drag a position chip onto a day to add a shift there.
  const handlePositionDrop = useCallback(
    (position: Position, date: string) => openCreate(date, position.id),
    [openCreate]
  );
  const positionDrag = useDayDrag<Position>(handlePositionDrop, "move");

  // Press and hold a shift, then drag it to another day.
  const { moveShift, duplicateShift, deleteShift } = useShiftActions(weekStart);
  const handleShiftDrop = useCallback(
    (shift: Shift, date: string) => {
      moveShift(shift, date);
    },
    [moveShift]
  );
  const shiftDrag = useDayDrag<Shift>(handleShiftDrop, "hold");

  // The tapped shift's pop-up card. Looked up by id so it always shows the
  // latest saved version.
  const [openShift, setOpenShift] = useState<{
    id: string;
    anchor: HTMLElement;
  } | null>(null);
  const openShiftData = openShift
    ? week?.shifts.find((shift) => shift.id === openShift.id)
    : undefined;

  return (
    // Narrow side padding so the seven day columns get as much of an iPad
    // screen as possible.
    <Container maxWidth="xl" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography variant="h4" sx={{ mr: "auto" }}>
          {t("admin-panel-schedule:title")}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            aria-label={t("admin-panel-schedule:week.previous")}
            onClick={() => goToWeek(addDays(weekStart, -7))}
            size="large"
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 190, textAlign: "center" }}>
            {formatWeekRange(weekStart)}
          </Typography>
          <IconButton
            aria-label={t("admin-panel-schedule:week.next")}
            onClick={() => goToWeek(addDays(weekStart, 7))}
            size="large"
          >
            <ChevronRightIcon />
          </IconButton>
          <Button
            variant="outlined"
            onClick={() => goToWeek(currentMonday())}
            disabled={weekStart === currentMonday()}
            sx={{ minHeight: 44 }}
          >
            {t("admin-panel-schedule:week.thisWeek")}
          </Button>
        </Box>
        {week && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Chip
              color={STATUS_COLORS[week.status]}
              label={t(`admin-panel-schedule:status.${week.status}`)}
            />
            <WeekActions week={week} />
          </Box>
        )}
      </Box>

      {isLoading && <LinearProgress />}
      {isError && (
        <Alert severity="error">{t("admin-panel-schedule:loadError")}</Alert>
      )}

      {week === null && (
        <StartWeekPanel key={weekStart} weekStart={weekStart} />
      )}

      {week && (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <PositionPalette
              positions={activePositions}
              selectedPositionId={selectedPositionId}
              onSelect={setSelectedPositionId}
              handlersFor={positionDrag.handlersFor}
              consumeDragClick={positionDrag.consumeDragClick}
            />
          </Paper>

          <WeekGrid
            weekStart={weekStart}
            today={todayDate}
            shifts={week.shifts}
            positionsById={positionsById}
            staffById={staffById}
            highlightDate={
              positionDrag.drag?.overDate ?? shiftDrag.drag?.overDate ?? null
            }
            isPlacing={!!selectedPositionId}
            onDayClick={(date) =>
              selectedPositionId && openCreate(date, selectedPositionId)
            }
            onAddClick={(date) =>
              openCreate(
                date,
                selectedPositionId ?? activePositions[0]?.id ?? ""
              )
            }
            onShiftOpen={(shift, anchor) =>
              setOpenShift({ id: shift.id, anchor })
            }
            shiftDragHandlersFor={shiftDrag.handlersFor}
            consumeShiftDragClick={shiftDrag.consumeDragClick}
            draggingShiftId={shiftDrag.drag?.item.id ?? null}
          />
        </>
      )}

      {/* The chip that follows the finger or mouse while dragging. */}
      {positionDrag.drag && (
        <Chip
          label={positionDrag.drag.item.name}
          sx={{
            position: "fixed",
            left: positionDrag.drag.x,
            top: positionDrag.drag.y,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: (theme) => theme.zIndex.tooltip,
            height: 44,
            px: 1,
            fontSize: "1rem",
            bgcolor: positionDrag.drag.item.color,
            color: "common.white",
            boxShadow: 6,
          }}
        />
      )}

      {/* The shift card that follows the finger while moving a shift. */}
      {shiftDrag.drag && (
        <Box
          sx={{
            position: "fixed",
            left: shiftDrag.drag.x,
            top: shiftDrag.drag.y,
            width: 160,
            transform: "translate(-50%, -50%) rotate(-2deg)",
            pointerEvents: "none",
            zIndex: (theme) => theme.zIndex.tooltip,
            boxShadow: 8,
            borderRadius: 1,
          }}
        >
          <ShiftCard
            shift={shiftDrag.drag.item}
            position={positionsById.get(shiftDrag.drag.item.positionId)}
            staff={
              shiftDrag.drag.item.staffId
                ? staffById.get(shiftDrag.drag.item.staffId)
                : undefined
            }
            compact
          />
        </Box>
      )}

      {openShift && openShiftData && (
        <ShiftPopover
          key={openShift.id}
          anchorEl={openShift.anchor}
          shift={openShiftData}
          position={positionsById.get(openShiftData.positionId)}
          staff={
            openShiftData.staffId
              ? staffById.get(openShiftData.staffId)
              : undefined
          }
          onClose={() => setOpenShift(null)}
          onEdit={() => {
            setOpenShift(null);
            openEdit(openShiftData);
          }}
          onDuplicate={() => duplicateShift(openShiftData)}
          onDelete={() => deleteShift(openShiftData)}
        />
      )}

      {dialog && week && (
        <ShiftDialog
          key={dialog.key}
          initial={dialog.draft}
          weekStart={weekStart}
          weekShifts={week.shifts}
          positions={positions}
          staff={staff}
          onClose={() => setDialog(null)}
        />
      )}
    </Container>
  );
}

export default withPageRequiredAuth(Schedule, { roles: [RoleEnum.ADMIN] });
