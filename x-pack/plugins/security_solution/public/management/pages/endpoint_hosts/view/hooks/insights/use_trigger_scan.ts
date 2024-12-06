/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { DefendInsightsResponse } from '@kbn/elastic-assistant-common';
import {
  DEFEND_INSIGHTS,
  DefendInsightTypeEnum,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { WORKFLOW_INSIGHTS } from '../../translations';

interface UseTriggerScanPayload {
  endpointId: string;
  connectorId: string;
  actionTypeId: string;
}

interface UseTriggerScanConfig {
  onMutate: () => void;
  onSuccess: () => void;
}

export const useTriggerScan = ({ onMutate, onSuccess }: UseTriggerScanConfig) => {
  const { http } = useKibana().services;
  const toasts = useToasts();

  return useMutation<
    DefendInsightsResponse,
    { body?: { message?: string } },
    UseTriggerScanPayload
  >(
    ({ endpointId, connectorId, actionTypeId }: UseTriggerScanPayload) =>
      http.post<DefendInsightsResponse>(DEFEND_INSIGHTS, {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        body: JSON.stringify({
          endpointIds: [endpointId],
          insightType: DefendInsightTypeEnum.incompatible_antivirus,
          anonymizationFields: [],
          replacements: {},
          subAction: 'invokeAI',
          apiConfig: {
            connectorId,
            actionTypeId,
          },
        }),
      }),
    {
      onMutate,
      onSuccess,
      onError: (err) => {
        toasts.addDanger({
          title: WORKFLOW_INSIGHTS.toasts.scanError,
          text: err?.body?.message,
        });
      },
    }
  );
};
