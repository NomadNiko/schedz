import { useGetScheduleWeekService } from "@/services/api/services/schedule";
import HTTP_CODES_ENUM from "@/services/api/types/http-codes";
import { ScheduleWeek } from "@/services/api/types/schedule";
import { createQueryKeys } from "@/services/react-query/query-key-factory";
import { useQuery } from "@tanstack/react-query";

export const scheduleQueryKeys = createQueryKeys(["schedule"], {
  week: () => ({
    key: [],
    sub: {
      by: (weekStart: string) => ({
        key: [weekStart],
      }),
    },
  }),
});

// null means the week exists in the calendar but hasn't been started yet.
export const useGetScheduleWeekQuery = (weekStart: string) => {
  const fetch = useGetScheduleWeekService();

  return useQuery({
    queryKey: scheduleQueryKeys.week().sub.by(weekStart).key,
    queryFn: async ({ signal }): Promise<ScheduleWeek | null> => {
      const response = await fetch({ weekStart }, { signal });
      if (response.status === HTTP_CODES_ENUM.OK) {
        return response.data;
      }
      if ((response.status as number) === HTTP_CODES_ENUM.NOT_FOUND) {
        return null;
      }
      throw new Error(`Could not load week ${weekStart}`);
    },
  });
};
