/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson } from '@kbn/repo-info';
import type {
  IndexName,
  IndicesAlias,
  IndicesIndexSettings,
  MappingTypeMapping,
  Name,
} from '@elastic/elasticsearch/lib/api/types';
import type { KbnClient } from '@kbn/test';
import { fetchFleetAvailableVersions } from '../utils/fetch_fleet_version';
import { createToolingLogger, wrapErrorIfNeeded } from './utils';
import { DEFAULT_ALERTS_INDEX } from '../../constants';
import { EndpointRuleAlertGenerator } from '../data_generators/endpoint_rule_alert_generator';

export interface IndexEndpointRuleAlertsOptions {
  esClient: Client;
  endpointAgentId: string;
  endpointHostname?: string;
  endpointIsolated?: boolean;
  count?: number;
  log?: ToolingLog;
  isServerless?: boolean;
  kbnClient: KbnClient;
}

export interface IndexedEndpointRuleAlerts {
  alerts: estypes.WriteResponseBase[];
  cleanup: () => Promise<DeletedIndexedEndpointRuleAlerts>;
}

export interface DeletedIndexedEndpointRuleAlerts {
  data: estypes.BulkResponse;
}

/**
 * Loads alerts for Endpoint directly into the internal index that the Endpoint Rule would have
 * written them to for a given endpoint
 * @param esClient
 * @param kbnClient
 * @param endpointAgentId
 * @param endpointHostname
 * @param endpointIsolated
 * @param count
 * @param log
 * @param isServerless
 */
export const indexEndpointRuleAlerts = async ({
  esClient,
  kbnClient,
  endpointAgentId,
  endpointHostname,
  endpointIsolated,
  count = 1,
  log = createToolingLogger(),
  isServerless,
}: IndexEndpointRuleAlertsOptions): Promise<IndexedEndpointRuleAlerts> => {
  log.verbose(`Indexing ${count} endpoint rule alerts`);

  await ensureEndpointRuleAlertsIndexExists(esClient);

  let version = kibanaPackageJson.version;
  if (isServerless) {
    version = await fetchFleetAvailableVersions(kbnClient);
  }

  const alertsGenerator = new EndpointRuleAlertGenerator();
  const indexedAlerts: estypes.IndexResponse[] = [];

  for (let n = 0; n < count; n++) {
    const alert = alertsGenerator.generate({
      agent: { id: endpointAgentId, version },
      host: { hostname: endpointHostname },
      ...(endpointIsolated ? { Endpoint: { state: { isolation: endpointIsolated } } } : {}),
    });
    const indexedAlert = await esClient.index({
      index: `${DEFAULT_ALERTS_INDEX}-default`,
      refresh: 'wait_for',
      body: alert,
    });

    indexedAlerts.push(indexedAlert);
  }

  log.verbose(`Endpoint rule alerts created:`, indexedAlerts);

  return {
    alerts: indexedAlerts,
    cleanup: deleteIndexedEndpointRuleAlerts.bind(null, esClient, indexedAlerts, log),
  };
};

export const deleteIndexedEndpointRuleAlerts = async (
  esClient: Client,
  indexedAlerts: IndexedEndpointRuleAlerts['alerts'],
  log = createToolingLogger()
): Promise<DeletedIndexedEndpointRuleAlerts> => {
  let response: estypes.BulkResponse = {
    took: 0,
    errors: false,
    items: [],
  };

  if (indexedAlerts.length) {
    log.verbose('cleaning up loaded endpoint rule alerts');

    response = await esClient.bulk({
      body: indexedAlerts.map((indexedDoc) => {
        return {
          delete: {
            _index: indexedDoc._index,
            _id: indexedDoc._id,
          },
        };
      }),
    });

    log.verbose(
      `Deleted ${indexedAlerts.length} endpoint rule alerts. Ids: [${indexedAlerts
        .map((alert) => alert._id)
        .join()}]`
    );
  }

  return { data: response };
};

const ensureEndpointRuleAlertsIndexExists = async (esClient: Client): Promise<void> => {
  const indexMappings = getAlertsIndexMappings().value;

  if (indexMappings.mappings?._meta?.kibana.version) {
    indexMappings.mappings._meta.kibana.version = kibanaPackageJson.version;
  }

  const doesIndexExist = await esClient.indices.exists({ index: indexMappings.index });

  if (doesIndexExist) {
    return;
  }
  try {
    await esClient.indices.create({
      index: indexMappings.index,
      settings: indexMappings.settings,
      mappings: indexMappings.mappings,
      aliases: indexMappings.aliases,
    });
  } catch (error) {
    // ignore error that indicate index is already created
    if (
      ['resource_already_exists_exception', 'invalid_alias_name_exception'].includes(
        error?.body?.error?.type
      )
    ) {
      return;
    }

    throw wrapErrorIfNeeded(error);
  }
};

interface IndexMappings {
  type: string;
  value: {
    index: IndexName;
    aliases: Record<Name, IndicesAlias>;
    mappings: MappingTypeMapping;
    settings: IndicesIndexSettings;
  };
}

const getAlertsIndexMappings = (): IndexMappings => {
  // Mapping below was generated by running `esArchiver()`:
  // node ./scripts/es_archiver.js save ~/tmp/es_archive_alerts .internal.alerts-security.alerts-default-*

  return {
    type: 'index',
    value: {
      aliases: {
        '.alerts-security.alerts-default': {
          is_write_index: true,
        },
        '.siem-signals-default': {
          is_write_index: false,
        },
      },
      index: '.internal.alerts-security.alerts-default-000001',
      mappings: {
        _meta: {
          kibana: {
            version: '8.6.0',
          },
          namespace: 'default',
        },
        dynamic: 'false',
        properties: {
          '@timestamp': {
            type: 'date',
          },
          agent: {
            properties: {
              build: {
                properties: {
                  original: {
                    type: 'keyword',
                  },
                },
              },
              ephemeral_id: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          client: {
            properties: {
              address: {
                type: 'keyword',
              },
              as: {
                properties: {
                  number: {
                    type: 'long',
                  },
                  organization: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              bytes: {
                type: 'long',
              },
              domain: {
                type: 'keyword',
              },
              geo: {
                properties: {
                  city_name: {
                    type: 'keyword',
                  },
                  continent_code: {
                    type: 'keyword',
                  },
                  continent_name: {
                    type: 'keyword',
                  },
                  country_iso_code: {
                    type: 'keyword',
                  },
                  country_name: {
                    type: 'keyword',
                  },
                  location: {
                    type: 'geo_point',
                  },
                  name: {
                    type: 'keyword',
                  },
                  postal_code: {
                    type: 'keyword',
                  },
                  region_iso_code: {
                    type: 'keyword',
                  },
                  region_name: {
                    type: 'keyword',
                  },
                  timezone: {
                    type: 'keyword',
                  },
                },
              },
              ip: {
                type: 'ip',
              },
              mac: {
                type: 'keyword',
              },
              nat: {
                properties: {
                  ip: {
                    type: 'ip',
                  },
                  port: {
                    type: 'long',
                  },
                },
              },
              packets: {
                type: 'long',
              },
              port: {
                type: 'long',
              },
              registered_domain: {
                type: 'keyword',
              },
              subdomain: {
                type: 'keyword',
              },
              top_level_domain: {
                type: 'keyword',
              },
              user: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          cloud: {
            properties: {
              account: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              availability_zone: {
                type: 'keyword',
              },
              instance: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              machine: {
                properties: {
                  type: {
                    type: 'keyword',
                  },
                },
              },
              origin: {
                properties: {
                  account: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  availability_zone: {
                    type: 'keyword',
                  },
                  instance: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  machine: {
                    properties: {
                      type: {
                        type: 'keyword',
                      },
                    },
                  },
                  project: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  provider: {
                    type: 'keyword',
                  },
                  region: {
                    type: 'keyword',
                  },
                  service: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              project: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              provider: {
                type: 'keyword',
              },
              region: {
                type: 'keyword',
              },
              service: {
                properties: {
                  name: {
                    type: 'keyword',
                  },
                },
              },
              target: {
                properties: {
                  account: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  availability_zone: {
                    type: 'keyword',
                  },
                  instance: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  machine: {
                    properties: {
                      type: {
                        type: 'keyword',
                      },
                    },
                  },
                  project: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  provider: {
                    type: 'keyword',
                  },
                  region: {
                    type: 'keyword',
                  },
                  service: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
            },
          },
          container: {
            properties: {
              id: {
                type: 'keyword',
              },
              image: {
                properties: {
                  name: {
                    type: 'keyword',
                  },
                  tag: {
                    type: 'keyword',
                  },
                },
              },
              labels: {
                type: 'object',
              },
              name: {
                type: 'keyword',
              },
              runtime: {
                type: 'keyword',
              },
            },
          },
          destination: {
            properties: {
              address: {
                type: 'keyword',
              },
              as: {
                properties: {
                  number: {
                    type: 'long',
                  },
                  organization: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              bytes: {
                type: 'long',
              },
              domain: {
                type: 'keyword',
              },
              geo: {
                properties: {
                  city_name: {
                    type: 'keyword',
                  },
                  continent_code: {
                    type: 'keyword',
                  },
                  continent_name: {
                    type: 'keyword',
                  },
                  country_iso_code: {
                    type: 'keyword',
                  },
                  country_name: {
                    type: 'keyword',
                  },
                  location: {
                    type: 'geo_point',
                  },
                  name: {
                    type: 'keyword',
                  },
                  postal_code: {
                    type: 'keyword',
                  },
                  region_iso_code: {
                    type: 'keyword',
                  },
                  region_name: {
                    type: 'keyword',
                  },
                  timezone: {
                    type: 'keyword',
                  },
                },
              },
              ip: {
                type: 'ip',
              },
              mac: {
                type: 'keyword',
              },
              nat: {
                properties: {
                  ip: {
                    type: 'ip',
                  },
                  port: {
                    type: 'long',
                  },
                },
              },
              packets: {
                type: 'long',
              },
              port: {
                type: 'long',
              },
              registered_domain: {
                type: 'keyword',
              },
              subdomain: {
                type: 'keyword',
              },
              top_level_domain: {
                type: 'keyword',
              },
              user: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          dll: {
            properties: {
              code_signature: {
                properties: {
                  digest_algorithm: {
                    type: 'keyword',
                  },
                  exists: {
                    type: 'boolean',
                  },
                  signing_id: {
                    type: 'keyword',
                  },
                  status: {
                    type: 'keyword',
                  },
                  subject_name: {
                    type: 'keyword',
                  },
                  team_id: {
                    type: 'keyword',
                  },
                  timestamp: {
                    type: 'date',
                  },
                  trusted: {
                    type: 'boolean',
                  },
                  valid: {
                    type: 'boolean',
                  },
                },
              },
              hash: {
                properties: {
                  md5: {
                    type: 'keyword',
                  },
                  sha1: {
                    type: 'keyword',
                  },
                  sha256: {
                    type: 'keyword',
                  },
                  sha512: {
                    type: 'keyword',
                  },
                  ssdeep: {
                    type: 'keyword',
                  },
                },
              },
              name: {
                type: 'keyword',
              },
              path: {
                type: 'keyword',
              },
              pe: {
                properties: {
                  architecture: {
                    type: 'keyword',
                  },
                  company: {
                    type: 'keyword',
                  },
                  description: {
                    type: 'keyword',
                  },
                  file_version: {
                    type: 'keyword',
                  },
                  imphash: {
                    type: 'keyword',
                  },
                  original_file_name: {
                    type: 'keyword',
                  },
                  product: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          dns: {
            properties: {
              answers: {
                properties: {
                  class: {
                    type: 'keyword',
                  },
                  data: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  ttl: {
                    type: 'long',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              header_flags: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              op_code: {
                type: 'keyword',
              },
              question: {
                properties: {
                  class: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  registered_domain: {
                    type: 'keyword',
                  },
                  subdomain: {
                    type: 'keyword',
                  },
                  top_level_domain: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              resolved_ip: {
                type: 'ip',
              },
              response_code: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
            },
          },
          ecs: {
            properties: {
              version: {
                type: 'keyword',
              },
            },
          },
          error: {
            properties: {
              code: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              message: {
                type: 'match_only_text',
              },
              stack_trace: {
                type: 'wildcard',
              },
              type: {
                type: 'keyword',
              },
            },
          },
          event: {
            properties: {
              action: {
                type: 'keyword',
              },
              agent_id_status: {
                type: 'keyword',
              },
              category: {
                type: 'keyword',
              },
              code: {
                type: 'keyword',
              },
              created: {
                type: 'date',
              },
              dataset: {
                type: 'keyword',
              },
              duration: {
                type: 'long',
              },
              end: {
                type: 'date',
              },
              hash: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              ingested: {
                type: 'date',
              },
              kind: {
                type: 'keyword',
              },
              module: {
                type: 'keyword',
              },
              original: {
                type: 'keyword',
              },
              outcome: {
                type: 'keyword',
              },
              provider: {
                type: 'keyword',
              },
              reason: {
                type: 'keyword',
              },
              reference: {
                type: 'keyword',
              },
              risk_score: {
                type: 'float',
              },
              risk_score_norm: {
                type: 'float',
              },
              sequence: {
                type: 'long',
              },
              severity: {
                type: 'long',
              },
              start: {
                type: 'date',
              },
              timezone: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              url: {
                type: 'keyword',
              },
            },
          },
          faas: {
            properties: {
              coldstart: {
                type: 'boolean',
              },
              execution: {
                type: 'keyword',
              },
              trigger: {
                properties: {
                  request_id: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
                type: 'nested',
              },
            },
          },
          file: {
            properties: {
              accessed: {
                type: 'date',
              },
              attributes: {
                type: 'keyword',
              },
              code_signature: {
                properties: {
                  digest_algorithm: {
                    type: 'keyword',
                  },
                  exists: {
                    type: 'boolean',
                  },
                  signing_id: {
                    type: 'keyword',
                  },
                  status: {
                    type: 'keyword',
                  },
                  subject_name: {
                    type: 'keyword',
                  },
                  team_id: {
                    type: 'keyword',
                  },
                  timestamp: {
                    type: 'date',
                  },
                  trusted: {
                    type: 'boolean',
                  },
                  valid: {
                    type: 'boolean',
                  },
                },
              },
              created: {
                type: 'date',
              },
              ctime: {
                type: 'date',
              },
              device: {
                type: 'keyword',
              },
              directory: {
                type: 'keyword',
              },
              drive_letter: {
                type: 'keyword',
              },
              elf: {
                properties: {
                  architecture: {
                    type: 'keyword',
                  },
                  byte_order: {
                    type: 'keyword',
                  },
                  cpu_type: {
                    type: 'keyword',
                  },
                  creation_date: {
                    type: 'date',
                  },
                  exports: {
                    type: 'flattened',
                  },
                  header: {
                    properties: {
                      abi_version: {
                        type: 'keyword',
                      },
                      class: {
                        type: 'keyword',
                      },
                      data: {
                        type: 'keyword',
                      },
                      entrypoint: {
                        type: 'long',
                      },
                      object_version: {
                        type: 'keyword',
                      },
                      os_abi: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                      version: {
                        type: 'keyword',
                      },
                    },
                  },
                  imports: {
                    type: 'flattened',
                  },
                  sections: {
                    properties: {
                      chi2: {
                        type: 'long',
                      },
                      entropy: {
                        type: 'long',
                      },
                      flags: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                      physical_offset: {
                        type: 'keyword',
                      },
                      physical_size: {
                        type: 'long',
                      },
                      type: {
                        type: 'keyword',
                      },
                      virtual_address: {
                        type: 'long',
                      },
                      virtual_size: {
                        type: 'long',
                      },
                    },
                    type: 'nested',
                  },
                  segments: {
                    properties: {
                      sections: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                    },
                    type: 'nested',
                  },
                  shared_libraries: {
                    type: 'keyword',
                  },
                  telfhash: {
                    type: 'keyword',
                  },
                },
              },
              extension: {
                type: 'keyword',
              },
              fork_name: {
                type: 'keyword',
              },
              gid: {
                type: 'keyword',
              },
              group: {
                type: 'keyword',
              },
              hash: {
                properties: {
                  md5: {
                    type: 'keyword',
                  },
                  sha1: {
                    type: 'keyword',
                  },
                  sha256: {
                    type: 'keyword',
                  },
                  sha512: {
                    type: 'keyword',
                  },
                  ssdeep: {
                    type: 'keyword',
                  },
                },
              },
              inode: {
                type: 'keyword',
              },
              mime_type: {
                type: 'keyword',
              },
              mode: {
                type: 'keyword',
              },
              mtime: {
                type: 'date',
              },
              name: {
                type: 'keyword',
              },
              owner: {
                type: 'keyword',
              },
              path: {
                type: 'keyword',
              },
              pe: {
                properties: {
                  architecture: {
                    type: 'keyword',
                  },
                  company: {
                    type: 'keyword',
                  },
                  description: {
                    type: 'keyword',
                  },
                  file_version: {
                    type: 'keyword',
                  },
                  imphash: {
                    type: 'keyword',
                  },
                  original_file_name: {
                    type: 'keyword',
                  },
                  product: {
                    type: 'keyword',
                  },
                },
              },
              size: {
                type: 'long',
              },
              target_path: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              uid: {
                type: 'keyword',
              },
              x509: {
                properties: {
                  alternative_names: {
                    type: 'keyword',
                  },
                  issuer: {
                    properties: {
                      common_name: {
                        type: 'keyword',
                      },
                      country: {
                        type: 'keyword',
                      },
                      distinguished_name: {
                        type: 'keyword',
                      },
                      locality: {
                        type: 'keyword',
                      },
                      organization: {
                        type: 'keyword',
                      },
                      organizational_unit: {
                        type: 'keyword',
                      },
                      state_or_province: {
                        type: 'keyword',
                      },
                    },
                  },
                  not_after: {
                    type: 'date',
                  },
                  not_before: {
                    type: 'date',
                  },
                  public_key_algorithm: {
                    type: 'keyword',
                  },
                  public_key_curve: {
                    type: 'keyword',
                  },
                  public_key_exponent: {
                    type: 'long',
                  },
                  public_key_size: {
                    type: 'long',
                  },
                  serial_number: {
                    type: 'keyword',
                  },
                  signature_algorithm: {
                    type: 'keyword',
                  },
                  subject: {
                    properties: {
                      common_name: {
                        type: 'keyword',
                      },
                      country: {
                        type: 'keyword',
                      },
                      distinguished_name: {
                        type: 'keyword',
                      },
                      locality: {
                        type: 'keyword',
                      },
                      organization: {
                        type: 'keyword',
                      },
                      organizational_unit: {
                        type: 'keyword',
                      },
                      state_or_province: {
                        type: 'keyword',
                      },
                    },
                  },
                  version_number: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          group: {
            properties: {
              domain: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
            },
          },
          host: {
            properties: {
              architecture: {
                type: 'keyword',
              },
              boot: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                },
              },
              cpu: {
                properties: {
                  usage: {
                    scaling_factor: 1000,
                    type: 'scaled_float',
                  },
                },
              },
              disk: {
                properties: {
                  read: {
                    properties: {
                      bytes: {
                        type: 'long',
                      },
                    },
                  },
                  write: {
                    properties: {
                      bytes: {
                        type: 'long',
                      },
                    },
                  },
                },
              },
              domain: {
                type: 'keyword',
              },
              geo: {
                properties: {
                  city_name: {
                    type: 'keyword',
                  },
                  continent_code: {
                    type: 'keyword',
                  },
                  continent_name: {
                    type: 'keyword',
                  },
                  country_iso_code: {
                    type: 'keyword',
                  },
                  country_name: {
                    type: 'keyword',
                  },
                  location: {
                    type: 'geo_point',
                  },
                  name: {
                    type: 'keyword',
                  },
                  postal_code: {
                    type: 'keyword',
                  },
                  region_iso_code: {
                    type: 'keyword',
                  },
                  region_name: {
                    type: 'keyword',
                  },
                  timezone: {
                    type: 'keyword',
                  },
                },
              },
              hostname: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              ip: {
                type: 'ip',
              },
              mac: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              network: {
                properties: {
                  egress: {
                    properties: {
                      bytes: {
                        type: 'long',
                      },
                      packets: {
                        type: 'long',
                      },
                    },
                  },
                  ingress: {
                    properties: {
                      bytes: {
                        type: 'long',
                      },
                      packets: {
                        type: 'long',
                      },
                    },
                  },
                },
              },
              os: {
                properties: {
                  family: {
                    type: 'keyword',
                  },
                  full: {
                    type: 'keyword',
                  },
                  kernel: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  platform: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              pid_ns_ino: {
                type: 'keyword',
              },
              risk: {
                properties: {
                  calculated_level: {
                    type: 'keyword',
                  },
                  calculated_score: {
                    type: 'float',
                  },
                  calculated_score_norm: {
                    type: 'float',
                  },
                  static_level: {
                    type: 'keyword',
                  },
                  static_score: {
                    type: 'float',
                  },
                  static_score_norm: {
                    type: 'float',
                  },
                },
              },
              type: {
                type: 'keyword',
              },
              uptime: {
                type: 'long',
              },
            },
          },
          http: {
            properties: {
              request: {
                properties: {
                  body: {
                    properties: {
                      bytes: {
                        type: 'long',
                      },
                      content: {
                        type: 'wildcard',
                      },
                    },
                  },
                  bytes: {
                    type: 'long',
                  },
                  id: {
                    type: 'keyword',
                  },
                  method: {
                    type: 'keyword',
                  },
                  mime_type: {
                    type: 'keyword',
                  },
                  referrer: {
                    type: 'keyword',
                  },
                },
              },
              response: {
                properties: {
                  body: {
                    properties: {
                      bytes: {
                        type: 'long',
                      },
                      content: {
                        type: 'wildcard',
                      },
                    },
                  },
                  bytes: {
                    type: 'long',
                  },
                  mime_type: {
                    type: 'keyword',
                  },
                  status_code: {
                    type: 'long',
                  },
                },
              },
              version: {
                type: 'keyword',
              },
            },
          },
          kibana: {
            properties: {
              alert: {
                properties: {
                  action_group: {
                    type: 'keyword',
                  },
                  ancestors: {
                    properties: {
                      depth: {
                        type: 'long',
                      },
                      id: {
                        type: 'keyword',
                      },
                      index: {
                        type: 'keyword',
                      },
                      rule: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                    },
                  },
                  building_block_type: {
                    type: 'keyword',
                  },
                  depth: {
                    type: 'long',
                  },
                  duration: {
                    properties: {
                      us: {
                        type: 'long',
                      },
                    },
                  },
                  end: {
                    type: 'date',
                  },
                  group: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      index: {
                        type: 'integer',
                      },
                    },
                  },
                  instance: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                    },
                  },
                  new_terms: {
                    type: 'keyword',
                  },
                  original_event: {
                    properties: {
                      action: {
                        type: 'keyword',
                      },
                      agent_id_status: {
                        type: 'keyword',
                      },
                      category: {
                        type: 'keyword',
                      },
                      code: {
                        type: 'keyword',
                      },
                      created: {
                        type: 'date',
                      },
                      dataset: {
                        type: 'keyword',
                      },
                      duration: {
                        type: 'keyword',
                      },
                      end: {
                        type: 'date',
                      },
                      hash: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      ingested: {
                        type: 'date',
                      },
                      kind: {
                        type: 'keyword',
                      },
                      module: {
                        type: 'keyword',
                      },
                      original: {
                        type: 'keyword',
                      },
                      outcome: {
                        type: 'keyword',
                      },
                      provider: {
                        type: 'keyword',
                      },
                      reason: {
                        type: 'keyword',
                      },
                      reference: {
                        type: 'keyword',
                      },
                      risk_score: {
                        type: 'float',
                      },
                      risk_score_norm: {
                        type: 'float',
                      },
                      sequence: {
                        type: 'long',
                      },
                      severity: {
                        type: 'long',
                      },
                      start: {
                        type: 'date',
                      },
                      timezone: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                      url: {
                        type: 'keyword',
                      },
                    },
                  },
                  original_time: {
                    type: 'date',
                  },
                  reason: {
                    type: 'keyword',
                  },
                  risk_score: {
                    type: 'float',
                  },
                  rule: {
                    properties: {
                      author: {
                        type: 'keyword',
                      },
                      building_block_type: {
                        type: 'keyword',
                      },
                      category: {
                        type: 'keyword',
                      },
                      consumer: {
                        type: 'keyword',
                      },
                      created_at: {
                        type: 'date',
                      },
                      created_by: {
                        type: 'keyword',
                      },
                      description: {
                        type: 'keyword',
                      },
                      enabled: {
                        type: 'keyword',
                      },
                      exceptions_list: {
                        type: 'object',
                      },
                      execution: {
                        properties: {
                          uuid: {
                            type: 'keyword',
                          },
                        },
                      },
                      false_positives: {
                        type: 'keyword',
                      },
                      from: {
                        type: 'keyword',
                      },
                      immutable: {
                        type: 'keyword',
                      },
                      interval: {
                        type: 'keyword',
                      },
                      license: {
                        type: 'keyword',
                      },
                      max_signals: {
                        type: 'long',
                      },
                      name: {
                        type: 'keyword',
                      },
                      note: {
                        type: 'keyword',
                      },
                      parameters: {
                        ignore_above: 4096,
                        type: 'flattened',
                      },
                      producer: {
                        type: 'keyword',
                      },
                      references: {
                        type: 'keyword',
                      },
                      rule_id: {
                        type: 'keyword',
                      },
                      rule_name_override: {
                        type: 'keyword',
                      },
                      rule_type_id: {
                        type: 'keyword',
                      },
                      tags: {
                        type: 'keyword',
                      },
                      threat: {
                        properties: {
                          framework: {
                            type: 'keyword',
                          },
                          tactic: {
                            properties: {
                              id: {
                                type: 'keyword',
                              },
                              name: {
                                type: 'keyword',
                              },
                              reference: {
                                type: 'keyword',
                              },
                            },
                          },
                          technique: {
                            properties: {
                              id: {
                                type: 'keyword',
                              },
                              name: {
                                type: 'keyword',
                              },
                              reference: {
                                type: 'keyword',
                              },
                              subtechnique: {
                                properties: {
                                  id: {
                                    type: 'keyword',
                                  },
                                  name: {
                                    type: 'keyword',
                                  },
                                  reference: {
                                    type: 'keyword',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      timeline_id: {
                        type: 'keyword',
                      },
                      timeline_title: {
                        type: 'keyword',
                      },
                      timestamp_override: {
                        type: 'keyword',
                      },
                      to: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                      updated_at: {
                        type: 'date',
                      },
                      updated_by: {
                        type: 'keyword',
                      },
                      uuid: {
                        type: 'keyword',
                      },
                      version: {
                        type: 'keyword',
                      },
                    },
                  },
                  severity: {
                    type: 'keyword',
                  },
                  start: {
                    type: 'date',
                  },
                  status: {
                    type: 'keyword',
                  },
                  system_status: {
                    type: 'keyword',
                  },
                  threshold_result: {
                    properties: {
                      cardinality: {
                        properties: {
                          field: {
                            type: 'keyword',
                          },
                          value: {
                            type: 'long',
                          },
                        },
                      },
                      count: {
                        type: 'long',
                      },
                      from: {
                        type: 'date',
                      },
                      terms: {
                        properties: {
                          field: {
                            type: 'keyword',
                          },
                          value: {
                            type: 'keyword',
                          },
                        },
                      },
                    },
                  },
                  time_range: {
                    format: 'epoch_millis||strict_date_optional_time',
                    type: 'date_range',
                  },
                  uuid: {
                    type: 'keyword',
                  },
                  workflow_reason: {
                    type: 'keyword',
                  },
                  workflow_status: {
                    type: 'keyword',
                  },
                  workflow_user: {
                    type: 'keyword',
                  },
                },
              },
              space_ids: {
                type: 'keyword',
              },
              version: {
                type: 'version',
              },
            },
          },
          labels: {
            type: 'object',
          },
          log: {
            properties: {
              file: {
                properties: {
                  path: {
                    type: 'keyword',
                  },
                },
              },
              level: {
                type: 'keyword',
              },
              logger: {
                type: 'keyword',
              },
              origin: {
                properties: {
                  file: {
                    properties: {
                      line: {
                        type: 'long',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  function: {
                    type: 'keyword',
                  },
                },
              },
              syslog: {
                properties: {
                  facility: {
                    properties: {
                      code: {
                        type: 'long',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  priority: {
                    type: 'long',
                  },
                  severity: {
                    properties: {
                      code: {
                        type: 'long',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
            },
          },
          message: {
            type: 'match_only_text',
          },
          network: {
            properties: {
              application: {
                type: 'keyword',
              },
              bytes: {
                type: 'long',
              },
              community_id: {
                type: 'keyword',
              },
              direction: {
                type: 'keyword',
              },
              forwarded_ip: {
                type: 'ip',
              },
              iana_number: {
                type: 'keyword',
              },
              inner: {
                properties: {
                  vlan: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              name: {
                type: 'keyword',
              },
              packets: {
                type: 'long',
              },
              protocol: {
                type: 'keyword',
              },
              transport: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              vlan: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          observer: {
            properties: {
              egress: {
                properties: {
                  interface: {
                    properties: {
                      alias: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  vlan: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  zone: {
                    type: 'keyword',
                  },
                },
              },
              geo: {
                properties: {
                  city_name: {
                    type: 'keyword',
                  },
                  continent_code: {
                    type: 'keyword',
                  },
                  continent_name: {
                    type: 'keyword',
                  },
                  country_iso_code: {
                    type: 'keyword',
                  },
                  country_name: {
                    type: 'keyword',
                  },
                  location: {
                    type: 'geo_point',
                  },
                  name: {
                    type: 'keyword',
                  },
                  postal_code: {
                    type: 'keyword',
                  },
                  region_iso_code: {
                    type: 'keyword',
                  },
                  region_name: {
                    type: 'keyword',
                  },
                  timezone: {
                    type: 'keyword',
                  },
                },
              },
              hostname: {
                type: 'keyword',
              },
              ingress: {
                properties: {
                  interface: {
                    properties: {
                      alias: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  vlan: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  zone: {
                    type: 'keyword',
                  },
                },
              },
              ip: {
                type: 'ip',
              },
              mac: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              os: {
                properties: {
                  family: {
                    type: 'keyword',
                  },
                  full: {
                    type: 'keyword',
                  },
                  kernel: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  platform: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              product: {
                type: 'keyword',
              },
              serial_number: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
              vendor: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          orchestrator: {
            properties: {
              api_version: {
                type: 'keyword',
              },
              cluster: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  url: {
                    type: 'keyword',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              namespace: {
                type: 'keyword',
              },
              organization: {
                type: 'keyword',
              },
              resource: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  ip: {
                    type: 'ip',
                  },
                  name: {
                    type: 'keyword',
                  },
                  parent: {
                    properties: {
                      type: {
                        type: 'keyword',
                      },
                    },
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              type: {
                type: 'keyword',
              },
            },
          },
          organization: {
            properties: {
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
            },
          },
          package: {
            properties: {
              architecture: {
                type: 'keyword',
              },
              build_version: {
                type: 'keyword',
              },
              checksum: {
                type: 'keyword',
              },
              description: {
                type: 'keyword',
              },
              install_scope: {
                type: 'keyword',
              },
              installed: {
                type: 'date',
              },
              license: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              path: {
                type: 'keyword',
              },
              reference: {
                type: 'keyword',
              },
              size: {
                type: 'long',
              },
              type: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          process: {
            properties: {
              args: {
                type: 'keyword',
              },
              args_count: {
                type: 'long',
              },
              code_signature: {
                properties: {
                  digest_algorithm: {
                    type: 'keyword',
                  },
                  exists: {
                    type: 'boolean',
                  },
                  signing_id: {
                    type: 'keyword',
                  },
                  status: {
                    type: 'keyword',
                  },
                  subject_name: {
                    type: 'keyword',
                  },
                  team_id: {
                    type: 'keyword',
                  },
                  timestamp: {
                    type: 'date',
                  },
                  trusted: {
                    type: 'boolean',
                  },
                  valid: {
                    type: 'boolean',
                  },
                },
              },
              command_line: {
                type: 'wildcard',
              },
              elf: {
                properties: {
                  architecture: {
                    type: 'keyword',
                  },
                  byte_order: {
                    type: 'keyword',
                  },
                  cpu_type: {
                    type: 'keyword',
                  },
                  creation_date: {
                    type: 'date',
                  },
                  exports: {
                    type: 'flattened',
                  },
                  header: {
                    properties: {
                      abi_version: {
                        type: 'keyword',
                      },
                      class: {
                        type: 'keyword',
                      },
                      data: {
                        type: 'keyword',
                      },
                      entrypoint: {
                        type: 'long',
                      },
                      object_version: {
                        type: 'keyword',
                      },
                      os_abi: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                      version: {
                        type: 'keyword',
                      },
                    },
                  },
                  imports: {
                    type: 'flattened',
                  },
                  sections: {
                    properties: {
                      chi2: {
                        type: 'long',
                      },
                      entropy: {
                        type: 'long',
                      },
                      flags: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                      physical_offset: {
                        type: 'keyword',
                      },
                      physical_size: {
                        type: 'long',
                      },
                      type: {
                        type: 'keyword',
                      },
                      virtual_address: {
                        type: 'long',
                      },
                      virtual_size: {
                        type: 'long',
                      },
                    },
                    type: 'nested',
                  },
                  segments: {
                    properties: {
                      sections: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                    },
                    type: 'nested',
                  },
                  shared_libraries: {
                    type: 'keyword',
                  },
                  telfhash: {
                    type: 'keyword',
                  },
                },
              },
              end: {
                type: 'date',
              },
              entity_id: {
                type: 'keyword',
              },
              entry_leader: {
                properties: {
                  entity_id: {
                    type: 'keyword',
                  },
                },
              },
              executable: {
                type: 'keyword',
              },
              exit_code: {
                type: 'long',
              },
              hash: {
                properties: {
                  md5: {
                    type: 'keyword',
                  },
                  sha1: {
                    type: 'keyword',
                  },
                  sha256: {
                    type: 'keyword',
                  },
                  sha512: {
                    type: 'keyword',
                  },
                  ssdeep: {
                    type: 'keyword',
                  },
                },
              },
              name: {
                type: 'keyword',
              },
              parent: {
                properties: {
                  args: {
                    type: 'keyword',
                  },
                  args_count: {
                    type: 'long',
                  },
                  code_signature: {
                    properties: {
                      digest_algorithm: {
                        type: 'keyword',
                      },
                      exists: {
                        type: 'boolean',
                      },
                      signing_id: {
                        type: 'keyword',
                      },
                      status: {
                        type: 'keyword',
                      },
                      subject_name: {
                        type: 'keyword',
                      },
                      team_id: {
                        type: 'keyword',
                      },
                      timestamp: {
                        type: 'date',
                      },
                      trusted: {
                        type: 'boolean',
                      },
                      valid: {
                        type: 'boolean',
                      },
                    },
                  },
                  command_line: {
                    type: 'wildcard',
                  },
                  elf: {
                    properties: {
                      architecture: {
                        type: 'keyword',
                      },
                      byte_order: {
                        type: 'keyword',
                      },
                      cpu_type: {
                        type: 'keyword',
                      },
                      creation_date: {
                        type: 'date',
                      },
                      exports: {
                        type: 'flattened',
                      },
                      header: {
                        properties: {
                          abi_version: {
                            type: 'keyword',
                          },
                          class: {
                            type: 'keyword',
                          },
                          data: {
                            type: 'keyword',
                          },
                          entrypoint: {
                            type: 'long',
                          },
                          object_version: {
                            type: 'keyword',
                          },
                          os_abi: {
                            type: 'keyword',
                          },
                          type: {
                            type: 'keyword',
                          },
                          version: {
                            type: 'keyword',
                          },
                        },
                      },
                      imports: {
                        type: 'flattened',
                      },
                      sections: {
                        properties: {
                          chi2: {
                            type: 'long',
                          },
                          entropy: {
                            type: 'long',
                          },
                          flags: {
                            type: 'keyword',
                          },
                          name: {
                            type: 'keyword',
                          },
                          physical_offset: {
                            type: 'keyword',
                          },
                          physical_size: {
                            type: 'long',
                          },
                          type: {
                            type: 'keyword',
                          },
                          virtual_address: {
                            type: 'long',
                          },
                          virtual_size: {
                            type: 'long',
                          },
                        },
                        type: 'nested',
                      },
                      segments: {
                        properties: {
                          sections: {
                            type: 'keyword',
                          },
                          type: {
                            type: 'keyword',
                          },
                        },
                        type: 'nested',
                      },
                      shared_libraries: {
                        type: 'keyword',
                      },
                      telfhash: {
                        type: 'keyword',
                      },
                    },
                  },
                  end: {
                    type: 'date',
                  },
                  entity_id: {
                    type: 'keyword',
                  },
                  executable: {
                    type: 'keyword',
                  },
                  exit_code: {
                    type: 'long',
                  },
                  hash: {
                    properties: {
                      md5: {
                        type: 'keyword',
                      },
                      sha1: {
                        type: 'keyword',
                      },
                      sha256: {
                        type: 'keyword',
                      },
                      sha512: {
                        type: 'keyword',
                      },
                      ssdeep: {
                        type: 'keyword',
                      },
                    },
                  },
                  name: {
                    type: 'keyword',
                  },
                  pe: {
                    properties: {
                      architecture: {
                        type: 'keyword',
                      },
                      company: {
                        type: 'keyword',
                      },
                      description: {
                        type: 'keyword',
                      },
                      file_version: {
                        type: 'keyword',
                      },
                      imphash: {
                        type: 'keyword',
                      },
                      original_file_name: {
                        type: 'keyword',
                      },
                      product: {
                        type: 'keyword',
                      },
                    },
                  },
                  pgid: {
                    type: 'long',
                  },
                  pid: {
                    type: 'long',
                  },
                  start: {
                    type: 'date',
                  },
                  thread: {
                    properties: {
                      id: {
                        type: 'long',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  title: {
                    type: 'keyword',
                  },
                  uptime: {
                    type: 'long',
                  },
                  working_directory: {
                    type: 'keyword',
                  },
                },
              },
              pe: {
                properties: {
                  architecture: {
                    type: 'keyword',
                  },
                  company: {
                    type: 'keyword',
                  },
                  description: {
                    type: 'keyword',
                  },
                  file_version: {
                    type: 'keyword',
                  },
                  imphash: {
                    type: 'keyword',
                  },
                  original_file_name: {
                    type: 'keyword',
                  },
                  product: {
                    type: 'keyword',
                  },
                },
              },
              pgid: {
                type: 'long',
              },
              pid: {
                type: 'long',
              },
              session_leader: {
                properties: {
                  entity_id: {
                    type: 'keyword',
                  },
                },
              },
              start: {
                type: 'date',
              },
              thread: {
                properties: {
                  id: {
                    type: 'long',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              title: {
                type: 'keyword',
              },
              uptime: {
                type: 'long',
              },
              working_directory: {
                type: 'keyword',
              },
            },
          },
          registry: {
            properties: {
              data: {
                properties: {
                  bytes: {
                    type: 'keyword',
                  },
                  strings: {
                    type: 'wildcard',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              hive: {
                type: 'keyword',
              },
              key: {
                type: 'keyword',
              },
              path: {
                type: 'keyword',
              },
              value: {
                type: 'keyword',
              },
            },
          },
          related: {
            properties: {
              hash: {
                type: 'keyword',
              },
              hosts: {
                type: 'keyword',
              },
              ip: {
                type: 'ip',
              },
              user: {
                type: 'keyword',
              },
            },
          },
          rule: {
            properties: {
              author: {
                type: 'keyword',
              },
              category: {
                type: 'keyword',
              },
              description: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              license: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              reference: {
                type: 'keyword',
              },
              ruleset: {
                type: 'keyword',
              },
              uuid: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          server: {
            properties: {
              address: {
                type: 'keyword',
              },
              as: {
                properties: {
                  number: {
                    type: 'long',
                  },
                  organization: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              bytes: {
                type: 'long',
              },
              domain: {
                type: 'keyword',
              },
              geo: {
                properties: {
                  city_name: {
                    type: 'keyword',
                  },
                  continent_code: {
                    type: 'keyword',
                  },
                  continent_name: {
                    type: 'keyword',
                  },
                  country_iso_code: {
                    type: 'keyword',
                  },
                  country_name: {
                    type: 'keyword',
                  },
                  location: {
                    type: 'geo_point',
                  },
                  name: {
                    type: 'keyword',
                  },
                  postal_code: {
                    type: 'keyword',
                  },
                  region_iso_code: {
                    type: 'keyword',
                  },
                  region_name: {
                    type: 'keyword',
                  },
                  timezone: {
                    type: 'keyword',
                  },
                },
              },
              ip: {
                type: 'ip',
              },
              mac: {
                type: 'keyword',
              },
              nat: {
                properties: {
                  ip: {
                    type: 'ip',
                  },
                  port: {
                    type: 'long',
                  },
                },
              },
              packets: {
                type: 'long',
              },
              port: {
                type: 'long',
              },
              registered_domain: {
                type: 'keyword',
              },
              subdomain: {
                type: 'keyword',
              },
              top_level_domain: {
                type: 'keyword',
              },
              user: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          service: {
            properties: {
              address: {
                type: 'keyword',
              },
              environment: {
                type: 'keyword',
              },
              ephemeral_id: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              node: {
                properties: {
                  name: {
                    type: 'keyword',
                  },
                },
              },
              origin: {
                properties: {
                  address: {
                    type: 'keyword',
                  },
                  environment: {
                    type: 'keyword',
                  },
                  ephemeral_id: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  node: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  state: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              state: {
                type: 'keyword',
              },
              target: {
                properties: {
                  address: {
                    type: 'keyword',
                  },
                  environment: {
                    type: 'keyword',
                  },
                  ephemeral_id: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  node: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  state: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              type: {
                type: 'keyword',
              },
              version: {
                type: 'keyword',
              },
            },
          },
          signal: {
            properties: {
              ancestors: {
                properties: {
                  depth: {
                    path: 'kibana.alert.ancestors.depth',
                    type: 'alias',
                  },
                  id: {
                    path: 'kibana.alert.ancestors.id',
                    type: 'alias',
                  },
                  index: {
                    path: 'kibana.alert.ancestors.index',
                    type: 'alias',
                  },
                  type: {
                    path: 'kibana.alert.ancestors.type',
                    type: 'alias',
                  },
                },
              },
              depth: {
                path: 'kibana.alert.depth',
                type: 'alias',
              },
              group: {
                properties: {
                  id: {
                    path: 'kibana.alert.group.id',
                    type: 'alias',
                  },
                  index: {
                    path: 'kibana.alert.group.index',
                    type: 'alias',
                  },
                },
              },
              original_event: {
                properties: {
                  action: {
                    path: 'kibana.alert.original_event.action',
                    type: 'alias',
                  },
                  category: {
                    path: 'kibana.alert.original_event.category',
                    type: 'alias',
                  },
                  code: {
                    path: 'kibana.alert.original_event.code',
                    type: 'alias',
                  },
                  created: {
                    path: 'kibana.alert.original_event.created',
                    type: 'alias',
                  },
                  dataset: {
                    path: 'kibana.alert.original_event.dataset',
                    type: 'alias',
                  },
                  duration: {
                    path: 'kibana.alert.original_event.duration',
                    type: 'alias',
                  },
                  end: {
                    path: 'kibana.alert.original_event.end',
                    type: 'alias',
                  },
                  hash: {
                    path: 'kibana.alert.original_event.hash',
                    type: 'alias',
                  },
                  id: {
                    path: 'kibana.alert.original_event.id',
                    type: 'alias',
                  },
                  kind: {
                    path: 'kibana.alert.original_event.kind',
                    type: 'alias',
                  },
                  module: {
                    path: 'kibana.alert.original_event.module',
                    type: 'alias',
                  },
                  outcome: {
                    path: 'kibana.alert.original_event.outcome',
                    type: 'alias',
                  },
                  provider: {
                    path: 'kibana.alert.original_event.provider',
                    type: 'alias',
                  },
                  reason: {
                    path: 'kibana.alert.original_event.reason',
                    type: 'alias',
                  },
                  risk_score: {
                    path: 'kibana.alert.original_event.risk_score',
                    type: 'alias',
                  },
                  risk_score_norm: {
                    path: 'kibana.alert.original_event.risk_score_norm',
                    type: 'alias',
                  },
                  sequence: {
                    path: 'kibana.alert.original_event.sequence',
                    type: 'alias',
                  },
                  severity: {
                    path: 'kibana.alert.original_event.severity',
                    type: 'alias',
                  },
                  start: {
                    path: 'kibana.alert.original_event.start',
                    type: 'alias',
                  },
                  timezone: {
                    path: 'kibana.alert.original_event.timezone',
                    type: 'alias',
                  },
                  type: {
                    path: 'kibana.alert.original_event.type',
                    type: 'alias',
                  },
                },
              },
              original_time: {
                path: 'kibana.alert.original_time',
                type: 'alias',
              },
              reason: {
                path: 'kibana.alert.reason',
                type: 'alias',
              },
              rule: {
                properties: {
                  author: {
                    path: 'kibana.alert.rule.author',
                    type: 'alias',
                  },
                  building_block_type: {
                    path: 'kibana.alert.building_block_type',
                    type: 'alias',
                  },
                  created_at: {
                    path: 'kibana.alert.rule.created_at',
                    type: 'alias',
                  },
                  created_by: {
                    path: 'kibana.alert.rule.created_by',
                    type: 'alias',
                  },
                  description: {
                    path: 'kibana.alert.rule.description',
                    type: 'alias',
                  },
                  enabled: {
                    path: 'kibana.alert.rule.enabled',
                    type: 'alias',
                  },
                  false_positives: {
                    path: 'kibana.alert.rule.false_positives',
                    type: 'alias',
                  },
                  from: {
                    path: 'kibana.alert.rule.from',
                    type: 'alias',
                  },
                  id: {
                    path: 'kibana.alert.rule.uuid',
                    type: 'alias',
                  },
                  immutable: {
                    path: 'kibana.alert.rule.immutable',
                    type: 'alias',
                  },
                  interval: {
                    path: 'kibana.alert.rule.interval',
                    type: 'alias',
                  },
                  license: {
                    path: 'kibana.alert.rule.license',
                    type: 'alias',
                  },
                  max_signals: {
                    path: 'kibana.alert.rule.max_signals',
                    type: 'alias',
                  },
                  name: {
                    path: 'kibana.alert.rule.name',
                    type: 'alias',
                  },
                  note: {
                    path: 'kibana.alert.rule.note',
                    type: 'alias',
                  },
                  references: {
                    path: 'kibana.alert.rule.references',
                    type: 'alias',
                  },
                  risk_score: {
                    path: 'kibana.alert.risk_score',
                    type: 'alias',
                  },
                  rule_id: {
                    path: 'kibana.alert.rule.rule_id',
                    type: 'alias',
                  },
                  rule_name_override: {
                    path: 'kibana.alert.rule.rule_name_override',
                    type: 'alias',
                  },
                  severity: {
                    path: 'kibana.alert.severity',
                    type: 'alias',
                  },
                  tags: {
                    path: 'kibana.alert.rule.tags',
                    type: 'alias',
                  },
                  threat: {
                    properties: {
                      framework: {
                        path: 'kibana.alert.rule.threat.framework',
                        type: 'alias',
                      },
                      tactic: {
                        properties: {
                          id: {
                            path: 'kibana.alert.rule.threat.tactic.id',
                            type: 'alias',
                          },
                          name: {
                            path: 'kibana.alert.rule.threat.tactic.name',
                            type: 'alias',
                          },
                          reference: {
                            path: 'kibana.alert.rule.threat.tactic.reference',
                            type: 'alias',
                          },
                        },
                      },
                      technique: {
                        properties: {
                          id: {
                            path: 'kibana.alert.rule.threat.technique.id',
                            type: 'alias',
                          },
                          name: {
                            path: 'kibana.alert.rule.threat.technique.name',
                            type: 'alias',
                          },
                          reference: {
                            path: 'kibana.alert.rule.threat.technique.reference',
                            type: 'alias',
                          },
                          subtechnique: {
                            properties: {
                              id: {
                                path: 'kibana.alert.rule.threat.technique.subtechnique.id',
                                type: 'alias',
                              },
                              name: {
                                path: 'kibana.alert.rule.threat.technique.subtechnique.name',
                                type: 'alias',
                              },
                              reference: {
                                path: 'kibana.alert.rule.threat.technique.subtechnique.reference',
                                type: 'alias',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  timeline_id: {
                    path: 'kibana.alert.rule.timeline_id',
                    type: 'alias',
                  },
                  timeline_title: {
                    path: 'kibana.alert.rule.timeline_title',
                    type: 'alias',
                  },
                  timestamp_override: {
                    path: 'kibana.alert.rule.timestamp_override',
                    type: 'alias',
                  },
                  to: {
                    path: 'kibana.alert.rule.to',
                    type: 'alias',
                  },
                  type: {
                    path: 'kibana.alert.rule.type',
                    type: 'alias',
                  },
                  updated_at: {
                    path: 'kibana.alert.rule.updated_at',
                    type: 'alias',
                  },
                  updated_by: {
                    path: 'kibana.alert.rule.updated_by',
                    type: 'alias',
                  },
                  version: {
                    path: 'kibana.alert.rule.version',
                    type: 'alias',
                  },
                },
              },
              status: {
                path: 'kibana.alert.workflow_status',
                type: 'alias',
              },
              threshold_result: {
                properties: {
                  cardinality: {
                    properties: {
                      field: {
                        path: 'kibana.alert.threshold_result.cardinality.field',
                        type: 'alias',
                      },
                      value: {
                        path: 'kibana.alert.threshold_result.cardinality.value',
                        type: 'alias',
                      },
                    },
                  },
                  count: {
                    path: 'kibana.alert.threshold_result.count',
                    type: 'alias',
                  },
                  from: {
                    path: 'kibana.alert.threshold_result.from',
                    type: 'alias',
                  },
                  terms: {
                    properties: {
                      field: {
                        path: 'kibana.alert.threshold_result.terms.field',
                        type: 'alias',
                      },
                      value: {
                        path: 'kibana.alert.threshold_result.terms.value',
                        type: 'alias',
                      },
                    },
                  },
                },
              },
            },
          },
          source: {
            properties: {
              address: {
                type: 'keyword',
              },
              as: {
                properties: {
                  number: {
                    type: 'long',
                  },
                  organization: {
                    properties: {
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              bytes: {
                type: 'long',
              },
              domain: {
                type: 'keyword',
              },
              geo: {
                properties: {
                  city_name: {
                    type: 'keyword',
                  },
                  continent_code: {
                    type: 'keyword',
                  },
                  continent_name: {
                    type: 'keyword',
                  },
                  country_iso_code: {
                    type: 'keyword',
                  },
                  country_name: {
                    type: 'keyword',
                  },
                  location: {
                    type: 'geo_point',
                  },
                  name: {
                    type: 'keyword',
                  },
                  postal_code: {
                    type: 'keyword',
                  },
                  region_iso_code: {
                    type: 'keyword',
                  },
                  region_name: {
                    type: 'keyword',
                  },
                  timezone: {
                    type: 'keyword',
                  },
                },
              },
              ip: {
                type: 'ip',
              },
              mac: {
                type: 'keyword',
              },
              nat: {
                properties: {
                  ip: {
                    type: 'ip',
                  },
                  port: {
                    type: 'long',
                  },
                },
              },
              packets: {
                type: 'long',
              },
              port: {
                type: 'long',
              },
              registered_domain: {
                type: 'keyword',
              },
              subdomain: {
                type: 'keyword',
              },
              top_level_domain: {
                type: 'keyword',
              },
              user: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          span: {
            properties: {
              id: {
                type: 'keyword',
              },
            },
          },
          tags: {
            type: 'keyword',
          },
          threat: {
            properties: {
              enrichments: {
                properties: {
                  indicator: {
                    properties: {
                      as: {
                        properties: {
                          number: {
                            type: 'long',
                          },
                          organization: {
                            properties: {
                              name: {
                                type: 'keyword',
                              },
                            },
                          },
                        },
                      },
                      confidence: {
                        type: 'keyword',
                      },
                      description: {
                        type: 'keyword',
                      },
                      email: {
                        properties: {
                          address: {
                            type: 'keyword',
                          },
                        },
                      },
                      file: {
                        properties: {
                          accessed: {
                            type: 'date',
                          },
                          attributes: {
                            type: 'keyword',
                          },
                          code_signature: {
                            properties: {
                              digest_algorithm: {
                                type: 'keyword',
                              },
                              exists: {
                                type: 'boolean',
                              },
                              signing_id: {
                                type: 'keyword',
                              },
                              status: {
                                type: 'keyword',
                              },
                              subject_name: {
                                type: 'keyword',
                              },
                              team_id: {
                                type: 'keyword',
                              },
                              timestamp: {
                                type: 'date',
                              },
                              trusted: {
                                type: 'boolean',
                              },
                              valid: {
                                type: 'boolean',
                              },
                            },
                          },
                          created: {
                            type: 'date',
                          },
                          ctime: {
                            type: 'date',
                          },
                          device: {
                            type: 'keyword',
                          },
                          directory: {
                            type: 'keyword',
                          },
                          drive_letter: {
                            type: 'keyword',
                          },
                          elf: {
                            properties: {
                              architecture: {
                                type: 'keyword',
                              },
                              byte_order: {
                                type: 'keyword',
                              },
                              cpu_type: {
                                type: 'keyword',
                              },
                              creation_date: {
                                type: 'date',
                              },
                              exports: {
                                type: 'flattened',
                              },
                              header: {
                                properties: {
                                  abi_version: {
                                    type: 'keyword',
                                  },
                                  class: {
                                    type: 'keyword',
                                  },
                                  data: {
                                    type: 'keyword',
                                  },
                                  entrypoint: {
                                    type: 'long',
                                  },
                                  object_version: {
                                    type: 'keyword',
                                  },
                                  os_abi: {
                                    type: 'keyword',
                                  },
                                  type: {
                                    type: 'keyword',
                                  },
                                  version: {
                                    type: 'keyword',
                                  },
                                },
                              },
                              imports: {
                                type: 'flattened',
                              },
                              sections: {
                                properties: {
                                  chi2: {
                                    type: 'long',
                                  },
                                  entropy: {
                                    type: 'long',
                                  },
                                  flags: {
                                    type: 'keyword',
                                  },
                                  name: {
                                    type: 'keyword',
                                  },
                                  physical_offset: {
                                    type: 'keyword',
                                  },
                                  physical_size: {
                                    type: 'long',
                                  },
                                  type: {
                                    type: 'keyword',
                                  },
                                  virtual_address: {
                                    type: 'long',
                                  },
                                  virtual_size: {
                                    type: 'long',
                                  },
                                },
                                type: 'nested',
                              },
                              segments: {
                                properties: {
                                  sections: {
                                    type: 'keyword',
                                  },
                                  type: {
                                    type: 'keyword',
                                  },
                                },
                                type: 'nested',
                              },
                              shared_libraries: {
                                type: 'keyword',
                              },
                              telfhash: {
                                type: 'keyword',
                              },
                            },
                          },
                          extension: {
                            type: 'keyword',
                          },
                          fork_name: {
                            type: 'keyword',
                          },
                          gid: {
                            type: 'keyword',
                          },
                          group: {
                            type: 'keyword',
                          },
                          hash: {
                            properties: {
                              md5: {
                                type: 'keyword',
                              },
                              sha1: {
                                type: 'keyword',
                              },
                              sha256: {
                                type: 'keyword',
                              },
                              sha512: {
                                type: 'keyword',
                              },
                              ssdeep: {
                                type: 'keyword',
                              },
                            },
                          },
                          inode: {
                            type: 'keyword',
                          },
                          mime_type: {
                            type: 'keyword',
                          },
                          mode: {
                            type: 'keyword',
                          },
                          mtime: {
                            type: 'date',
                          },
                          name: {
                            type: 'keyword',
                          },
                          owner: {
                            type: 'keyword',
                          },
                          path: {
                            type: 'keyword',
                          },
                          pe: {
                            properties: {
                              architecture: {
                                type: 'keyword',
                              },
                              company: {
                                type: 'keyword',
                              },
                              description: {
                                type: 'keyword',
                              },
                              file_version: {
                                type: 'keyword',
                              },
                              imphash: {
                                type: 'keyword',
                              },
                              original_file_name: {
                                type: 'keyword',
                              },
                              product: {
                                type: 'keyword',
                              },
                            },
                          },
                          size: {
                            type: 'long',
                          },
                          target_path: {
                            type: 'keyword',
                          },
                          type: {
                            type: 'keyword',
                          },
                          uid: {
                            type: 'keyword',
                          },
                          x509: {
                            properties: {
                              alternative_names: {
                                type: 'keyword',
                              },
                              issuer: {
                                properties: {
                                  common_name: {
                                    type: 'keyword',
                                  },
                                  country: {
                                    type: 'keyword',
                                  },
                                  distinguished_name: {
                                    type: 'keyword',
                                  },
                                  locality: {
                                    type: 'keyword',
                                  },
                                  organization: {
                                    type: 'keyword',
                                  },
                                  organizational_unit: {
                                    type: 'keyword',
                                  },
                                  state_or_province: {
                                    type: 'keyword',
                                  },
                                },
                              },
                              not_after: {
                                type: 'date',
                              },
                              not_before: {
                                type: 'date',
                              },
                              public_key_algorithm: {
                                type: 'keyword',
                              },
                              public_key_curve: {
                                type: 'keyword',
                              },
                              public_key_exponent: {
                                type: 'long',
                              },
                              public_key_size: {
                                type: 'long',
                              },
                              serial_number: {
                                type: 'keyword',
                              },
                              signature_algorithm: {
                                type: 'keyword',
                              },
                              subject: {
                                properties: {
                                  common_name: {
                                    type: 'keyword',
                                  },
                                  country: {
                                    type: 'keyword',
                                  },
                                  distinguished_name: {
                                    type: 'keyword',
                                  },
                                  locality: {
                                    type: 'keyword',
                                  },
                                  organization: {
                                    type: 'keyword',
                                  },
                                  organizational_unit: {
                                    type: 'keyword',
                                  },
                                  state_or_province: {
                                    type: 'keyword',
                                  },
                                },
                              },
                              version_number: {
                                type: 'keyword',
                              },
                            },
                          },
                        },
                      },
                      first_seen: {
                        type: 'date',
                      },
                      geo: {
                        properties: {
                          city_name: {
                            type: 'keyword',
                          },
                          continent_code: {
                            type: 'keyword',
                          },
                          continent_name: {
                            type: 'keyword',
                          },
                          country_iso_code: {
                            type: 'keyword',
                          },
                          country_name: {
                            type: 'keyword',
                          },
                          location: {
                            type: 'geo_point',
                          },
                          name: {
                            type: 'keyword',
                          },
                          postal_code: {
                            type: 'keyword',
                          },
                          region_iso_code: {
                            type: 'keyword',
                          },
                          region_name: {
                            type: 'keyword',
                          },
                          timezone: {
                            type: 'keyword',
                          },
                        },
                      },
                      ip: {
                        type: 'ip',
                      },
                      last_seen: {
                        type: 'date',
                      },
                      marking: {
                        properties: {
                          tlp: {
                            type: 'keyword',
                          },
                        },
                      },
                      modified_at: {
                        type: 'date',
                      },
                      port: {
                        type: 'long',
                      },
                      provider: {
                        type: 'keyword',
                      },
                      reference: {
                        type: 'keyword',
                      },
                      registry: {
                        properties: {
                          data: {
                            properties: {
                              bytes: {
                                type: 'keyword',
                              },
                              strings: {
                                type: 'wildcard',
                              },
                              type: {
                                type: 'keyword',
                              },
                            },
                          },
                          hive: {
                            type: 'keyword',
                          },
                          key: {
                            type: 'keyword',
                          },
                          path: {
                            type: 'keyword',
                          },
                          value: {
                            type: 'keyword',
                          },
                        },
                      },
                      scanner_stats: {
                        type: 'long',
                      },
                      sightings: {
                        type: 'long',
                      },
                      type: {
                        type: 'keyword',
                      },
                      url: {
                        properties: {
                          domain: {
                            type: 'keyword',
                          },
                          extension: {
                            type: 'keyword',
                          },
                          fragment: {
                            type: 'keyword',
                          },
                          full: {
                            type: 'wildcard',
                          },
                          original: {
                            type: 'wildcard',
                          },
                          password: {
                            type: 'keyword',
                          },
                          path: {
                            type: 'wildcard',
                          },
                          port: {
                            type: 'long',
                          },
                          query: {
                            type: 'keyword',
                          },
                          registered_domain: {
                            type: 'keyword',
                          },
                          scheme: {
                            type: 'keyword',
                          },
                          subdomain: {
                            type: 'keyword',
                          },
                          top_level_domain: {
                            type: 'keyword',
                          },
                          username: {
                            type: 'keyword',
                          },
                        },
                      },
                      x509: {
                        properties: {
                          alternative_names: {
                            type: 'keyword',
                          },
                          issuer: {
                            properties: {
                              common_name: {
                                type: 'keyword',
                              },
                              country: {
                                type: 'keyword',
                              },
                              distinguished_name: {
                                type: 'keyword',
                              },
                              locality: {
                                type: 'keyword',
                              },
                              organization: {
                                type: 'keyword',
                              },
                              organizational_unit: {
                                type: 'keyword',
                              },
                              state_or_province: {
                                type: 'keyword',
                              },
                            },
                          },
                          not_after: {
                            type: 'date',
                          },
                          not_before: {
                            type: 'date',
                          },
                          public_key_algorithm: {
                            type: 'keyword',
                          },
                          public_key_curve: {
                            type: 'keyword',
                          },
                          public_key_exponent: {
                            type: 'long',
                          },
                          public_key_size: {
                            type: 'long',
                          },
                          serial_number: {
                            type: 'keyword',
                          },
                          signature_algorithm: {
                            type: 'keyword',
                          },
                          subject: {
                            properties: {
                              common_name: {
                                type: 'keyword',
                              },
                              country: {
                                type: 'keyword',
                              },
                              distinguished_name: {
                                type: 'keyword',
                              },
                              locality: {
                                type: 'keyword',
                              },
                              organization: {
                                type: 'keyword',
                              },
                              organizational_unit: {
                                type: 'keyword',
                              },
                              state_or_province: {
                                type: 'keyword',
                              },
                            },
                          },
                          version_number: {
                            type: 'keyword',
                          },
                        },
                      },
                    },
                  },
                  matched: {
                    properties: {
                      atomic: {
                        type: 'keyword',
                      },
                      field: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      index: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                    },
                  },
                },
                type: 'nested',
              },
              framework: {
                type: 'keyword',
              },
              group: {
                properties: {
                  alias: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  reference: {
                    type: 'keyword',
                  },
                },
              },
              indicator: {
                properties: {
                  as: {
                    properties: {
                      number: {
                        type: 'long',
                      },
                      organization: {
                        properties: {
                          name: {
                            type: 'keyword',
                          },
                        },
                      },
                    },
                  },
                  confidence: {
                    type: 'keyword',
                  },
                  description: {
                    type: 'keyword',
                  },
                  email: {
                    properties: {
                      address: {
                        type: 'keyword',
                      },
                    },
                  },
                  file: {
                    properties: {
                      accessed: {
                        type: 'date',
                      },
                      attributes: {
                        type: 'keyword',
                      },
                      code_signature: {
                        properties: {
                          digest_algorithm: {
                            type: 'keyword',
                          },
                          exists: {
                            type: 'boolean',
                          },
                          signing_id: {
                            type: 'keyword',
                          },
                          status: {
                            type: 'keyword',
                          },
                          subject_name: {
                            type: 'keyword',
                          },
                          team_id: {
                            type: 'keyword',
                          },
                          timestamp: {
                            type: 'date',
                          },
                          trusted: {
                            type: 'boolean',
                          },
                          valid: {
                            type: 'boolean',
                          },
                        },
                      },
                      created: {
                        type: 'date',
                      },
                      ctime: {
                        type: 'date',
                      },
                      device: {
                        type: 'keyword',
                      },
                      directory: {
                        type: 'keyword',
                      },
                      drive_letter: {
                        type: 'keyword',
                      },
                      elf: {
                        properties: {
                          architecture: {
                            type: 'keyword',
                          },
                          byte_order: {
                            type: 'keyword',
                          },
                          cpu_type: {
                            type: 'keyword',
                          },
                          creation_date: {
                            type: 'date',
                          },
                          exports: {
                            type: 'flattened',
                          },
                          header: {
                            properties: {
                              abi_version: {
                                type: 'keyword',
                              },
                              class: {
                                type: 'keyword',
                              },
                              data: {
                                type: 'keyword',
                              },
                              entrypoint: {
                                type: 'long',
                              },
                              object_version: {
                                type: 'keyword',
                              },
                              os_abi: {
                                type: 'keyword',
                              },
                              type: {
                                type: 'keyword',
                              },
                              version: {
                                type: 'keyword',
                              },
                            },
                          },
                          imports: {
                            type: 'flattened',
                          },
                          sections: {
                            properties: {
                              chi2: {
                                type: 'long',
                              },
                              entropy: {
                                type: 'long',
                              },
                              flags: {
                                type: 'keyword',
                              },
                              name: {
                                type: 'keyword',
                              },
                              physical_offset: {
                                type: 'keyword',
                              },
                              physical_size: {
                                type: 'long',
                              },
                              type: {
                                type: 'keyword',
                              },
                              virtual_address: {
                                type: 'long',
                              },
                              virtual_size: {
                                type: 'long',
                              },
                            },
                            type: 'nested',
                          },
                          segments: {
                            properties: {
                              sections: {
                                type: 'keyword',
                              },
                              type: {
                                type: 'keyword',
                              },
                            },
                            type: 'nested',
                          },
                          shared_libraries: {
                            type: 'keyword',
                          },
                          telfhash: {
                            type: 'keyword',
                          },
                        },
                      },
                      extension: {
                        type: 'keyword',
                      },
                      fork_name: {
                        type: 'keyword',
                      },
                      gid: {
                        type: 'keyword',
                      },
                      group: {
                        type: 'keyword',
                      },
                      hash: {
                        properties: {
                          md5: {
                            type: 'keyword',
                          },
                          sha1: {
                            type: 'keyword',
                          },
                          sha256: {
                            type: 'keyword',
                          },
                          sha512: {
                            type: 'keyword',
                          },
                          ssdeep: {
                            type: 'keyword',
                          },
                        },
                      },
                      inode: {
                        type: 'keyword',
                      },
                      mime_type: {
                        type: 'keyword',
                      },
                      mode: {
                        type: 'keyword',
                      },
                      mtime: {
                        type: 'date',
                      },
                      name: {
                        type: 'keyword',
                      },
                      owner: {
                        type: 'keyword',
                      },
                      path: {
                        type: 'keyword',
                      },
                      pe: {
                        properties: {
                          architecture: {
                            type: 'keyword',
                          },
                          company: {
                            type: 'keyword',
                          },
                          description: {
                            type: 'keyword',
                          },
                          file_version: {
                            type: 'keyword',
                          },
                          imphash: {
                            type: 'keyword',
                          },
                          original_file_name: {
                            type: 'keyword',
                          },
                          product: {
                            type: 'keyword',
                          },
                        },
                      },
                      size: {
                        type: 'long',
                      },
                      target_path: {
                        type: 'keyword',
                      },
                      type: {
                        type: 'keyword',
                      },
                      uid: {
                        type: 'keyword',
                      },
                      x509: {
                        properties: {
                          alternative_names: {
                            type: 'keyword',
                          },
                          issuer: {
                            properties: {
                              common_name: {
                                type: 'keyword',
                              },
                              country: {
                                type: 'keyword',
                              },
                              distinguished_name: {
                                type: 'keyword',
                              },
                              locality: {
                                type: 'keyword',
                              },
                              organization: {
                                type: 'keyword',
                              },
                              organizational_unit: {
                                type: 'keyword',
                              },
                              state_or_province: {
                                type: 'keyword',
                              },
                            },
                          },
                          not_after: {
                            type: 'date',
                          },
                          not_before: {
                            type: 'date',
                          },
                          public_key_algorithm: {
                            type: 'keyword',
                          },
                          public_key_curve: {
                            type: 'keyword',
                          },
                          public_key_exponent: {
                            type: 'long',
                          },
                          public_key_size: {
                            type: 'long',
                          },
                          serial_number: {
                            type: 'keyword',
                          },
                          signature_algorithm: {
                            type: 'keyword',
                          },
                          subject: {
                            properties: {
                              common_name: {
                                type: 'keyword',
                              },
                              country: {
                                type: 'keyword',
                              },
                              distinguished_name: {
                                type: 'keyword',
                              },
                              locality: {
                                type: 'keyword',
                              },
                              organization: {
                                type: 'keyword',
                              },
                              organizational_unit: {
                                type: 'keyword',
                              },
                              state_or_province: {
                                type: 'keyword',
                              },
                            },
                          },
                          version_number: {
                            type: 'keyword',
                          },
                        },
                      },
                    },
                  },
                  first_seen: {
                    type: 'date',
                  },
                  geo: {
                    properties: {
                      city_name: {
                        type: 'keyword',
                      },
                      continent_code: {
                        type: 'keyword',
                      },
                      continent_name: {
                        type: 'keyword',
                      },
                      country_iso_code: {
                        type: 'keyword',
                      },
                      country_name: {
                        type: 'keyword',
                      },
                      location: {
                        type: 'geo_point',
                      },
                      name: {
                        type: 'keyword',
                      },
                      postal_code: {
                        type: 'keyword',
                      },
                      region_iso_code: {
                        type: 'keyword',
                      },
                      region_name: {
                        type: 'keyword',
                      },
                      timezone: {
                        type: 'keyword',
                      },
                    },
                  },
                  ip: {
                    type: 'ip',
                  },
                  last_seen: {
                    type: 'date',
                  },
                  marking: {
                    properties: {
                      tlp: {
                        type: 'keyword',
                      },
                    },
                  },
                  modified_at: {
                    type: 'date',
                  },
                  port: {
                    type: 'long',
                  },
                  provider: {
                    type: 'keyword',
                  },
                  reference: {
                    type: 'keyword',
                  },
                  registry: {
                    properties: {
                      data: {
                        properties: {
                          bytes: {
                            type: 'keyword',
                          },
                          strings: {
                            type: 'wildcard',
                          },
                          type: {
                            type: 'keyword',
                          },
                        },
                      },
                      hive: {
                        type: 'keyword',
                      },
                      key: {
                        type: 'keyword',
                      },
                      path: {
                        type: 'keyword',
                      },
                      value: {
                        type: 'keyword',
                      },
                    },
                  },
                  scanner_stats: {
                    type: 'long',
                  },
                  sightings: {
                    type: 'long',
                  },
                  type: {
                    type: 'keyword',
                  },
                  url: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      extension: {
                        type: 'keyword',
                      },
                      fragment: {
                        type: 'keyword',
                      },
                      full: {
                        type: 'wildcard',
                      },
                      original: {
                        type: 'wildcard',
                      },
                      password: {
                        type: 'keyword',
                      },
                      path: {
                        type: 'wildcard',
                      },
                      port: {
                        type: 'long',
                      },
                      query: {
                        type: 'keyword',
                      },
                      registered_domain: {
                        type: 'keyword',
                      },
                      scheme: {
                        type: 'keyword',
                      },
                      subdomain: {
                        type: 'keyword',
                      },
                      top_level_domain: {
                        type: 'keyword',
                      },
                      username: {
                        type: 'keyword',
                      },
                    },
                  },
                  x509: {
                    properties: {
                      alternative_names: {
                        type: 'keyword',
                      },
                      issuer: {
                        properties: {
                          common_name: {
                            type: 'keyword',
                          },
                          country: {
                            type: 'keyword',
                          },
                          distinguished_name: {
                            type: 'keyword',
                          },
                          locality: {
                            type: 'keyword',
                          },
                          organization: {
                            type: 'keyword',
                          },
                          organizational_unit: {
                            type: 'keyword',
                          },
                          state_or_province: {
                            type: 'keyword',
                          },
                        },
                      },
                      not_after: {
                        type: 'date',
                      },
                      not_before: {
                        type: 'date',
                      },
                      public_key_algorithm: {
                        type: 'keyword',
                      },
                      public_key_curve: {
                        type: 'keyword',
                      },
                      public_key_exponent: {
                        type: 'long',
                      },
                      public_key_size: {
                        type: 'long',
                      },
                      serial_number: {
                        type: 'keyword',
                      },
                      signature_algorithm: {
                        type: 'keyword',
                      },
                      subject: {
                        properties: {
                          common_name: {
                            type: 'keyword',
                          },
                          country: {
                            type: 'keyword',
                          },
                          distinguished_name: {
                            type: 'keyword',
                          },
                          locality: {
                            type: 'keyword',
                          },
                          organization: {
                            type: 'keyword',
                          },
                          organizational_unit: {
                            type: 'keyword',
                          },
                          state_or_province: {
                            type: 'keyword',
                          },
                        },
                      },
                      version_number: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              software: {
                properties: {
                  alias: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  platforms: {
                    type: 'keyword',
                  },
                  reference: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                },
              },
              tactic: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  reference: {
                    type: 'keyword',
                  },
                },
              },
              technique: {
                properties: {
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  reference: {
                    type: 'keyword',
                  },
                  subtechnique: {
                    properties: {
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                      reference: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
            },
          },
          tls: {
            properties: {
              cipher: {
                type: 'keyword',
              },
              client: {
                properties: {
                  certificate: {
                    type: 'keyword',
                  },
                  certificate_chain: {
                    type: 'keyword',
                  },
                  hash: {
                    properties: {
                      md5: {
                        type: 'keyword',
                      },
                      sha1: {
                        type: 'keyword',
                      },
                      sha256: {
                        type: 'keyword',
                      },
                    },
                  },
                  issuer: {
                    type: 'keyword',
                  },
                  ja3: {
                    type: 'keyword',
                  },
                  not_after: {
                    type: 'date',
                  },
                  not_before: {
                    type: 'date',
                  },
                  server_name: {
                    type: 'keyword',
                  },
                  subject: {
                    type: 'keyword',
                  },
                  supported_ciphers: {
                    type: 'keyword',
                  },
                  x509: {
                    properties: {
                      alternative_names: {
                        type: 'keyword',
                      },
                      issuer: {
                        properties: {
                          common_name: {
                            type: 'keyword',
                          },
                          country: {
                            type: 'keyword',
                          },
                          distinguished_name: {
                            type: 'keyword',
                          },
                          locality: {
                            type: 'keyword',
                          },
                          organization: {
                            type: 'keyword',
                          },
                          organizational_unit: {
                            type: 'keyword',
                          },
                          state_or_province: {
                            type: 'keyword',
                          },
                        },
                      },
                      not_after: {
                        type: 'date',
                      },
                      not_before: {
                        type: 'date',
                      },
                      public_key_algorithm: {
                        type: 'keyword',
                      },
                      public_key_curve: {
                        type: 'keyword',
                      },
                      public_key_exponent: {
                        type: 'long',
                      },
                      public_key_size: {
                        type: 'long',
                      },
                      serial_number: {
                        type: 'keyword',
                      },
                      signature_algorithm: {
                        type: 'keyword',
                      },
                      subject: {
                        properties: {
                          common_name: {
                            type: 'keyword',
                          },
                          country: {
                            type: 'keyword',
                          },
                          distinguished_name: {
                            type: 'keyword',
                          },
                          locality: {
                            type: 'keyword',
                          },
                          organization: {
                            type: 'keyword',
                          },
                          organizational_unit: {
                            type: 'keyword',
                          },
                          state_or_province: {
                            type: 'keyword',
                          },
                        },
                      },
                      version_number: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              curve: {
                type: 'keyword',
              },
              established: {
                type: 'boolean',
              },
              next_protocol: {
                type: 'keyword',
              },
              resumed: {
                type: 'boolean',
              },
              server: {
                properties: {
                  certificate: {
                    type: 'keyword',
                  },
                  certificate_chain: {
                    type: 'keyword',
                  },
                  hash: {
                    properties: {
                      md5: {
                        type: 'keyword',
                      },
                      sha1: {
                        type: 'keyword',
                      },
                      sha256: {
                        type: 'keyword',
                      },
                    },
                  },
                  issuer: {
                    type: 'keyword',
                  },
                  ja3s: {
                    type: 'keyword',
                  },
                  not_after: {
                    type: 'date',
                  },
                  not_before: {
                    type: 'date',
                  },
                  subject: {
                    type: 'keyword',
                  },
                  x509: {
                    properties: {
                      alternative_names: {
                        type: 'keyword',
                      },
                      issuer: {
                        properties: {
                          common_name: {
                            type: 'keyword',
                          },
                          country: {
                            type: 'keyword',
                          },
                          distinguished_name: {
                            type: 'keyword',
                          },
                          locality: {
                            type: 'keyword',
                          },
                          organization: {
                            type: 'keyword',
                          },
                          organizational_unit: {
                            type: 'keyword',
                          },
                          state_or_province: {
                            type: 'keyword',
                          },
                        },
                      },
                      not_after: {
                        type: 'date',
                      },
                      not_before: {
                        type: 'date',
                      },
                      public_key_algorithm: {
                        type: 'keyword',
                      },
                      public_key_curve: {
                        type: 'keyword',
                      },
                      public_key_exponent: {
                        type: 'long',
                      },
                      public_key_size: {
                        type: 'long',
                      },
                      serial_number: {
                        type: 'keyword',
                      },
                      signature_algorithm: {
                        type: 'keyword',
                      },
                      subject: {
                        properties: {
                          common_name: {
                            type: 'keyword',
                          },
                          country: {
                            type: 'keyword',
                          },
                          distinguished_name: {
                            type: 'keyword',
                          },
                          locality: {
                            type: 'keyword',
                          },
                          organization: {
                            type: 'keyword',
                          },
                          organizational_unit: {
                            type: 'keyword',
                          },
                          state_or_province: {
                            type: 'keyword',
                          },
                        },
                      },
                      version_number: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
              version: {
                type: 'keyword',
              },
              version_protocol: {
                type: 'keyword',
              },
            },
          },
          trace: {
            properties: {
              id: {
                type: 'keyword',
              },
            },
          },
          transaction: {
            properties: {
              id: {
                type: 'keyword',
              },
            },
          },
          url: {
            properties: {
              domain: {
                type: 'keyword',
              },
              extension: {
                type: 'keyword',
              },
              fragment: {
                type: 'keyword',
              },
              full: {
                type: 'wildcard',
              },
              original: {
                type: 'wildcard',
              },
              password: {
                type: 'keyword',
              },
              path: {
                type: 'wildcard',
              },
              port: {
                type: 'long',
              },
              query: {
                type: 'keyword',
              },
              registered_domain: {
                type: 'keyword',
              },
              scheme: {
                type: 'keyword',
              },
              subdomain: {
                type: 'keyword',
              },
              top_level_domain: {
                type: 'keyword',
              },
              username: {
                type: 'keyword',
              },
            },
          },
          user: {
            properties: {
              changes: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
              domain: {
                type: 'keyword',
              },
              effective: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
              email: {
                type: 'keyword',
              },
              full_name: {
                type: 'keyword',
              },
              group: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              hash: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              name: {
                type: 'keyword',
              },
              risk: {
                properties: {
                  calculated_level: {
                    type: 'keyword',
                  },
                  calculated_score: {
                    type: 'float',
                  },
                  calculated_score_norm: {
                    type: 'float',
                  },
                  static_level: {
                    type: 'keyword',
                  },
                  static_score: {
                    type: 'float',
                  },
                  static_score_norm: {
                    type: 'float',
                  },
                },
              },
              roles: {
                type: 'keyword',
              },
              target: {
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                  email: {
                    type: 'keyword',
                  },
                  full_name: {
                    type: 'keyword',
                  },
                  group: {
                    properties: {
                      domain: {
                        type: 'keyword',
                      },
                      id: {
                        type: 'keyword',
                      },
                      name: {
                        type: 'keyword',
                      },
                    },
                  },
                  hash: {
                    type: 'keyword',
                  },
                  id: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  roles: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
          user_agent: {
            properties: {
              device: {
                properties: {
                  name: {
                    type: 'keyword',
                  },
                },
              },
              name: {
                type: 'keyword',
              },
              original: {
                type: 'keyword',
              },
              os: {
                properties: {
                  family: {
                    type: 'keyword',
                  },
                  full: {
                    type: 'keyword',
                  },
                  kernel: {
                    type: 'keyword',
                  },
                  name: {
                    type: 'keyword',
                  },
                  platform: {
                    type: 'keyword',
                  },
                  type: {
                    type: 'keyword',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              version: {
                type: 'keyword',
              },
            },
          },
          vulnerability: {
            properties: {
              category: {
                type: 'keyword',
              },
              classification: {
                type: 'keyword',
              },
              description: {
                type: 'keyword',
              },
              enumeration: {
                type: 'keyword',
              },
              id: {
                type: 'keyword',
              },
              reference: {
                type: 'keyword',
              },
              report_id: {
                type: 'keyword',
              },
              scanner: {
                properties: {
                  vendor: {
                    type: 'keyword',
                  },
                },
              },
              score: {
                properties: {
                  base: {
                    type: 'float',
                  },
                  environmental: {
                    type: 'float',
                  },
                  temporal: {
                    type: 'float',
                  },
                  version: {
                    type: 'keyword',
                  },
                },
              },
              severity: {
                type: 'keyword',
              },
            },
          },
        },
      },
      settings: {
        index: {
          auto_expand_replicas: '0-1',
          hidden: 'true',
          mapping: {
            total_fields: {
              limit: 1900,
            },
          },
          number_of_replicas: '0',
          number_of_shards: '1',
        },
      },
    },
  };
};
