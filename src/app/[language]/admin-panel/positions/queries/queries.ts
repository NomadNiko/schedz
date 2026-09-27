import { useGetPositionsService } from "@/services/api/services/positions";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { Position } from "@/services/api/types/position";
import { createQueryKeys } from "@/services/react-query/query-key-factory";
import { useQuery } from "@tanstack/react-query";

export const positionsQueryKeys = createQueryKeys(["positions"], {
  list: () => ({
    key: [],
    sub: {
      by: ({ includeArchived }: { includeArchived: boolean }) => ({
        key: [includeArchived],
      }),
    },
  }),
});

// Positions are a short list, fetched in full. Used by the positions admin
// page, the staff form and (later) the schedule builder.
export const useGetPositionsQuery = ({
  includeArchived = false,
}: {
  includeArchived?: boolean;
} = {}) => {
  const fetch = useGetPositionsService();

  return useQuery({
    queryKey: positionsQueryKeys.list().sub.by({ includeArchived }).key,
    queryFn: async ({ signal }): Promise<Position[]> => {
      const { status, data } = await fetch({ includeArchived }, { signal });
      if (status === HTTP_CODES_ENUM.OK) {
        return data;
      }
      return [];
    },
  });
};
