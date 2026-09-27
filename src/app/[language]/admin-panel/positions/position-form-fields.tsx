"use client";

import Grid from "@mui/material/Grid";
import FormTextInput from "@/components/form/text-input/form-text-input";
import { useTranslation } from "@/services/i18n/client";
import FormColorSwatchInput from "./color-swatch-input";
import { PositionFormData } from "./position-form-schema";

export default function PositionFormFields({
  namespace,
}: {
  namespace: "admin-panel-positions-create" | "admin-panel-positions-edit";
}) {
  const { t } = useTranslation(namespace);

  return (
    <>
      <Grid size={{ xs: 12 }}>
        <FormTextInput<PositionFormData>
          name="name"
          testId="name"
          autoComplete="off"
          label={t(`${namespace}:inputs.name.label`)}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormColorSwatchInput<PositionFormData>
          name="color"
          testId="color"
          label={t(`${namespace}:inputs.color.label`)}
        />
      </Grid>
    </>
  );
}
