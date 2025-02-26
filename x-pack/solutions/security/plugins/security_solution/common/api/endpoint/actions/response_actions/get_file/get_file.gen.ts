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
 *   title: Get File Schema
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import { BaseActionSchema } from '../../../model/schema/common.gen';

export type GetFileRouteRequestBody = z.infer<typeof GetFileRouteRequestBody>;
export const GetFileRouteRequestBody = BaseActionSchema.merge(
  z.object({
    parameters: z.object({
      path: z.string(),
    }),
  })
);

export type GetFileRouteResponse = z.infer<typeof GetFileRouteResponse>;
export const GetFileRouteResponse = z.object({});

export type EndpointGetFileActionRequestBody = z.infer<typeof EndpointGetFileActionRequestBody>;
export const EndpointGetFileActionRequestBody = GetFileRouteRequestBody;
export type EndpointGetFileActionRequestBodyInput = z.input<
  typeof EndpointGetFileActionRequestBody
>;

export type EndpointGetFileActionResponse = z.infer<typeof EndpointGetFileActionResponse>;
export const EndpointGetFileActionResponse = GetFileRouteResponse;
