"use client";

import Button from "@mui/material/Button";
import { useForm, FormProvider, useFormState } from "react-hook-form";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { yupResolver } from "@hookform/resolvers/yup";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { useEffect, useState } from "react";
import { useSnackbar } from "@/hooks/use-snackbar";
import Link from "@/components/link";
import useLeavePage from "@/services/leave-page/use-leave-page";
import Box from "@mui/material/Box";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { useTranslation } from "@/services/i18n/client";
import {
  useGetPositionService,
  usePatchPositionService,
} from "@/services/api/services/positions";
import { useParams } from "next/navigation";
import { RoleEnum } from "@/services/api/types/role";
import {
  buildPositionValidationSchema,
  emptyPositionFormData,
  PositionFormData,
  toPositionPayload,
} from "../../position-form-schema";
import PositionFormFields from "../../position-form-fields";
import { useGetAllStaffQuery } from "../../../staff/queries/queries";
import Chip from "@mui/material/Chip";

function EditPositionFormActions() {
  const { t } = useTranslation("admin-panel-positions-edit");
  const { isSubmitting, isDirty } = useFormState();
  useLeavePage(isDirty);

  return (
    <Button
      variant="contained"
      color="primary"
      type="submit"
      disabled={isSubmitting}
    >
      {t("admin-panel-positions-edit:actions.submit")}
    </Button>
  );
}

function FormEditPosition() {
  const params = useParams<{ id: string }>();
  const positionId = params.id;
  const fetchGetPosition = useGetPositionService();
  const fetchPatchPosition = usePatchPositionService();
  const { t } = useTranslation("admin-panel-positions-edit");
  const validationSchema = buildPositionValidationSchema(
    t,
    "admin-panel-positions-edit"
  );
  const { enqueueSnackbar } = useSnackbar();
  const [isArchived, setIsArchived] = useState(false);

  const methods = useForm<PositionFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: emptyPositionFormData,
  });

  const { handleSubmit, setError, reset } = methods;

  const onSubmit = handleSubmit(async (formData) => {
    const { data, status } = await fetchPatchPosition({
      id: positionId,
      data: toPositionPayload(formData),
    });
    if (status === HTTP_CODES_ENUM.UNPROCESSABLE_ENTITY) {
      (Object.keys(data.errors) as Array<keyof PositionFormData>).forEach(
        (key) => {
          setError(key, {
            type: "manual",
            message: t(
              `admin-panel-positions-edit:inputs.${key}.validation.server.${data.errors[key]}`
            ),
          });
        }
      );
      return;
    }
    if (status === HTTP_CODES_ENUM.OK) {
      reset(formData);
      enqueueSnackbar(t("admin-panel-positions-edit:alerts.position.success"), {
        variant: "success",
      });
    }
  });

  useEffect(() => {
    const getInitialDataForEdit = async () => {
      const { status, data: position } = await fetchGetPosition({
        id: positionId,
      });

      if (status === HTTP_CODES_ENUM.OK) {
        setIsArchived(!position.isActive);
        reset({
          name: position.name,
          color: position.color,
        });
      }
    };

    getInitialDataForEdit();
  }, [positionId, reset, fetchGetPosition]);

  return (
    <FormProvider {...methods}>
      <Container maxWidth="xs">
        <form onSubmit={onSubmit} autoComplete="off">
          <Grid container spacing={2} mb={3} mt={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6">
                {t("admin-panel-positions-edit:title")}
              </Typography>
            </Grid>

            {isArchived && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  {t("admin-panel-positions-edit:archivedNotice")}
                </Alert>
              </Grid>
            )}

            <PositionFormFields namespace="admin-panel-positions-edit" />

            <Grid size={{ xs: 12 }}>
              <EditPositionFormActions />
              <Box ml={1} component="span">
                <Button
                  variant="contained"
                  color="inherit"
                  LinkComponent={Link}
                  href="/admin-panel/positions"
                >
                  {t("admin-panel-positions-edit:actions.cancel")}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Container>
    </FormProvider>
  );
}

// Read-only: positions are added to or removed from staff on the staff page.
function StaffWithPosition() {
  const params = useParams<{ id: string }>();
  const { t } = useTranslation("admin-panel-positions-edit");
  const { data: allStaff = [] } = useGetAllStaffQuery();
  const staff = allStaff.filter((member) =>
    (member.positionIds ?? []).includes(params.id)
  );

  return (
    <Container maxWidth="xs">
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6">
            {t("admin-panel-positions-edit:staffWithPosition.title")}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12 }}>
          {staff.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("admin-panel-positions-edit:staffWithPosition.empty")}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {staff.map((member) => (
                <Chip
                  key={member.id}
                  label={member.name}
                  component={Link}
                  href={`/admin-panel/staff/edit/${member.id}`}
                  clickable
                  sx={{ height: 40, fontSize: "0.95rem" }}
                />
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

function EditPosition() {
  return (
    <>
      <FormEditPosition />
      <StaffWithPosition />
    </>
  );
}

export default withPageRequiredAuth(EditPosition, {
  roles: [RoleEnum.ADMIN],
});
