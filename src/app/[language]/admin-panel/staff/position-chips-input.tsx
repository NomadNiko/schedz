"use client";

import { Controller, FieldPath, FieldValues } from "react-hook-form";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import { Position } from "@/services/api/types/position";
import { useGetPositionsQuery } from "../positions/queries/queries";

// Tap-to-toggle position chips. Active positions are always offered; an
// archived position only appears if this staff member already has it, so it
// can be seen and removed.
export default function FormPositionChipsInput<
  TFieldValues extends FieldValues = FieldValues,
>(props: {
  name: FieldPath<TFieldValues>;
  label: string;
  emptyText: string;
  archivedText: string;
}) {
  const { data: positions = [] } = useGetPositionsQuery({
    includeArchived: true,
  });

  return (
    <Controller
      name={props.name}
      render={({ field, fieldState }) => {
        const selectedIds: string[] = field.value ?? [];
        const visible = positions.filter(
          (position) => position.isActive || selectedIds.includes(position.id)
        );
        const toggle = (position: Position) => {
          field.onChange(
            selectedIds.includes(position.id)
              ? selectedIds.filter((id) => id !== position.id)
              : [...selectedIds, position.id]
          );
        };

        return (
          <FormControl fullWidth error={!!fieldState.error}>
            <FormLabel sx={{ mb: 1 }}>{props.label}</FormLabel>
            {visible.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {props.emptyText}
              </Typography>
            )}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {visible.map((position) => {
                const selected = selectedIds.includes(position.id);
                return (
                  <Chip
                    key={position.id}
                    label={
                      position.isActive
                        ? position.name
                        : `${position.name} (${props.archivedText})`
                    }
                    icon={selected ? <CheckIcon /> : undefined}
                    onClick={() => toggle(position)}
                    variant={selected ? "filled" : "outlined"}
                    sx={{
                      height: 40,
                      fontSize: "0.95rem",
                      borderColor: position.color,
                      ...(selected && {
                        bgcolor: position.color,
                        color: "common.white",
                        "& .MuiChip-icon": { color: "common.white" },
                        "&:hover": { bgcolor: position.color },
                      }),
                    }}
                  />
                );
              })}
            </Box>
            {!!fieldState.error && (
              <FormHelperText>{fieldState.error.message}</FormHelperText>
            )}
          </FormControl>
        );
      }}
    />
  );
}
