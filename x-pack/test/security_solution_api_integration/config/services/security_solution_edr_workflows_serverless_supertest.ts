/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context_edr_workflows';

export async function SecuritySolutionEdrWorkflowsServerlessSuperTest({
  getService,
}: FtrProviderContext) {
  const { createSuperTest } = getService('securitySolutionUtils');

  return {
    supertest: async (role: string = 'admin') => await createSuperTest(role),
  };
}
