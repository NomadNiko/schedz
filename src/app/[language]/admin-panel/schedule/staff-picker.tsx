"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { Staff } from "@/services/api/types/staff";
import { useTranslation } from "@/services/i18n/client";

type StaffOption = Staff & { suggested: boolean };

// Searchable staff field. Staff who have the shift's position are listed
// first as suggestions, but anyone active can be picked. Clearing it leaves
// the shift open.
export default function StaffPicker({
  staff,
  positionId,
  value,
  onChange,
}: {
  staff: Staff[];
  positionId: string;
  value: string | null;
  onChange: (staffId: string | null) => void;
}) {
  const { t } = useTranslation("admin-panel-schedule");

  const options = useMemo<StaffOption[]>(
    () =>
      staff
        // Archived staff aren't offered, but one already on this shift is
        // kept so the field can show them.
        .filter((member) => member.isActive || member.id === value)
        .map((member) => ({
          ...member,
          suggested: (member.positionIds ?? []).includes(positionId),
        }))
        .sort(
          (a, b) =>
            Number(b.suggested) - Number(a.suggested) ||
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [staff, positionId, value]
  );

  const selected = options.find((option) => option.id === value) ?? null;

  return (
    <Autocomplete
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option?.id ?? null)}
      groupBy={(option) =>
        option.suggested
          ? t("admin-panel-schedule:dialog.staff.suggested")
          : t("admin-panel-schedule:dialog.staff.all")
      }
      getOptionLabel={(option) =>
        option.isActive
          ? option.name
          : `${option.name} (${t("admin-panel-schedule:dialog.staff.archived")})`
      }
      isOptionEqualToValue={(option, current) => option.id === current.id}
      noOptionsText={t("admin-panel-schedule:dialog.staff.none")}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t("admin-panel-schedule:dialog.staff.label")}
          placeholder={t("admin-panel-schedule:dialog.staff.placeholder")}
        />
      )}
    />
  );
}
