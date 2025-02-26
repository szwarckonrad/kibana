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
 *   title: Create exception list API endpoint
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import {
  ExceptionListHumanId,
  ExceptionListName,
  ExceptionListDescription,
  ExceptionListType,
  ExceptionNamespaceType,
  ExceptionListOsTypeArray,
  ExceptionListTags,
  ExceptionListMeta,
  ExceptionListVersion,
  ExceptionList,
} from '../model/exception_list_common.gen';

export type CreateExceptionListRequestBody = z.infer<typeof CreateExceptionListRequestBody>;
export const CreateExceptionListRequestBody = z.object({
  list_id: ExceptionListHumanId.optional(),
  name: ExceptionListName,
  description: ExceptionListDescription,
  type: ExceptionListType,
  namespace_type: ExceptionNamespaceType.optional().default('single'),
  os_types: ExceptionListOsTypeArray.optional(),
  tags: ExceptionListTags.optional().default([]),
  meta: ExceptionListMeta.optional(),
  version: ExceptionListVersion.optional().default(1),
});
export type CreateExceptionListRequestBodyInput = z.input<typeof CreateExceptionListRequestBody>;

export type CreateExceptionListResponse = z.infer<typeof CreateExceptionListResponse>;
export const CreateExceptionListResponse = ExceptionList;
