/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { EntityRiskQueries } from '../../../../common/api/search_strategy';
import { useRiskScoreFeatureStatus } from './use_risk_score_feature_status';
import { createFilter } from '../../../common/containers/helpers';
import type {
  RiskScoreSortField,
  RiskScoreStrategyResponse,
  StrategyResponseType,
} from '../../../../common/search_strategy';
import { getHostRiskIndex, getUserRiskIndex, EntityType } from '../../../../common/search_strategy';
import type { ESQuery } from '../../../../common/typed_json';
import type { InspectResponse } from '../../../types';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import type { inputsModel } from '../../../common/store';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { useIsNewRiskScoreModuleInstalled } from './use_risk_engine_status';

export interface RiskScoreState<T extends EntityType> {
  data: RiskScoreStrategyResponse<T>['data'];
  inspect: InspectResponse;
  isInspected: boolean;
  refetch: inputsModel.Refetch;
  totalCount: number;
  isModuleEnabled: boolean;
  isAuthorized: boolean;
  isDeprecated: boolean;
  loading: boolean;
  error: unknown;
}

export interface UseRiskScoreParams {
  filterQuery?: ESQuery | string;
  onlyLatest?: boolean;
  includeAlertsCount?: boolean;
  pagination?:
    | {
        cursorStart: number;
        querySize: number;
      }
    | undefined;
  skip?: boolean;
  sort?: RiskScoreSortField;
  timerange?: { to: string; from: string };
}

interface UseRiskScore<T> extends UseRiskScoreParams {
  riskEntity: T;
}

export const initialResult: Omit<StrategyResponseType<EntityRiskQueries.list>, 'rawResponse'> = {
  totalCount: 0,
  data: undefined,
};

export const useRiskScore = <T extends EntityType>({
  timerange,
  onlyLatest = true,
  filterQuery,
  sort,
  skip = false,
  pagination,
  riskEntity,
  includeAlertsCount = false,
}: UseRiskScore<T>): RiskScoreState<T> => {
  const spaceId = useSpaceId();
  const { installed: isNewRiskScoreModuleInstalled, isLoading: riskScoreStatusLoading } =
    useIsNewRiskScoreModuleInstalled();
  const defaultIndex =
    spaceId && !riskScoreStatusLoading && isNewRiskScoreModuleInstalled !== undefined
      ? riskEntity === EntityType.host
        ? getHostRiskIndex(spaceId, onlyLatest, isNewRiskScoreModuleInstalled)
        : getUserRiskIndex(spaceId, onlyLatest, isNewRiskScoreModuleInstalled)
      : undefined;
  const factoryQueryType = EntityRiskQueries.list;
  const { querySize, cursorStart } = pagination || {};

  const { addError } = useAppToasts();

  const {
    isDeprecated,
    isEnabled,
    isAuthorized,
    isLoading: isDeprecatedLoading,
    refetch: refetchDeprecated,
  } = useRiskScoreFeatureStatus(riskEntity, defaultIndex);

  const {
    loading,
    result: response,
    search,
    refetch,
    inspect,
    error,
  } = useSearchStrategy<EntityRiskQueries.list>({
    factoryQueryType,
    initialResult,
    abort: skip,
    showErrorToast: false,
  });
  const refetchAll = useCallback(() => {
    if (defaultIndex) {
      refetchDeprecated(defaultIndex);
      refetch();
    }
  }, [defaultIndex, refetch, refetchDeprecated]);

  const riskScoreResponse = useMemo(
    () => ({
      data: response.data,
      inspect,
      refetch: refetchAll,
      totalCount: response.totalCount,
      isAuthorized,
      isDeprecated,
      isModuleEnabled: isEnabled,
      isInspected: false,
      error,
    }),
    [
      inspect,
      isDeprecated,
      isEnabled,
      isAuthorized,
      refetchAll,
      response.data,
      response.totalCount,
      error,
    ]
  );

  const requestTimerange = useMemo(
    () => (timerange ? { to: timerange.to, from: timerange.from, interval: '' } : undefined),
    [timerange]
  );

  const riskScoreRequest = useMemo(
    () =>
      defaultIndex
        ? {
            defaultIndex: [defaultIndex],
            factoryQueryType,
            riskScoreEntity: riskEntity,
            includeAlertsCount,
            filterQuery: createFilter(filterQuery),
            pagination:
              cursorStart !== undefined && querySize !== undefined
                ? {
                    cursorStart,
                    querySize,
                  }
                : undefined,
            sort,
            timerange: requestTimerange,
            alertsTimerange: includeAlertsCount ? requestTimerange : undefined,
          }
        : null,
    [
      cursorStart,
      defaultIndex,
      factoryQueryType,
      filterQuery,
      querySize,
      sort,
      requestTimerange,
      riskEntity,
      includeAlertsCount,
    ]
  );

  useEffect(() => {
    if (error) {
      if (!isIndexNotFoundError(error)) {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.riskScore.failSearchDescription', {
            defaultMessage: `Failed to run search on risk score`,
          }),
        });
      }
    }
  }, [addError, error]);

  useEffect(() => {
    if (
      !skip &&
      !isDeprecatedLoading &&
      riskScoreRequest != null &&
      isAuthorized &&
      isEnabled &&
      !isDeprecated
    ) {
      search(riskScoreRequest);
    }
  }, [isEnabled, isDeprecated, isAuthorized, isDeprecatedLoading, riskScoreRequest, search, skip]);

  const result = { ...riskScoreResponse, loading: loading || isDeprecatedLoading };

  return result;
};
