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
 *   title: Get Live Query Results Schema
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import {
  KueryOrUndefined,
  PageOrUndefined,
  PageSizeOrUndefined,
  SortOrUndefined,
  SortOrderOrUndefined,
} from '../model/schema/common_attributes.gen';

/**
 * The query parameters for getting live query results.
 */
export type GetLiveQueryResultsRequestQuery = z.infer<typeof GetLiveQueryResultsRequestQuery>;
export const GetLiveQueryResultsRequestQuery = z.object({
  kuery: KueryOrUndefined.optional(),
  page: PageOrUndefined.optional(),
  pageSize: PageSizeOrUndefined.optional(),
  sort: SortOrUndefined.optional(),
  sortOrder: SortOrderOrUndefined.optional(),
});

/**
 * The response for getting live query results.
 */
export type GetLiveQueryResultsResponse = z.infer<typeof GetLiveQueryResultsResponse>;
export const GetLiveQueryResultsResponse = z.object({});
