/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const UpdateWorkflowInsightRequestSchema = {
  params: schema.object({
    insightId: schema.string({
      minLength: 1,
      validate: (id) => {
        if (id.trim() === '') {
          return 'insightId can not be an empty string';
        }
      },
    }),
  }),
  body: schema.object({
    '@timestamp': schema.maybe(schema.string()),
    message: schema.maybe(schema.string()),
    category: schema.maybe(schema.oneOf([schema.literal('endpoint')])),
    type: schema.maybe(
      schema.oneOf([schema.literal('incompatible_antivirus'), schema.literal('noisy_process_tree')])
    ),
    source: schema.maybe(
      schema.object({
        type: schema.maybe(schema.oneOf([schema.literal('llm-connector')])),
        id: schema.maybe(schema.string()),
        data_range_start: schema.maybe(schema.string()),
        data_range_end: schema.maybe(schema.string()),
      })
    ),
    target: schema.maybe(
      schema.object({
        type: schema.maybe(schema.oneOf([schema.literal('endpoint')])),
        ids: schema.maybe(schema.arrayOf(schema.string())),
      })
    ),
    action: schema.maybe(
      schema.object({
        type: schema.maybe(
          schema.oneOf([
            schema.literal('refreshed'),
            schema.literal('remediated'),
            schema.literal('suppressed'),
            schema.literal('dismissed'),
          ])
        ),
        timestamp: schema.maybe(schema.string()),
      })
    ),
    value: schema.maybe(schema.string()),
    remediation: schema.maybe(
      schema.object({
        exception_list_items: schema.maybe(
          schema.arrayOf(
            schema.object({
              list_id: schema.maybe(schema.string()),
              name: schema.maybe(schema.string()),
              description: schema.maybe(schema.string()),
              entries: schema.maybe(schema.arrayOf(schema.any())),
              tags: schema.maybe(schema.arrayOf(schema.string())),
              os_types: schema.maybe(schema.arrayOf(schema.string())),
            })
          )
        ),
      })
    ),
    metadata: schema.maybe(
      schema.object({
        notes: schema.maybe(schema.recordOf(schema.string(), schema.string())),
        message_variables: schema.maybe(schema.arrayOf(schema.string())),
      })
    ),
  }),
};

export type UpdateWorkflowInsightsRequestParams = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.params
>;
export type UpdateWorkflowInsightsRequestBody = TypeOf<
  typeof UpdateWorkflowInsightRequestSchema.body
>;
