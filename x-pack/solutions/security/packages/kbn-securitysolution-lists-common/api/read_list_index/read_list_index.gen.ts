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
 *   title: Read value list DS existence status API endpoint
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

export type ReadListIndexResponse = z.infer<typeof ReadListIndexResponse>;
export const ReadListIndexResponse = z.object({
  list_index: z.boolean(),
  list_item_index: z.boolean(),
});
