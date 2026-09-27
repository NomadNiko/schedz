"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { Position } from "@/services/api/types/position";
import { useTranslation } from "@/services/i18n/client";
import { DayDragHandlers } from "./use-day-drag";

// Active positions as chips. Drag one onto a day, or tap it and then tap a
// day.
export default function PositionPalette({
  positions,
  selectedPositionId,
  onSelect,
  handlersFor,
  consumeDragClick,
}: {
  positions: Position[];
  selectedPositionId: string | null;
  onSelect: (positionId: string | null) => void;
  handlersFor: DayDragHandlers<Position>;
  consumeDragClick: () => boolean;
}) {
  const { t } = useTranslation("admin-panel-schedule");

  if (!positions.length) {
    return (
      <Typography color="text.secondary">
        {t("admin-panel-schedule:palette.empty")}
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {positions.map((position) => {
          const selected = position.id === selectedPositionId;
          return (
            <Chip
              key={position.id}
              label={position.name}
              {...handlersFor(position)}
              onClick={() => {
                if (consumeDragClick()) return;
                onSelect(selected ? null : position.id);
              }}
              sx={{
                height: 44,
                px: 1,
                fontSize: "1rem",
                bgcolor: position.color,
                color: "common.white",
                cursor: "grab",
                userSelect: "none",
                touchAction: "none",
                outline: selected ? "3px solid" : "none",
                outlineColor: "text.primary",
                outlineOffset: 2,
                "&:hover": { bgcolor: position.color, opacity: 0.9 },
              }}
            />
          );
        })}
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1, minHeight: "1.5em" }}
      >
        {selectedPositionId
          ? t("admin-panel-schedule:palette.tapDay")
          : t("admin-panel-schedule:palette.hint")}
      </Typography>
    </Box>
  );
}
