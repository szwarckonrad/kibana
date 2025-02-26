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
 *   title: File Upload Schema
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import { BaseActionSchema } from '../../../model/schema/common.gen';

export type UploadRouteRequestBody = z.infer<typeof UploadRouteRequestBody>;
export const UploadRouteRequestBody = BaseActionSchema.merge(
  z.object({
    parameters: z.object({
      /**
       * Overwrite the file on the host if it already exists.
       */
      overwrite: z.boolean().optional().default(false),
    }),
    /**
     * The binary content of the file.
     */
    file: z.string(),
  })
);

export type UploadRouteResponse = z.infer<typeof UploadRouteResponse>;
export const UploadRouteResponse = z.object({});

export type EndpointUploadActionRequestBody = z.infer<typeof EndpointUploadActionRequestBody>;
export const EndpointUploadActionRequestBody = UploadRouteRequestBody;
export type EndpointUploadActionRequestBodyInput = z.input<typeof EndpointUploadActionRequestBody>;
