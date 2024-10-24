/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

const upperFirst = (str = '') => str.replace(/^./, (strng) => strng.toUpperCase());

const names: Record<string, string> = {
  general: i18n.translate('management.settings.categoryNames.generalLabel', {
    defaultMessage: 'General',
  }),
  machineLearning: i18n.translate('management.settings.categoryNames.machineLearningLabel', {
    defaultMessage: 'Machine Learning',
  }),
  observability: i18n.translate('management.settings.categoryNames.observabilityLabel', {
    defaultMessage: 'Observability',
  }),
  timelion: i18n.translate('management.settings.categoryNames.timelionLabel', {
    defaultMessage: 'Timelion',
  }),
  notifications: i18n.translate('management.settings.categoryNames.notificationsLabel', {
    defaultMessage: 'Notifications',
  }),
  visualizations: i18n.translate('management.settings.categoryNames.visualizationsLabel', {
    defaultMessage: 'Visualizations',
  }),
  discover: i18n.translate('management.settings.categoryNames.discoverLabel', {
    defaultMessage: 'Discover',
  }),
  dashboard: i18n.translate('management.settings.categoryNames.dashboardLabel', {
    defaultMessage: 'Dashboard',
  }),
  reporting: i18n.translate('management.settings.categoryNames.reportingLabel', {
    defaultMessage: 'Reporting',
  }),
  search: i18n.translate('management.settings.categoryNames.searchLabel', {
    defaultMessage: 'Search',
  }),
  securitySolution: i18n.translate('management.settings.categoryNames.securitySolutionLabel', {
    defaultMessage: 'Security Solution',
  }),
  enterpriseSearch: i18n.translate('management.settings.categoryNames.enterpriseSearchLabel', {
    defaultMessage: 'Enterprise Search',
  }),
};

export function getCategoryName(category?: string) {
  return category ? names[category] || upperFirst(category) : '';
}
