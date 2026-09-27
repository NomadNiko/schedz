"use client";

import Button from "@mui/material/Button";
import { useForm, FormProvider, useFormState } from "react-hook-form";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { yupResolver } from "@hookform/resolvers/yup";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { useEffect } from "react";
import { useSnackbar } from "@/hooks/use-snackbar";
import Link from "@/components/link";
import useLeavePage from "@/services/leave-page/use-leave-page";
import Box from "@mui/material/Box";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useTranslation } from "@/services/i18n/client";
import {
  useGetStaffService,
  usePatchStaffService,
} from "@/services/api/services/staff";
import { useParams } from "next/navigation";
import { RoleEnum } from "@/services/api/types/role";
import {
  buildStaffValidationSchema,
  emptyStaffFormData,
  StaffFormData,
  toStaffPayload,
} from "../../staff-form-schema";
import StaffFormFields from "../../staff-form-fields";

function EditStaffFormActions() {
  const { t } = useTranslation("admin-panel-staff-edit");
  const { isSubmitting, isDirty } = useFormState();
  useLeavePage(isDirty);

  return (
    <Button
      variant="contained"
      color="primary"
      type="submit"
      disabled={isSubmitting}
    >
      {t("admin-panel-staff-edit:actions.submit")}
    </Button>
  );
}

function FormEditStaff() {
  const params = useParams<{ id: string }>();
  const staffId = params.id;
  const fetchGetStaff = useGetStaffService();
  const fetchPatchStaff = usePatchStaffService();
  const { t } = useTranslation("admin-panel-staff-edit");
  const validationSchema = buildStaffValidationSchema(
    t,
    "admin-panel-staff-edit"
  );
  const { enqueueSnackbar } = useSnackbar();

  const methods = useForm<StaffFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: emptyStaffFormData,
  });

  const { handleSubmit, setError, reset } = methods;

  const onSubmit = handleSubmit(async (formData) => {
    const { data, status } = await fetchPatchStaff({
      id: staffId,
      data: toStaffPayload(formData),
    });
    if (status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY) {
      (Object.keys(data.errors) as Array<keyof StaffFormData>).forEach(
        (key) => {
          setError(key, {
            type: "manual",
            message: t(
              `admin-panel-staff-edit:inputs.${key}.validation.server.${data.errors[key]}`
            ),
          });
        }
      );
      return;
    }
    if (status === HTTP_CODES_ENUM.OK) {
      reset(formData);
      enqueueSnackbar(t("admin-panel-staff-edit:alerts.staff.success"), {
        variant: "success",
      });
    }
  });

  useEffect(() => {
    const getInitialDataForEdit = async () => {
      const { status, data: staff } = await fetchGetStaff({ id: staffId });

      if (status === HTTP_CODES_ENUM.OK) {
        reset({
          name: staff?.name ?? "",
          email: staff?.email ?? "",
          phone: staff?.phone ?? "",
          positionIds: staff?.positionIds ?? [],
        });
      }
    };

    getInitialDataForEdit();
  }, [staffId, reset, fetchGetStaff]);

  return (
    <FormProvider {...methods}>
      <Container maxWidth="xs">
        <form onSubmit={onSubmit} autoComplete="off">
          <Grid container spacing={2} mb={3} mt={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6">
                {t("admin-panel-staff-edit:title")}
              </Typography>
            </Grid>

            <StaffFormFields namespace="admin-panel-staff-edit" />

            <Grid size={{ xs: 12 }}>
              <EditStaffFormActions />
              <Box ml={1} component="span">
                <Button
                  variant="contained"
                  color="inherit"
                  LinkComponent={Link}
                  href="/admin-panel/staff"
                >
                  {t("admin-panel-staff-edit:actions.cancel")}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Container>
    </FormProvider>
  );
}

function EditStaff() {
  return <FormEditStaff />;
}

export default withPageRequiredAuth(EditStaff, { roles: [RoleEnum.ADMIN] });
