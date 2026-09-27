"use client";

import { RoleEnum } from "@/services/api/types/role";
import withPageRequiredAuth from "@/services/auth/with-page-required-auth";
import { useTranslation } from "@/services/i18n/client";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import {
  PropsWithChildren,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGetStaffListQuery, staffQueryKeys } from "./queries/queries";
import { TableVirtuoso } from "react-virtuoso";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";
import { styled } from "@mui/material/styles";
import TableComponents from "@/components/table/table-components";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Grow from "@mui/material/Grow";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import { Staff } from "@/services/api/types/staff";
import Link from "@/components/link";
import useConfirmDialog from "@/components/confirm-dialog/use-confirm-dialog";
import { usePatchStaffService } from "@/services/api/services/staff";
import removeDuplicatesFromArrayObjects from "@/services/helpers/remove-duplicates-from-array-of-objects";
import { useQueryClient } from "@tanstack/react-query";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useRouter, useSearchParams } from "next/navigation";
import TableSortLabel from "@mui/material/TableSortLabel";
import { DEFAULT_STAFF_SORT, StaffSortType } from "./staff-sort-types";
import { SortEnum } from "@/services/api/types/sort-type";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { Position } from "@/services/api/types/position";
import { useGetPositionsQuery } from "../positions/queries/queries";

type StaffKeys = keyof Staff;

const TableCellLoadingContainer = styled(TableCell)(() => ({
  padding: 0,
}));

function TableSortCellWrapper(
  props: PropsWithChildren<{
    width?: number;
    orderBy: StaffKeys;
    order: SortEnum;
    column: StaffKeys;
    handleRequestSort: (
      event: React.MouseEvent<unknown>,
      property: StaffKeys
    ) => void;
  }>
) {
  return (
    <TableCell
      style={{ width: props.width }}
      sortDirection={props.orderBy === props.column ? props.order : false}
    >
      <TableSortLabel
        active={props.orderBy === props.column}
        direction={props.orderBy === props.column ? props.order : SortEnum.ASC}
        onClick={(event) => props.handleRequestSort(event, props.column)}
      >
        {props.children}
      </TableSortLabel>
    </TableCell>
  );
}

function Actions({ staff }: { staff: Staff }) {
  const [open, setOpen] = useState(false);
  const { confirmDialog } = useConfirmDialog();
  const fetchPatchStaff = usePatchStaffService();
  const queryClient = useQueryClient();
  const anchorRef = useRef<HTMLDivElement>(null);
  const { t: tStaff } = useTranslation("admin-panel-staff");

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpen(false);
  };

  // Staff are archived rather than deleted, so their past shifts and
  // published schedules keep their name.
  const handleToggleArchived = async () => {
    const action = staff.isActive ? "archive" : "restore";
    const isConfirmed = await confirmDialog({
      title: tStaff(`admin-panel-staff:confirm.${action}.title`),
      message: tStaff(`admin-panel-staff:confirm.${action}.message`),
    });
    if (!isConfirmed) return;

    setOpen(false);
    await fetchPatchStaff({
      id: staff.id,
      data: { isActive: !staff.isActive },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.list().key }),
      queryClient.invalidateQueries({ queryKey: staffQueryKeys.all().key }),
    ]);
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
          href={`/admin-panel/staff/edit/${staff.id}`}
        >
          {tStaff("admin-panel-staff:actions.edit")}
        </Button>

        <Button
          size="small"
          aria-controls={open ? "split-button-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label="more actions"
          aria-haspopup="menu"
          onClick={handleToggle}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{
          zIndex: 1,
        }}
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
                    {staff.isActive
                      ? tStaff("admin-panel-staff:actions.archive")
                      : tStaff("admin-panel-staff:actions.restore")}
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

function StaffList() {
  const { t: tStaff } = useTranslation("admin-panel-staff");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [{ order, orderBy }, setSort] = useState<StaffSortType>(() => {
    const searchParamsSort = searchParams.get("sort");
    if (searchParamsSort) {
      return JSON.parse(searchParamsSort);
    }
    return DEFAULT_STAFF_SORT;
  });

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: StaffKeys
  ) => {
    const isAsc = orderBy === property && order === SortEnum.ASC;
    const searchParams = new URLSearchParams(window.location.search);
    const newOrder = isAsc ? SortEnum.DESC : SortEnum.ASC;
    const newOrderBy = property;
    searchParams.set(
      "sort",
      JSON.stringify({ order: newOrder, orderBy: newOrderBy })
    );
    setSort({
      order: newOrder,
      orderBy: newOrderBy,
    });
    router.push(window.location.pathname + "?" + searchParams.toString());
  };

  const [showArchived, setShowArchived] = useState(false);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useGetStaffListQuery({
      sort: { order, orderBy },
      includeArchived: showArchived,
    });

  const { data: positions = [] } = useGetPositionsQuery({
    includeArchived: true,
  });
  const positionsById = useMemo(
    () => new Map<string, Position>(positions.map((p) => [p.id, p])),
    [positions]
  );

  const handleScroll = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const result = useMemo(() => {
    const result =
      (data?.pages.flatMap((page) => page?.data) as Staff[]) ?? ([] as Staff[]);

    return removeDuplicatesFromArrayObjects(result, "id");
  }, [data]);

  return (
    <Container maxWidth="xl">
      <Grid container spacing={3} pt={3}>
        <Grid container spacing={3} size={{ xs: 12 }}>
          <Grid size="grow">
            <Typography variant="h3">
              {tStaff("admin-panel-staff:title")}
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
                label={tStaff("admin-panel-staff:filter.showArchived")}
              />
            </Grid>
            <Grid size="auto">
              <Button
                variant="contained"
                LinkComponent={Link}
                href="/admin-panel/staff/create"
                color="success"
              >
                {tStaff("admin-panel-staff:actions.create")}
              </Button>
            </Grid>
          </Grid>
        </Grid>

        <Grid size={{ xs: 12 }} mb={2}>
          <TableVirtuoso
            style={{ height: 500 }}
            data={result}
            components={TableComponents}
            endReached={handleScroll}
            overscan={20}
            useWindowScroll
            increaseViewportBy={400}
            fixedHeaderContent={() => (
              <>
                <TableRow>
                  <TableSortCellWrapper
                    width={220}
                    orderBy={orderBy}
                    order={order}
                    column="name"
                    handleRequestSort={handleRequestSort}
                  >
                    {tStaff("admin-panel-staff:table.column1")}
                  </TableSortCellWrapper>
                  <TableSortCellWrapper
                    orderBy={orderBy}
                    order={order}
                    column="email"
                    handleRequestSort={handleRequestSort}
                  >
                    {tStaff("admin-panel-staff:table.column2")}
                  </TableSortCellWrapper>
                  <TableSortCellWrapper
                    width={180}
                    orderBy={orderBy}
                    order={order}
                    column="phone"
                    handleRequestSort={handleRequestSort}
                  >
                    {tStaff("admin-panel-staff:table.column3")}
                  </TableSortCellWrapper>
                  <TableCell>
                    {tStaff("admin-panel-staff:table.column4")}
                  </TableCell>
                  <TableCell style={{ width: 130 }}></TableCell>
                </TableRow>
                {isFetchingNextPage && (
                  <TableRow>
                    <TableCellLoadingContainer colSpan={5}>
                      <LinearProgress />
                    </TableCellLoadingContainer>
                  </TableRow>
                )}
              </>
            )}
            itemContent={(index, staff) => (
              <>
                <TableCell style={{ width: 220 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      opacity: staff?.isActive === false ? 0.6 : 1,
                    }}
                  >
                    {staff?.name}
                    {staff?.isActive === false && (
                      <Chip
                        size="small"
                        label={tStaff("admin-panel-staff:status.archived")}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{staff?.email}</TableCell>
                <TableCell style={{ width: 180 }}>{staff?.phone}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(staff?.positionIds ?? [])
                      .map((id) => positionsById.get(id))
                      .filter((position): position is Position => !!position)
                      .map((position) => (
                        <Chip
                          key={position.id}
                          size="small"
                          label={position.name}
                          sx={{
                            bgcolor: position.color,
                            color: "common.white",
                            opacity: position.isActive ? 1 : 0.5,
                          }}
                        />
                      ))}
                  </Box>
                </TableCell>
                <TableCell style={{ width: 130 }}>
                  {!!staff && <Actions staff={staff} />}
                </TableCell>
              </>
            )}
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default withPageRequiredAuth(StaffList, { roles: [RoleEnum.ADMIN] });
