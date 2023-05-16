/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

import { ExperimentalFeatures } from '@kbn/security-solution-plugin/common/experimental_features';
import { DefendWorkflowsCypressEndpointTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const defendWorkflowsCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  const config = defendWorkflowsCypressConfig.getAll();

  const enabledFeatureFlags: Array<keyof ExperimentalFeatures> = ['responseActionExecuteEnabled'];

  return {
    ...config,
    kbnTestServer: {
      ...config.kbnTestServer,
      serverArgs: [
        ...config.kbnTestServer.serverArgs,
        // set the packagerTaskInterval to 5s in order to speed up test executions when checking fleet artifacts
        '--xpack.securitySolution.packagerTaskInterval=5s',
        `--xpack.securitySolution.enableExperimental=${JSON.stringify(enabledFeatureFlags)}`,
      ],
    },
    testRunner: DefendWorkflowsCypressEndpointTestRunner,
  };
}
