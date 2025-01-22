/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import type { IEsSearchResponse } from '@kbn/search-types';

import type { BsearchSecureService } from '@kbn/test-suites-serverless/shared/services/bsearch_secure';
import type { BsearchService, SendOptions } from '@kbn/ftr-common-functional-services';

export interface SecuritySolutionServerlessBsearch extends Omit<BsearchSecureService, 'send'> {
  send: <T extends IEsSearchResponse>(options: SendOptions) => Promise<T>;
}

export interface SecuritySolutionUtilsInterface {
  getUsername: (role?: string) => Promise<string>;
  createSuperTest: (role?: string) => Promise<TestAgent<any>>;
  createBsearch: (role?: string) => Promise<SecuritySolutionServerlessBsearch>;
  createSuperTestWithUser: (user: User) => Promise<TestAgent<any>>;
  cleanUpCustomRole: () => Promise<void>;
}

interface FeaturesPrivileges {
  [featureId: string]: string[];
}

interface ElasticsearchIndices {
  names: string[];
  privileges: string[];
}

export interface Role {
  name: string;
  privileges: {
    elasticsearch: ElasticSearchPrivilege;
    kibana: KibanaPrivilege[];
  };
}
export interface ElasticSearchPrivilege {
  cluster?: string[];
  indices?: ElasticsearchIndices[];
}

export interface KibanaPrivilege {
  spaces: string[];
  base?: string[];
  feature?: FeaturesPrivileges;
}

export interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

export interface SecuritySolutionESSUtilsInterface {
  getUsername: (role?: string) => Promise<string>;
  createBsearch: (role?: string) => Promise<BsearchService>;
  createSuperTest: (role?: string, password?: string) => Promise<TestAgent<any>>;
  createSuperTestWithUser: (user: User) => Promise<TestAgent<any>>;
  cleanUpCustomRole: () => Promise<void>;
  createUser: (user: User) => Promise<any>;
  deleteUsers: (userNames: string[]) => Promise<any>;
  createRole: (name: string, role: Role) => Promise<any>;
  deleteRoles: (roleNames: string[]) => Promise<any>;
}
