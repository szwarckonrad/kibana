/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import type { CaseResponse } from '@kbn/cases-plugin/common/api';
import type { SavedQuerySOFormData } from '../../public/saved_queries/form/use_saved_query_form';
import type { LiveQueryDetailsItem } from '../../public/actions/use_live_query_details';
import type { PackSavedObject, PackItem } from '../../public/packs/types';
import type { SavedQuerySO } from '../../public/routes/saved_queries/list';
import { generateRandomStringName } from './integrations';
import { request } from './common';
import { apiPaths } from './navigation';

export const savedQueryFixture = {
  id: generateRandomStringName(1)[0],
  description: 'Test saved query description',
  ecs_mapping: { labels: { field: 'hours' } },
  interval: '3600',
  query: 'select * from uptime;',
  platform: 'linux,darwin',
};

export const loadSavedQuery = (payload: SavedQuerySOFormData = savedQueryFixture) =>
  request<{ data: SavedQuerySO }>({
    method: 'POST',
    body: {
      ...payload,
      id: payload.id ?? generateRandomStringName(1)[0],
    },
    url: apiPaths.osquery.savedQueries,
  }).then((response) => response.body.data);

export const cleanupSavedQuery = (id: string) => {
  request({ method: 'DELETE', url: apiPaths.osquery.savedQuery(id) });
};

export const loadPack = (payload: Partial<PackItem> = {}, space = 'default') =>
  request<{ data: PackSavedObject }>({
    method: 'POST',
    body: {
      ...payload,
      name: payload.name ?? generateRandomStringName(1)[0],
      shards: {},
      queries: payload.queries ?? {},
      enabled: payload.enabled || true,
    },
    url: `/s/${space}/api/osquery/packs`,
  }).then((response) => response.body.data);

export const cleanupPack = (id: string, space = 'default') => {
  request({ method: 'DELETE', url: `/s/${space}/api/osquery/packs/${id}` });
};

export const loadLiveQuery = (
  payload = {
    agent_all: true,
    query: 'select * from uptime;',
  }
) =>
  request<{
    data: LiveQueryDetailsItem & { queries: NonNullable<LiveQueryDetailsItem['queries']> };
  }>({
    method: 'POST',
    body: payload,
    url: `/api/osquery/live_queries`,
  }).then((response) => response.body.data);

export const loadRule = (payload: Partial<RuleCreateProps> = {}) =>
  request<RuleResponse>({
    method: 'POST',
    body: {
      type: 'query',
      index: [
        'apm-*-transaction*',
        'auditbeat-*',
        'endgame-*',
        'filebeat-*',
        'logs-*',
        'packetbeat-*',
        'traces-apm*',
        'winlogbeat-*',
        '-*elastic-cloud-logs-*',
      ],
      filters: [],
      language: 'kuery',
      query: '_id:*',
      author: [],
      false_positives: [],
      references: [],
      risk_score: 21,
      risk_score_mapping: [],
      severity: 'low',
      severity_mapping: [],
      threat: [],
      name: `Test rule ${generateRandomStringName(1)[0]}`,
      description: 'Test rule',
      tags: [],
      license: '',
      interval: '1m',
      from: 'now-120s',
      to: 'now',
      meta: { from: '1m', kibana_siem_app_url: 'http://localhost:5620/app/security' },
      actions: [],
      enabled: true,
      throttle: 'no_actions',
      note: '!{osquery{"query":"SELECT * FROM os_version where name=\'{{host.os.name}}\';","label":"Get processes","ecs_mapping":{"host.os.platform":{"field":"platform"}}}}\n\n!{osquery{"query":"select * from users;","label":"Get users"}}',
      response_actions: payload.response_actions ?? [],
    } as RuleCreateProps,
    url: `/api/detection_engine/rules`,
  }).then((response) => response.body);

export const cleanupRule = (id: string) => {
  request({ method: 'DELETE', url: `/api/detection_engine/rules?id=${id}` });
};

export const loadCase = (owner: string) =>
  request<CaseResponse>({
    method: 'POST',
    url: '/api/cases',
    body: {
      title: `Test ${owner} case ${generateRandomStringName(1)[0]}`,
      tags: [],
      severity: 'low',
      description: 'Test security case',
      assignees: [],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: true },
      owner,
    },
  }).then((response) => response.body);

export const cleanupCase = (id: string) => {
  request({ method: 'DELETE', url: '/api/cases', qs: { ids: JSON.stringify([id]) } });
};

export const loadSpace = () => {
  const spaceId = generateRandomStringName(1)[0];

  return request<{ id: string }>({
    method: 'POST',
    url: '/api/spaces/space',
    body: {
      id: spaceId,
      name: spaceId,
    },
    failOnStatusCode: false,
  }).then((response) => response.body);
};

export const cleanupSpace = (id: string) =>
  request({
    method: 'DELETE',
    url: `/api/spaces/space/${id}`,
  });
