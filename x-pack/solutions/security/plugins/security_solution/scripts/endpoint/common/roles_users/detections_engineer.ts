/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getNoResponseActionsRole } from './without_response_actions_role';

export const getDetectionsEngineer: () => Omit<Role, 'name'> = () => {
  const noResponseActionsRole = getNoResponseActionsRole();
  return {
    ...noResponseActionsRole,
    kibana: [
      {
        ...noResponseActionsRole.kibana[0],
        feature: {
          ...noResponseActionsRole.kibana[0].feature,
          siemV2: [
            'minimal_all',

            'policy_management_read',

            'trusted_applications_read',
            'event_filters_read',
            'host_isolation_exceptions_read',
            'blocklist_all',

            'actions_log_management_read',
          ],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
        },
      },
    ],
  };
};
