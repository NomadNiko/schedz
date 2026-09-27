"use client";

import { RoleEnum } from "@/services/api/types/role";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { useTranslation } from "@/services/i18n/client";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useMemo, useRef, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Grow from "@mui/material/Grow";
import Popper from "@mui/material/Popper";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Link from "@/components/link";
import useConfirmDialog from "@/components/confirm-dialog/use-confirm-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Position } from "@/services/api/types/position";
import { usePatchPositionService } from "@/services/api/services/positions";
import { positionsQueryKeys, useGetPositionsQuery } from "./queries/queries";
import { useGetAllStaffQuery } from "../staff/queries/queries";
import { Staff } from "@/services/api/types/staff";

function Actions({ position }: { position: Position }) {
  const [open, setOpen] = useState(false);
  const { confirmDialog } = useConfirmDialog();
  const fetchPatchPosition = usePatchPositionService();
  const queryClient = useQueryClient();
  const anchorRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("admin-panel-positions");

  const handleClose = (event: Event) => {
    if (anchorRef.current?.contains(event.target as HTMLElement)) return;
    setOpen(false);
  };

  const handleToggleArchived = async () => {
    const action = position.isActive ? "archive" : "restore";
    const isConfirmed = await confirmDialog({
      title: t(`admin-panel-positions:confirm.${action}.title`),
      message: t(`admin-panel-positions:confirm.${action}.message`),
    });
    if (!isConfirmed) return;

    setOpen(false);
    await fetchPatchPosition({
      id: position.id,
      data: { isActive: !position.isActive },
    });
    await queryClient.invalidateQueries({
      queryKey: positionsQueryKeys.list().key,
    });
  };

  return (
    <>
      <ButtonGroup
        variant="contained"
        ref={anchorRef}
        aria-label="split button"
        size="small"
      >
        <Button
          size="small"
          variant="contained"
          LinkComponent={Link}
          href={`/admin-panel/positions/edit/${position.id}`}
        >
          {t("admin-panel-positions:actions.edit")}
        </Button>
        <Button
          size="small"
          aria-controls={open ? "split-button-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="more actions"
          aria-haspopup="menu"
          onClick={() => setOpen((prev) => !prev)}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{ zIndex: 1 }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  <MenuItem onClick={handleToggleArchived}>
                    {position.isActive
                      ? t("admin-panel-positions:actions.archive")
                      : t("admin-panel-positions:actions.restore")}
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}

function StaffNames({
  staff,
  emptyText,
}: {
  staff: Staff[];
  emptyText: string;
}) {
  if (!staff.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {staff.map((member) => (
        <Chip
          key={member.id}
          size="small"
          variant="outlined"
          label={member.name}
          component={Link}
          href={`/admin-panel/staff/edit/${member.id}`}
          clickable
        />
      ))}
    </Box>
  );
}

function PositionsList() {
  const { t } = useTranslation("admin-panel-positions");
  const [showArchived, setShowArchived] = useState(false);
  const { data: positions = [], isLoading } = useGetPositionsQuery({
    includeArchived: showArchived,
  });
  const { data: allStaff = [] } = useGetAllStaffQuery();
  const staffByPositionId = useMemo(() => {
    const map = new Map<string, Staff[]>();
    for (const staff of allStaff) {
      for (const positionId of staff.positionIds ?? []) {
        map.set(positionId, [...(map.get(positionId) ?? []), staff]);
      }
    }
    return map;
  }, [allStaff]);

  return (
    <Container maxWidth="xl">
      <Grid container spacing={3} pt={3}>
        <Grid container spacing={3} size={{ xs: 12 }} alignItems="center">
          <Grid size="grow">
            <Typography variant="h3">
              {t("admin-panel-positions:title")}
            </Typography>
          </Grid>
          <Grid container size="auto" wrap="nowrap" spacing={2}>
            <Grid size="auto">
              <FormControlLabel
                control={
                  <Switch
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                  />
                }
                label={t("admin-panel-positions:filter.showArchived")}
              />
            </Grid>
            <Grid size="auto">
              <Button
                variant="contained"
                LinkComponent={Link}
                href="/admin-panel/positions/create"
                color="success"
              >
                {t("admin-panel-positions:actions.create")}
              </Button>
            </Grid>
          </Grid>
        </Grid>

        <Grid size={{ xs: 12 }} mb={2}>
          <TableContainer component={Paper}>
            {isLoading && <LinearProgress />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t("admin-panel-positions:table.name")}</TableCell>
                  <TableCell>
                    {t("admin-panel-positions:table.staff")}
                  </TableCell>
                  <TableCell style={{ width: 130 }}>
                    {t("admin-panel-positions:table.status")}
                  </TableCell>
                  <TableCell style={{ width: 130 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!isLoading && positions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      {t("admin-panel-positions:table.empty")}
                    </TableCell>
                  </TableRow>
                )}
                {positions.map((position) => (
                  <TableRow
                    key={position.id}
                    sx={{ opacity: position.isActive ? 1 : 0.6 }}
                  >
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            bgcolor: position.color,
                            flexShrink: 0,
                          }}
                        />
                        {position.name}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StaffNames
                        staff={staffByPositionId.get(position.id) ?? []}
                        emptyText={t("admin-panel-positions:table.noStaff")}
                      />
                    </TableCell>
                    <TableCell>
                      {position.isActive ? (
                        <Chip
                          size="small"
                          color="success"
                          label={t("admin-panel-positions:status.active")}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label={t("admin-panel-positions:status.archived")}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Actions position={position} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
}

export default withPageRequiredAuth(PositionsList, {
  roles: [RoleEnum.ADMIN],
});
