import { useCallback } from "react";
import useFetch from "../use-fetch";
import { API_URL } from "../config";
import wrapperFetchJsonResponse from "../wrapper-fetch-json-response";
import {
  PublicScheduleWeek,
  PublishedWeekSummary,
  ScheduleWeek,
  Shift,
} from "../types/schedule";
import { RequestConfigType } from "./types/request-config";

// Returns 404 when the week hasn't been started yet.
export function useGetScheduleWeekService() {
  const fetch = useFetch();

  return useCallback(
    (data: { weekStart: string }, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/weeks/${data.weekStart}`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<ScheduleWeek>);
    },
    [fetch]
  );
}

export type ScheduleWeekPostRequest = {
  weekStart: string;
  // Monday of a published week to copy; omit to start blank.
  cloneFrom?: string;
};

export function usePostScheduleWeekService() {
  const fetch = useFetch();

  return useCallback(
    (data: ScheduleWeekPostRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/weeks`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<ScheduleWeek>);
    },
    [fetch]
  );
}

export type ShiftPostRequest = Pick<
  Shift,
  "date" | "startTime" | "endTime" | "positionId" | "staffId" | "note"
>;

export function usePostShiftService() {
  const fetch = useFetch();

  return useCallback(
    (data: ShiftPostRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/shifts`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<Shift>);
    },
    [fetch]
  );
}

export type ShiftPatchRequest = {
  id: Shift["id"];
  data: Partial<ShiftPostRequest>;
};

export function usePatchShiftService() {
  const fetch = useFetch();

  return useCallback(
    (data: ShiftPatchRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/shifts/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<Shift>);
    },
    [fetch]
  );
}

export function useDeleteShiftService() {
  const fetch = useFetch();

  return useCallback(
    (data: { id: Shift["id"] }, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/shifts/${data.id}`, {
        method: "DELETE",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<undefined>);
    },
    [fetch]
  );
}

// Replaces the week's published copy with its current draft.
export function usePublishScheduleWeekService() {
  const fetch = useFetch();

  return useCallback(
    (data: { weekStart: string }, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/weeks/${data.weekStart}/publish`, {
        method: "POST",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<ScheduleWeek>);
    },
    [fetch]
  );
}

// Resets the week's draft to exactly what was last published.
export function useDiscardScheduleWeekService() {
  const fetch = useFetch();

  return useCallback(
    (data: { weekStart: string }, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/schedule/weeks/${data.weekStart}/discard`, {
        method: "POST",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<ScheduleWeek>);
    },
    [fetch]
  );
}

export type PublishedWeeksResponse = {
  data: PublishedWeekSummary[];
  hasNextPage: boolean;
};

// Published weeks starting before a given Monday, newest first.
export function useGetPublishedWeeksService() {
  const fetch = useFetch();

  return useCallback(
    (
      data: { before: string; limit: number },
      requestConfig?: RequestConfigType
    ) => {
      const requestUrl = new URL(`${API_URL}/v1/schedule/weeks/published`);
      requestUrl.searchParams.append("before", data.before);
      requestUrl.searchParams.append("limit", String(data.limit));
      return fetch(requestUrl, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<PublishedWeeksResponse>);
    },
    [fetch]
  );
}

// ---- Public schedule: no login, but every call sends the shared PIN ----

const pinHeader = (pin: string) => ({ "x-schedule-pin": pin });

// 204 if the PIN is right, 403 if wrong, 429 after too many wrong tries.
export function useVerifySchedulePinService() {
  const fetch = useFetch();

  return useCallback(
    (data: { pin: string }, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/public/schedule/verify-pin`, {
        method: "POST",
        ...requestConfig,
        headers: pinHeader(data.pin),
      }).then((response) => response.status);
    },
    [fetch]
  );
}

export function useGetPublicWeeksService() {
  const fetch = useFetch();

  return useCallback(
    (data: { pin: string }, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/public/schedule/weeks`, {
        method: "GET",
        ...requestConfig,
        headers: pinHeader(data.pin),
      }).then(
        wrapperFetchJsonResponse<{ weekStart: string; publishedAt: string }[]>
      );
    },
    [fetch]
  );
}

export function useGetPublicWeekService() {
  const fetch = useFetch();

  return useCallback(
    (
      data: { pin: string; weekStart: string },
      requestConfig?: RequestConfigType
    ) => {
      return fetch(`${API_URL}/v1/public/schedule/weeks/${data.weekStart}`, {
        method: "GET",
        ...requestConfig,
        headers: pinHeader(data.pin),
      }).then(wrapperFetchJsonResponse<PublicScheduleWeek>);
    },
    [fetch]
  );
}
