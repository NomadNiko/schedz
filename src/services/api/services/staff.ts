import { useCallback } from "react";
import useFetch from "../use-fetch";
import { API_URL } from "../config";
import wrapperFetchJsonResponse from "../wrapper-fetch-json-response";
import { Staff } from "../types/staff";
import { InfinityPaginationType } from "../types/infinity-pagination";
import { SortEnum } from "../types/sort-type";
import { RequestConfigType } from "./types/request-config";

export type StaffListRequest = {
  page: number;
  limit: number;
  sort?: Array<{
    orderBy: keyof Staff;
    order: SortEnum;
  }>;
  includeArchived?: boolean;
};

export type StaffListResponse = InfinityPaginationType<Staff>;

export function useGetStaffListService() {
  const fetch = useFetch();

  return useCallback(
    (data: StaffListRequest, requestConfig?: RequestConfigType) => {
      const requestUrl = new URL(`${API_URL}/v1/staff`);
      requestUrl.searchParams.append("page", data.page.toString());
      requestUrl.searchParams.append("limit", data.limit.toString());
      if (data.sort) {
        requestUrl.searchParams.append("sort", JSON.stringify(data.sort));
      }
      if (data.includeArchived) {
        requestUrl.searchParams.append("includeArchived", "true");
      }

      return fetch(requestUrl, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<StaffListResponse>);
    },
    [fetch]
  );
}

export type AllStaffResponse = Staff[];

// Every staff member, archived included, unpaged and sorted by name.
export function useGetAllStaffService() {
  const fetch = useFetch();

  return useCallback(
    (requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/staff/all`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<AllStaffResponse>);
    },
    [fetch]
  );
}

export type StaffRequest = {
  id: Staff["id"];
};

export type StaffResponse = Staff;

export function useGetStaffService() {
  const fetch = useFetch();

  return useCallback(
    (data: StaffRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/staff/${data.id}`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<StaffResponse>);
    },
    [fetch]
  );
}

export type StaffPostRequest = Pick<
  Staff,
  "name" | "email" | "phone" | "positionIds"
>;

export type StaffPostResponse = Staff;

export function usePostStaffService() {
  const fetch = useFetch();

  return useCallback(
    (data: StaffPostRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/staff`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<StaffPostResponse>);
    },
    [fetch]
  );
}

export type StaffPatchRequest = {
  id: Staff["id"];
  data: Partial<
    Pick<Staff, "name" | "email" | "phone" | "positionIds" | "isActive">
  >;
};

export type StaffPatchResponse = Staff;

// Also used to archive (isActive: false) and restore (isActive: true).
export function usePatchStaffService() {
  const fetch = useFetch();

  return useCallback(
    (data: StaffPatchRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/staff/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<StaffPatchResponse>);
    },
    [fetch]
  );
}
