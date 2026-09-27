import { Staff } from "@/services/api/types/staff";
import { SortEnum } from "@/services/api/types/sort-type";

export type StaffSortType = {
  orderBy: keyof Staff;
  order: SortEnum;
};

export const DEFAULT_STAFF_SORT: StaffSortType = {
  orderBy: "name",
  order: SortEnum.ASC,
};
