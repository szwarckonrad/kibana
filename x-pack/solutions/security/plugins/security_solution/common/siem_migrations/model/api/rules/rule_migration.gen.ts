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
 *   title: SIEM Rules Migration API
 *   version: 1
 */

import { z } from '@kbn/zod';
import { ArrayFromString, BooleanFromString } from '@kbn/zod-helpers';

import {
  UpdateRuleMigrationData,
  RuleMigrationTaskStats,
  OriginalRule,
  RuleMigration,
  RuleMigrationRetryFilter,
  RuleMigrationTranslationStats,
  PrebuiltRuleVersion,
  RuleMigrationResourceData,
  RuleMigrationResourceType,
  RuleMigrationResource,
  RuleMigrationResourceBase,
} from '../../rule_migration.gen';
import { RelatedIntegration } from '../../../../api/detection_engine/model/rule_schema/common_attributes.gen';
import { NonEmptyString } from '../../../../api/model/primitives.gen';
import { ConnectorId, LangSmithOptions } from '../../common.gen';

export type CreateRuleMigrationRequestParams = z.infer<typeof CreateRuleMigrationRequestParams>;
export const CreateRuleMigrationRequestParams = z.object({
  migration_id: NonEmptyString.optional(),
});
export type CreateRuleMigrationRequestParamsInput = z.input<
  typeof CreateRuleMigrationRequestParams
>;

export type CreateRuleMigrationRequestBody = z.infer<typeof CreateRuleMigrationRequestBody>;
export const CreateRuleMigrationRequestBody = z.array(OriginalRule);
export type CreateRuleMigrationRequestBodyInput = z.input<typeof CreateRuleMigrationRequestBody>;

export type CreateRuleMigrationResponse = z.infer<typeof CreateRuleMigrationResponse>;
export const CreateRuleMigrationResponse = z.object({
  /**
   * The migration id created.
   */
  migration_id: NonEmptyString,
});

export type GetAllStatsRuleMigrationResponse = z.infer<typeof GetAllStatsRuleMigrationResponse>;
export const GetAllStatsRuleMigrationResponse = z.array(RuleMigrationTaskStats);
export type GetRuleMigrationRequestQuery = z.infer<typeof GetRuleMigrationRequestQuery>;
export const GetRuleMigrationRequestQuery = z.object({
  page: z.coerce.number().optional(),
  per_page: z.coerce.number().optional(),
  sort_field: NonEmptyString.optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
  search_term: z.string().optional(),
  ids: ArrayFromString(NonEmptyString).optional(),
  is_prebuilt: BooleanFromString.optional(),
  is_installed: BooleanFromString.optional(),
  is_fully_translated: BooleanFromString.optional(),
  is_partially_translated: BooleanFromString.optional(),
  is_untranslatable: BooleanFromString.optional(),
  is_failed: BooleanFromString.optional(),
});
export type GetRuleMigrationRequestQueryInput = z.input<typeof GetRuleMigrationRequestQuery>;

export type GetRuleMigrationRequestParams = z.infer<typeof GetRuleMigrationRequestParams>;
export const GetRuleMigrationRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type GetRuleMigrationRequestParamsInput = z.input<typeof GetRuleMigrationRequestParams>;

export type GetRuleMigrationResponse = z.infer<typeof GetRuleMigrationResponse>;
export const GetRuleMigrationResponse = z.object({
  /**
   * The total number of rules in migration.
   */
  total: z.number(),
  data: z.array(RuleMigration),
});

/**
 * The map of related integrations, with the integration id as a key
 */
export type GetRuleMigrationIntegrationsResponse = z.infer<
  typeof GetRuleMigrationIntegrationsResponse
>;
export const GetRuleMigrationIntegrationsResponse = z.object({}).catchall(RelatedIntegration);

export type GetRuleMigrationPrebuiltRulesRequestParams = z.infer<
  typeof GetRuleMigrationPrebuiltRulesRequestParams
>;
export const GetRuleMigrationPrebuiltRulesRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type GetRuleMigrationPrebuiltRulesRequestParamsInput = z.input<
  typeof GetRuleMigrationPrebuiltRulesRequestParams
>;

/**
 * The map of prebuilt rules, with the rules id as a key
 */
export type GetRuleMigrationPrebuiltRulesResponse = z.infer<
  typeof GetRuleMigrationPrebuiltRulesResponse
>;
export const GetRuleMigrationPrebuiltRulesResponse = z.object({}).catchall(PrebuiltRuleVersion);
export type GetRuleMigrationResourcesRequestQuery = z.infer<
  typeof GetRuleMigrationResourcesRequestQuery
>;
export const GetRuleMigrationResourcesRequestQuery = z.object({
  type: RuleMigrationResourceType.optional(),
  names: ArrayFromString(z.string()).optional(),
  from: z.coerce.number().optional(),
  size: z.coerce.number().optional(),
});
export type GetRuleMigrationResourcesRequestQueryInput = z.input<
  typeof GetRuleMigrationResourcesRequestQuery
>;

export type GetRuleMigrationResourcesRequestParams = z.infer<
  typeof GetRuleMigrationResourcesRequestParams
>;
export const GetRuleMigrationResourcesRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type GetRuleMigrationResourcesRequestParamsInput = z.input<
  typeof GetRuleMigrationResourcesRequestParams
>;

export type GetRuleMigrationResourcesResponse = z.infer<typeof GetRuleMigrationResourcesResponse>;
export const GetRuleMigrationResourcesResponse = z.array(RuleMigrationResource);

export type GetRuleMigrationResourcesMissingRequestParams = z.infer<
  typeof GetRuleMigrationResourcesMissingRequestParams
>;
export const GetRuleMigrationResourcesMissingRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type GetRuleMigrationResourcesMissingRequestParamsInput = z.input<
  typeof GetRuleMigrationResourcesMissingRequestParams
>;

/**
 * The identified resources missing
 */
export type GetRuleMigrationResourcesMissingResponse = z.infer<
  typeof GetRuleMigrationResourcesMissingResponse
>;
export const GetRuleMigrationResourcesMissingResponse = z.array(RuleMigrationResourceBase);

export type GetRuleMigrationStatsRequestParams = z.infer<typeof GetRuleMigrationStatsRequestParams>;
export const GetRuleMigrationStatsRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type GetRuleMigrationStatsRequestParamsInput = z.input<
  typeof GetRuleMigrationStatsRequestParams
>;

export type GetRuleMigrationStatsResponse = z.infer<typeof GetRuleMigrationStatsResponse>;
export const GetRuleMigrationStatsResponse = RuleMigrationTaskStats;

export type GetRuleMigrationTranslationStatsRequestParams = z.infer<
  typeof GetRuleMigrationTranslationStatsRequestParams
>;
export const GetRuleMigrationTranslationStatsRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type GetRuleMigrationTranslationStatsRequestParamsInput = z.input<
  typeof GetRuleMigrationTranslationStatsRequestParams
>;

export type GetRuleMigrationTranslationStatsResponse = z.infer<
  typeof GetRuleMigrationTranslationStatsResponse
>;
export const GetRuleMigrationTranslationStatsResponse = RuleMigrationTranslationStats;

export type InstallMigrationRulesRequestParams = z.infer<typeof InstallMigrationRulesRequestParams>;
export const InstallMigrationRulesRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type InstallMigrationRulesRequestParamsInput = z.input<
  typeof InstallMigrationRulesRequestParams
>;

export type InstallMigrationRulesRequestBody = z.infer<typeof InstallMigrationRulesRequestBody>;
export const InstallMigrationRulesRequestBody = z.object({
  ids: z.array(NonEmptyString),
  /**
   * Indicates whether installed rules should be enabled
   */
  enabled: z.boolean().optional(),
});
export type InstallMigrationRulesRequestBodyInput = z.input<
  typeof InstallMigrationRulesRequestBody
>;

export type InstallMigrationRulesResponse = z.infer<typeof InstallMigrationRulesResponse>;
export const InstallMigrationRulesResponse = z.object({
  /**
   * Indicates rules migrations have been installed.
   */
  installed: z.boolean(),
});

export type InstallTranslatedMigrationRulesRequestParams = z.infer<
  typeof InstallTranslatedMigrationRulesRequestParams
>;
export const InstallTranslatedMigrationRulesRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type InstallTranslatedMigrationRulesRequestParamsInput = z.input<
  typeof InstallTranslatedMigrationRulesRequestParams
>;

export type InstallTranslatedMigrationRulesResponse = z.infer<
  typeof InstallTranslatedMigrationRulesResponse
>;
export const InstallTranslatedMigrationRulesResponse = z.object({
  /**
   * Indicates rules migrations have been installed.
   */
  installed: z.boolean(),
});

export type RetryRuleMigrationRequestParams = z.infer<typeof RetryRuleMigrationRequestParams>;
export const RetryRuleMigrationRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type RetryRuleMigrationRequestParamsInput = z.input<typeof RetryRuleMigrationRequestParams>;

export type RetryRuleMigrationRequestBody = z.infer<typeof RetryRuleMigrationRequestBody>;
export const RetryRuleMigrationRequestBody = z.object({
  connector_id: ConnectorId,
  langsmith_options: LangSmithOptions.optional(),
  filter: RuleMigrationRetryFilter.optional(),
});
export type RetryRuleMigrationRequestBodyInput = z.input<typeof RetryRuleMigrationRequestBody>;

export type RetryRuleMigrationResponse = z.infer<typeof RetryRuleMigrationResponse>;
export const RetryRuleMigrationResponse = z.object({
  /**
   * Indicates the migration retry has been started. `false` means the migration does not need to be retried.
   */
  started: z.boolean(),
});

export type StartRuleMigrationRequestParams = z.infer<typeof StartRuleMigrationRequestParams>;
export const StartRuleMigrationRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type StartRuleMigrationRequestParamsInput = z.input<typeof StartRuleMigrationRequestParams>;

export type StartRuleMigrationRequestBody = z.infer<typeof StartRuleMigrationRequestBody>;
export const StartRuleMigrationRequestBody = z.object({
  connector_id: ConnectorId,
  langsmith_options: LangSmithOptions.optional(),
});
export type StartRuleMigrationRequestBodyInput = z.input<typeof StartRuleMigrationRequestBody>;

export type StartRuleMigrationResponse = z.infer<typeof StartRuleMigrationResponse>;
export const StartRuleMigrationResponse = z.object({
  /**
   * Indicates the migration has been started. `false` means the migration does not need to be started.
   */
  started: z.boolean(),
});

export type StopRuleMigrationRequestParams = z.infer<typeof StopRuleMigrationRequestParams>;
export const StopRuleMigrationRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type StopRuleMigrationRequestParamsInput = z.input<typeof StopRuleMigrationRequestParams>;

export type StopRuleMigrationResponse = z.infer<typeof StopRuleMigrationResponse>;
export const StopRuleMigrationResponse = z.object({
  /**
   * Indicates the migration has been stopped.
   */
  stopped: z.boolean(),
});

export type UpdateRuleMigrationRequestBody = z.infer<typeof UpdateRuleMigrationRequestBody>;
export const UpdateRuleMigrationRequestBody = z.array(UpdateRuleMigrationData);
export type UpdateRuleMigrationRequestBodyInput = z.input<typeof UpdateRuleMigrationRequestBody>;

export type UpdateRuleMigrationResponse = z.infer<typeof UpdateRuleMigrationResponse>;
export const UpdateRuleMigrationResponse = z.object({
  /**
   * Indicates rules migrations have been updated.
   */
  updated: z.boolean(),
});

export type UpsertRuleMigrationResourcesRequestParams = z.infer<
  typeof UpsertRuleMigrationResourcesRequestParams
>;
export const UpsertRuleMigrationResourcesRequestParams = z.object({
  migration_id: NonEmptyString,
});
export type UpsertRuleMigrationResourcesRequestParamsInput = z.input<
  typeof UpsertRuleMigrationResourcesRequestParams
>;

export type UpsertRuleMigrationResourcesRequestBody = z.infer<
  typeof UpsertRuleMigrationResourcesRequestBody
>;
export const UpsertRuleMigrationResourcesRequestBody = z.array(RuleMigrationResourceData);
export type UpsertRuleMigrationResourcesRequestBodyInput = z.input<
  typeof UpsertRuleMigrationResourcesRequestBody
>;

export type UpsertRuleMigrationResourcesResponse = z.infer<
  typeof UpsertRuleMigrationResourcesResponse
>;
export const UpsertRuleMigrationResourcesResponse = z.object({
  /**
   * The request has been processed correctly.
   */
  acknowledged: z.boolean(),
});
