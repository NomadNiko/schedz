import {
  useGetAllStaffService,
  useGetStaffListService,
} from "@/services/api/services/staff";
import { Staff } from "@/services/api/types/staff";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { createQueryKeys } from "@/services/react-query/query-key-factory";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { StaffSortType } from "../staff-sort-types";

export const staffQueryKeys = createQueryKeys(["staff"], {
  all: () => ({
    key: [],
  }),
  list: () => ({
    key: [],
    sub: {
      by: ({
        sort,
        includeArchived,
      }: {
        sort?: StaffSortType | undefined;
        includeArchived: boolean;
      }) => ({
        key: [sort, includeArchived],
      }),
    },
  }),
});

export const useGetStaffListQuery = ({
  sort,
  includeArchived = false,
}: {
  sort?: StaffSortType | undefined;
  includeArchived?: boolean;
} = {}) => {
  const fetch = useGetStaffListService();

  const query = useInfiniteQuery({
    queryKey: staffQueryKeys.list().sub.by({ sort, includeArchived }).key,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const { status, data } = await fetch(
        {
          page: pageParam,
          limit: 10,
          sort: sort ? [sort] : undefined,
          includeArchived,
        },
        {
          signal,
        }
      );

      if (status === HTTP_CODES_ENUM.OK) {
        return {
          data: data.data,
          nextPage: data.hasNextPage ? pageParam + 1 : undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.nextPage;
    },
    gcTime: 0,
  });

  return query;
};

// Every staff member in one request, for views that need the whole team
// (positions page, schedule builder).
export const useGetAllStaffQuery = () => {
  const fetch = useGetAllStaffService();

  return useQuery({
    queryKey: staffQueryKeys.all().key,
    queryFn: async ({ signal }): Promise<Staff[]> => {
      const { status, data } = await fetch({ signal });
      if (status === HTTP_CODES_ENUM.OK) {
        return data;
      }
      return [];
    },
  });
};
