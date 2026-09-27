"use client";

import Grid from "@mui/material/Grid";
import FormTextInput from "@/components/form/text-input/form-text-input";
import { useTranslation } from "@/services/i18n/client";
import { StaffFormData } from "./staff-form-schema";
import FormPositionChipsInput from "./position-chips-input";

export default function StaffFormFields({
  namespace,
}: {
  namespace: "admin-panel-staff-create" | "admin-panel-staff-edit";
}) {
  const { t } = useTranslation(namespace);

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <FormTextInput<StaffFormData>
          name="name"
          testId="name"
          autoComplete="off"
          label={t(`${namespace}:inputs.name.label`)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormTextInput<StaffFormData>
          name="email"
          type="email"
          testId="email"
          autoComplete="off"
          label={t(`${namespace}:inputs.email.label`)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormTextInput<StaffFormData>
          name="phone"
          type="tel"
          testId="phone"
          autoComplete="off"
          label={t(`${namespace}:inputs.phone.label`)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormPositionChipsInput<StaffFormData>
          name="positionIds"
          label={t(`${namespace}:inputs.positionIds.label`)}
          emptyText={t(`${namespace}:inputs.positionIds.empty`)}
          archivedText={t(`${namespace}:inputs.positionIds.archived`)}
        />
      </Grid>
    </>
  );
}
