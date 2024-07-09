/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointTestResources } from '../../test_suites/security_solution_endpoint/services/endpoint';
import { EndpointArtifactsTestResources } from '../../test_suites/security_solution_endpoint/services/endpoint_artifacts';
import { EndpointPolicyTestResourcesProvider } from '../../test_suites/security_solution_endpoint/services/endpoint_policy';

import { ResolverGeneratorProvider } from '../../edr_workflows/services/resolver';
import { RolesUsersProvider } from '../../edr_workflows/services/roles_users';
import { services as xPackAPIServices } from '../../../api_integration/services';

export const services = {
  ...xPackAPIServices,
  resolverGenerator: ResolverGeneratorProvider,
  endpointTestResources: EndpointTestResources,
  endpointPolicyTestResources: EndpointPolicyTestResourcesProvider,
  endpointArtifactTestResources: EndpointArtifactsTestResources,
  rolesUsersProvider: RolesUsersProvider,
};
