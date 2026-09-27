import { useCallback } from "react";
import useFetch from "../use-fetch";
import { API_URL } from "../config";
import wrapperFetchJsonResponse from "../wrapper-fetch-json-response";
import { Position } from "../types/position";
import { RequestConfigType } from "./types/request-config";

export type PositionsRequest = {
  includeArchived?: boolean;
};

// Positions are a short list, so the API returns all of them, unpaged and
// already sorted by name.
export type PositionsResponse = Position[];

export function useGetPositionsService() {
  const fetch = useFetch();

  return useCallback(
    (data: PositionsRequest = {}, requestConfig?: RequestConfigType) => {
      const requestUrl = new URL(`${API_URL}/v1/positions`);
      if (data.includeArchived) {
        requestUrl.searchParams.append("includeArchived", "true");
      }

      return fetch(requestUrl, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<PositionsResponse>);
    },
    [fetch]
  );
}

export type PositionRequest = {
  id: Position["id"];
};

export type PositionResponse = Position;

export function useGetPositionService() {
  const fetch = useFetch();

  return useCallback(
    (data: PositionRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/positions/${data.id}`, {
        method: "GET",
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<PositionResponse>);
    },
    [fetch]
  );
}

export type PositionPostRequest = Pick<Position, "name" | "color">;

export type PositionPostResponse = Position;

export function usePostPositionService() {
  const fetch = useFetch();

  return useCallback(
    (data: PositionPostRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/positions`, {
        method: "POST",
        body: JSON.stringify(data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<PositionPostResponse>);
    },
    [fetch]
  );
}

export type PositionPatchRequest = {
  id: Position["id"];
  data: Partial<Pick<Position, "name" | "color" | "isActive">>;
};

export type PositionPatchResponse = Position;

// Also used to archive (isActive: false) and restore (isActive: true).
export function usePatchPositionService() {
  const fetch = useFetch();

  return useCallback(
    (data: PositionPatchRequest, requestConfig?: RequestConfigType) => {
      return fetch(`${API_URL}/v1/positions/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data.data),
        ...requestConfig,
      }).then(wrapperFetchJsonResponse<PositionPatchResponse>);
    },
    [fetch]
  );
}
