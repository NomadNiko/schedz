"use client";

import { Controller, FieldPath, FieldValues } from "react-hook-form";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import ButtonBase from "@mui/material/ButtonBase";
import CheckIcon from "@mui/icons-material/Check";

// Preset palette: large tap targets that stay readable as chip and shift
// card colours on the schedule.
export const POSITION_COLORS = [
  "#1976d2",
  "#0288d1",
  "#00897b",
  "#2e7d32",
  "#7cb342",
  "#f9a825",
  "#ef6c00",
  "#d32f2f",
  "#c2185b",
  "#7b1fa2",
  "#5d4037",
  "#546e7a",
];

export default function FormColorSwatchInput<
  TFieldValues extends FieldValues = FieldValues,
>(props: { name: FieldPath<TFieldValues>; label: string; testId?: string }) {
  return (
    <Controller
      name={props.name}
      render={({ field, fieldState }) => (
        <FormControl
          fullWidth
          error={!!fieldState.error}
          data-testid={props.testId}
        >
          <FormLabel sx={{ mb: 1 }}>{props.label}</FormLabel>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {POSITION_COLORS.map((color) => {
              const selected =
                String(field.value).toLowerCase() === color.toLowerCase();
              return (
                <ButtonBase
                  key={color}
                  aria-label={color}
                  aria-pressed={selected}
                  onClick={() => field.onChange(color)}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    bgcolor: color,
                    color: "common.white",
                    outline: selected ? "3px solid" : "none",
                    outlineColor: "text.primary",
                    outlineOffset: 2,
                  }}
                >
                  {selected && <CheckIcon />}
                </ButtonBase>
              );
            })}
          </Box>
          {!!fieldState.error && (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}
