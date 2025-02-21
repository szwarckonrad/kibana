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
 *   title: Packs Schema
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import { FindPacksRequestQuery, FindPacksResponse } from './find_packs.gen';
import { CreatePacksRequestBody } from './create_pack.gen';
import { DefaultSuccessResponse, PackId } from '../model/schema/common_attributes.gen';
import { UpdatePacksRequestBody } from './update_packs.gen';

export type OsqueryCreatePacksRequestBody = z.infer<typeof OsqueryCreatePacksRequestBody>;
export const OsqueryCreatePacksRequestBody = CreatePacksRequestBody;
export type OsqueryCreatePacksRequestBodyInput = z.input<typeof OsqueryCreatePacksRequestBody>;

export type OsqueryCreatePacksResponse = z.infer<typeof OsqueryCreatePacksResponse>;
export const OsqueryCreatePacksResponse = DefaultSuccessResponse;

export type OsqueryDeletePacksRequestParams = z.infer<typeof OsqueryDeletePacksRequestParams>;
export const OsqueryDeletePacksRequestParams = z.object({
  id: PackId,
});
export type OsqueryDeletePacksRequestParamsInput = z.input<typeof OsqueryDeletePacksRequestParams>;

export type OsqueryDeletePacksResponse = z.infer<typeof OsqueryDeletePacksResponse>;
export const OsqueryDeletePacksResponse = DefaultSuccessResponse;
export type OsqueryFindPacksRequestQuery = z.infer<typeof OsqueryFindPacksRequestQuery>;
export const OsqueryFindPacksRequestQuery = z.object({
  query: FindPacksRequestQuery,
});
export type OsqueryFindPacksRequestQueryInput = z.input<typeof OsqueryFindPacksRequestQuery>;

export type OsqueryFindPacksResponse = z.infer<typeof OsqueryFindPacksResponse>;
export const OsqueryFindPacksResponse = FindPacksResponse;

export type OsqueryGetPacksDetailsRequestParams = z.infer<
  typeof OsqueryGetPacksDetailsRequestParams
>;
export const OsqueryGetPacksDetailsRequestParams = z.object({
  id: PackId,
});
export type OsqueryGetPacksDetailsRequestParamsInput = z.input<
  typeof OsqueryGetPacksDetailsRequestParams
>;

export type OsqueryGetPacksDetailsResponse = z.infer<typeof OsqueryGetPacksDetailsResponse>;
export const OsqueryGetPacksDetailsResponse = DefaultSuccessResponse;

export type OsqueryUpdatePacksRequestParams = z.infer<typeof OsqueryUpdatePacksRequestParams>;
export const OsqueryUpdatePacksRequestParams = z.object({
  id: PackId,
});
export type OsqueryUpdatePacksRequestParamsInput = z.input<typeof OsqueryUpdatePacksRequestParams>;

export type OsqueryUpdatePacksRequestBody = z.infer<typeof OsqueryUpdatePacksRequestBody>;
export const OsqueryUpdatePacksRequestBody = UpdatePacksRequestBody;
export type OsqueryUpdatePacksRequestBodyInput = z.input<typeof OsqueryUpdatePacksRequestBody>;

export type OsqueryUpdatePacksResponse = z.infer<typeof OsqueryUpdatePacksResponse>;
export const OsqueryUpdatePacksResponse = DefaultSuccessResponse;
