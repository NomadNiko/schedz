"use client";

import Button from "@mui/material/Button";
import { useForm, FormProvider, useFormState } from "react-hook-form";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { yupResolver } from "@hookform/resolvers/yup";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { useSnackbar } from "@/hooks/use-snackbar";
import Link from "@/components/link";
import useLeavePage from "@/services/leave-page/use-leave-page";
import Box from "@mui/material/Box";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useTranslation } from "@/services/i18n/client";
import { usePostPositionService } from "@/services/api/services/positions";
import { useRouter } from "next/navigation";
import { RoleEnum } from "@/services/api/types/role";
import {
  buildPositionValidationSchema,
  emptyPositionFormData,
  PositionFormData,
  toPositionPayload,
} from "../position-form-schema";
import PositionFormFields from "../position-form-fields";

function CreatePositionFormActions() {
  const { t } = useTranslation("admin-panel-positions-create");
  const { isSubmitting, isDirty } = useFormState();
  useLeavePage(isDirty);

  return (
    <Button
      variant="contained"
      color="primary"
      type="submit"
      disabled={isSubmitting}
    >
      {t("admin-panel-positions-create:actions.submit")}
    </Button>
  );
}

function FormCreatePosition() {
  const router = useRouter();
  const fetchPostPosition = usePostPositionService();
  const { t } = useTranslation("admin-panel-positions-create");
  const validationSchema = buildPositionValidationSchema(
    t,
    "admin-panel-positions-create"
  );
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm<PositionFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: emptyPositionFormData,
  });

  const { handleSubmit, setError, reset } = methods;

  const onSubmit = handleSubmit(async (formData) => {
    const { data, status } = await fetchPostPosition(
      toPositionPayload(formData)
    );
    if (status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY) {
      (Object.keys(data.errors) as Array<keyof PositionFormData>).forEach(
        (key) => {
          setError(key, {
            type: "manual",
            message: t(
              `admin-panel-positions-create:inputs.${key}.validation.server.${data.errors[key]}`
            ),
          });
        }
      );
      return;
    }
    if (status === HTTP_CODES_ENUM.CREATED) {
      reset(formData);
      enqueueSnackbar(
        t("admin-panel-positions-create:alerts.position.success"),
        { variant: "success" }
      );
      router.push("/admin-panel/positions");
    }
  });

  return (
    <FormProvider {...methods}>
      <Container maxWidth="xs">
        <form onSubmit={onSubmit} autoComplete="off">
          <Grid container spacing={2} mb={3} mt={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6">
                {t("admin-panel-positions-create:title")}
              </Typography>
            </Grid>

            <PositionFormFields namespace="admin-panel-positions-create" />

            <Grid size={{ xs: 12 }}>
              <CreatePositionFormActions />
              <Box ml={1} component="span">
                <Button
                  variant="contained"
                  color="inherit"
                  LinkComponent={Link}
                  href="/admin-panel/positions"
                >
                  {t("admin-panel-positions-create:actions.cancel")}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Container>
    </FormProvider>
  );
}

function CreatePosition() {
  return <FormCreatePosition />;
}

export default withPageRequiredAuth(CreatePosition, {
  roles: [RoleEnum.ADMIN],
});
