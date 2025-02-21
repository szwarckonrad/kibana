/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Live Queries Schema
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import {
  FindLiveQueryRequestQuery,
  FindLiveQueryResponse,
  FindLiveQueryDetailsResponse,
} from './find_live_query.gen';
import { CreateLiveQueryRequestBody, CreateLiveQueryResponse } from './create_live_query.gen';
import {
  GetLiveQueryResultsRequestQuery,
  GetLiveQueryResultsResponse,
} from './get_live_query_results.gen';

export type OsqueryCreateLiveQueryRequestBody = z.infer<typeof OsqueryCreateLiveQueryRequestBody>;
export const OsqueryCreateLiveQueryRequestBody = CreateLiveQueryRequestBody;
export type OsqueryCreateLiveQueryRequestBodyInput = z.input<
  typeof OsqueryCreateLiveQueryRequestBody
>;

export type OsqueryCreateLiveQueryResponse = z.infer<typeof OsqueryCreateLiveQueryResponse>;
export const OsqueryCreateLiveQueryResponse = CreateLiveQueryResponse;
export type OsqueryFindLiveQueriesRequestQuery = z.infer<typeof OsqueryFindLiveQueriesRequestQuery>;
export const OsqueryFindLiveQueriesRequestQuery = z.object({
  query: FindLiveQueryRequestQuery,
});
export type OsqueryFindLiveQueriesRequestQueryInput = z.input<
  typeof OsqueryFindLiveQueriesRequestQuery
>;

export type OsqueryFindLiveQueriesResponse = z.infer<typeof OsqueryFindLiveQueriesResponse>;
export const OsqueryFindLiveQueriesResponse = FindLiveQueryResponse;
export type OsqueryGetLiveQueryDetailsRequestQuery = z.infer<
  typeof OsqueryGetLiveQueryDetailsRequestQuery
>;
export const OsqueryGetLiveQueryDetailsRequestQuery = z.object({
  query: z.object({}),
});
export type OsqueryGetLiveQueryDetailsRequestQueryInput = z.input<
  typeof OsqueryGetLiveQueryDetailsRequestQuery
>;

export type OsqueryGetLiveQueryDetailsRequestParams = z.infer<
  typeof OsqueryGetLiveQueryDetailsRequestParams
>;
export const OsqueryGetLiveQueryDetailsRequestParams = z.object({
  id: z.string(),
});
export type OsqueryGetLiveQueryDetailsRequestParamsInput = z.input<
  typeof OsqueryGetLiveQueryDetailsRequestParams
>;

export type OsqueryGetLiveQueryDetailsResponse = z.infer<typeof OsqueryGetLiveQueryDetailsResponse>;
export const OsqueryGetLiveQueryDetailsResponse = FindLiveQueryDetailsResponse;
export type OsqueryGetLiveQueryResultsRequestQuery = z.infer<
  typeof OsqueryGetLiveQueryResultsRequestQuery
>;
export const OsqueryGetLiveQueryResultsRequestQuery = z.object({
  query: GetLiveQueryResultsRequestQuery,
});
export type OsqueryGetLiveQueryResultsRequestQueryInput = z.input<
  typeof OsqueryGetLiveQueryResultsRequestQuery
>;

export type OsqueryGetLiveQueryResultsRequestParams = z.infer<
  typeof OsqueryGetLiveQueryResultsRequestParams
>;
export const OsqueryGetLiveQueryResultsRequestParams = z.object({
  id: z.string(),
  actionId: z.string(),
});
export type OsqueryGetLiveQueryResultsRequestParamsInput = z.input<
  typeof OsqueryGetLiveQueryResultsRequestParams
>;

export type OsqueryGetLiveQueryResultsResponse = z.infer<typeof OsqueryGetLiveQueryResultsResponse>;
export const OsqueryGetLiveQueryResultsResponse = GetLiveQueryResultsResponse;
