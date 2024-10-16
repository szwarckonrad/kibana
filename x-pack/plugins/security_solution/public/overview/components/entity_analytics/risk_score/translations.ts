/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getRiskEntityTranslation } from '../../../../explore/components/risk_score/translations';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
export * from '../../../../explore/components/risk_score/translations';

export const ENTITY_NAME = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.nameTitle', {
    defaultMessage: '{riskEntity} Name',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity),
    },
  });

export const VIEW_ALL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskDashboard.viewAllLabel',
  {
    defaultMessage: 'View all',
  }
);

export const LEARN_MORE = (riskEntity: RiskScoreEntity) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.riskDashboard.learnMore', {
    defaultMessage: 'Learn more about {riskEntity} risk',
    values: {
      riskEntity: getRiskEntityTranslation(riskEntity, true),
    },
  });

export const HOST_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskDashboard.hostsTableTooltip',
  {
    defaultMessage:
      'The Host Risk Score panel displays the list of risky hosts and their latest risk score. You may filter this list using global filters in the KQL search bar. The time-range picker filter will display Alerts within the selected time range only and does not filter the list of risky hosts.',
  }
);

export const USER_RISK_TABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.riskDashboard.usersTableTooltip',
  {
    defaultMessage:
      'The User Risk Score panel displays the list of risky users and their latest risk score. You may filter this list using global filters in the KQL search bar. The time-range picker filter will display Alerts within the selected time range only and does not filter the list of risky users.',
  }
);
