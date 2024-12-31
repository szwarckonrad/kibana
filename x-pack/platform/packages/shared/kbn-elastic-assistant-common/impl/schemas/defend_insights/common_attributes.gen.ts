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
 *   title: Common Defend Insights Attributes
 *   version: not applicable
 */

import { z } from '@kbn/zod';

import { NonEmptyString, User } from '../common_attributes.gen';
import { Replacements, ApiConfig } from '../conversations/common_attributes.gen';

/**
 * A Defend insight event
 */
export type DefendInsightEvent = z.infer<typeof DefendInsightEvent>;
export const DefendInsightEvent = z.object({
  /**
   * The event's ID
   */
  id: z.string(),
  /**
   * The endpoint's ID
   */
  endpointId: z.string(),
  /**
   * The value of the event
   */
  value: z.string(),
  /**
   * The signature of the event
   */
  signature: z.string().optional(),
});

/**
 * The insight type (ie. incompatible_antivirus)
 */
export type DefendInsightType = z.infer<typeof DefendInsightType>;
export const DefendInsightType = z.enum(['incompatible_antivirus', 'noisy_process_tree']);
export type DefendInsightTypeEnum = typeof DefendInsightType.enum;
export const DefendInsightTypeEnum = DefendInsightType.enum;

/**
 * A Defend insight generated from endpoint events
 */
export type DefendInsight = z.infer<typeof DefendInsight>;
export const DefendInsight = z.object({
  /**
   * The group category of the events (ie. Windows Defender)
   */
  group: z.string(),
  /**
   * An array of event objects
   */
  events: z.array(DefendInsightEvent).optional(),
});

/**
 * Array of Defend insights
 */
export type DefendInsights = z.infer<typeof DefendInsights>;
export const DefendInsights = z.array(DefendInsight);

/**
 * The status of the Defend insight.
 */
export type DefendInsightStatus = z.infer<typeof DefendInsightStatus>;
export const DefendInsightStatus = z.enum(['running', 'succeeded', 'failed', 'canceled']);
export type DefendInsightStatusEnum = typeof DefendInsightStatus.enum;
export const DefendInsightStatusEnum = DefendInsightStatus.enum;

/**
 * Run durations for the Defend insight
 */
export type DefendInsightGenerationInterval = z.infer<typeof DefendInsightGenerationInterval>;
export const DefendInsightGenerationInterval = z.object({
  /**
   * The time the Defend insight was generated
   */
  date: z.string(),
  /**
   * The duration of the Defend insight generation
   */
  durationMs: z.number().int(),
});

export type DefendInsightsResponse = z.infer<typeof DefendInsightsResponse>;
export const DefendInsightsResponse = z.object({
  id: NonEmptyString,
  timestamp: NonEmptyString.optional(),
  /**
   * The last time the Defend insight was updated.
   */
  updatedAt: z.string(),
  /**
   * The last time the Defend insight was viewed in the browser.
   */
  lastViewedAt: z.string(),
  /**
   * The number of events in the context.
   */
  eventsContextCount: z.number().int().optional(),
  /**
   * The time the Defend insight was created.
   */
  createdAt: z.string(),
  replacements: Replacements.optional(),
  users: z.array(User),
  /**
   * The status of the Defend insight.
   */
  status: DefendInsightStatus,
  endpointIds: z.array(NonEmptyString),
  insightType: DefendInsightType,
  /**
   * The Defend insights.
   */
  insights: DefendInsights,
  /**
   * LLM API configuration.
   */
  apiConfig: ApiConfig,
  /**
   * Kibana space
   */
  namespace: z.string(),
  /**
   * The backing index required for update requests.
   */
  backingIndex: z.string(),
  /**
   * The most 5 recent generation intervals
   */
  generationIntervals: z.array(DefendInsightGenerationInterval),
  /**
   * The average generation interval in milliseconds
   */
  averageIntervalMs: z.number().int(),
  /**
   * The reason for a status of failed.
   */
  failureReason: z.string().optional(),
});

export type DefendInsightUpdateProps = z.infer<typeof DefendInsightUpdateProps>;
export const DefendInsightUpdateProps = z.object({
  id: NonEmptyString,
  /**
   * LLM API configuration.
   */
  apiConfig: ApiConfig.optional(),
  /**
   * The number of events in the context.
   */
  eventsContextCount: z.number().int().optional(),
  /**
   * The Defend insights.
   */
  insights: DefendInsights.optional(),
  /**
   * The status of the Defend insight.
   */
  status: DefendInsightStatus.optional(),
  replacements: Replacements.optional(),
  /**
   * The most 5 recent generation intervals
   */
  generationIntervals: z.array(DefendInsightGenerationInterval).optional(),
  /**
   * The backing index required for update requests.
   */
  backingIndex: z.string(),
  /**
   * The reason for a status of failed.
   */
  failureReason: z.string().optional(),
  /**
   * The last time the Defend insight was viewed in the browser.
   */
  lastViewedAt: z.string().optional(),
});

export type DefendInsightsUpdateProps = z.infer<typeof DefendInsightsUpdateProps>;
export const DefendInsightsUpdateProps = z.array(DefendInsightUpdateProps);

export type DefendInsightCreateProps = z.infer<typeof DefendInsightCreateProps>;
export const DefendInsightCreateProps = z.object({
  /**
   * The Defend insight id.
   */
  id: z.string().optional(),
  /**
   * The status of the Defend insight.
   */
  status: DefendInsightStatus,
  /**
   * The number of events in the context.
   */
  eventsContextCount: z.number().int().optional(),
  endpointIds: z.array(NonEmptyString),
  insightType: DefendInsightType,
  /**
   * The Defend insights.
   */
  insights: DefendInsights,
  /**
   * LLM API configuration.
   */
  apiConfig: ApiConfig,
  replacements: Replacements.optional(),
});
