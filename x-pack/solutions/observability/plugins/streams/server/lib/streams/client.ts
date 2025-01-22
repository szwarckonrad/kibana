/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import {
  IndicesDataStream,
  QueryDslQueryContainer,
  Result,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  Condition,
  StreamDefinition,
  StreamUpsertRequest,
  UnwiredStreamDefinition,
  WiredStreamDefinition,
  assertsSchema,
  getAncestors,
  getParentId,
  isChildOf,
  isRootStreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
  streamDefinitionSchema,
} from '@kbn/streams-schema';
import { cloneDeep, keyBy, omit, orderBy } from 'lodash';
import { AssetClient } from './assets/asset_client';
import { DefinitionNotFound, SecurityException } from './errors';
import { MalformedStreamId } from './errors/malformed_stream_id';
import {
  syncUnwiredStreamDefinitionObjects,
  syncWiredStreamDefinitionObjects,
} from './helpers/sync';
import { validateAncestorFields, validateDescendantFields } from './helpers/validate_fields';
import {
  validateRootStreamChanges,
  validateStreamChildrenChanges,
  validateStreamTypeChanges,
} from './helpers/validate_stream';
import { rootStreamDefinition } from './root_stream_definition';
import { StreamsStorageClient } from './service';
import {
  checkAccess,
  checkAccessBulk,
  deleteStreamObjects,
  deleteUnmanagedStreamObjects,
} from './stream_crud';

interface AcknowledgeResponse<TResult extends Result> {
  acknowledged: true;
  result: TResult;
}

export type EnableStreamsResponse = AcknowledgeResponse<'noop' | 'created'>;
export type DisableStreamsResponse = AcknowledgeResponse<'noop' | 'deleted'>;
export type DeleteStreamResponse = AcknowledgeResponse<'noop' | 'deleted'>;
export type SyncStreamResponse = AcknowledgeResponse<'updated' | 'created'>;
export type ForkStreamResponse = AcknowledgeResponse<'created'>;
export type ResyncStreamsResponse = AcknowledgeResponse<'updated'>;
export type UpsertStreamResponse = AcknowledgeResponse<'updated' | 'created'>;

const LOGS_ROOT_STREAM_NAME = 'logs';

function isElasticsearch404(error: unknown): error is errors.ResponseError & { statusCode: 404 } {
  return isResponseError(error) && error.statusCode === 404;
}

function isDefinitionNotFoundError(error: unknown): error is DefinitionNotFound {
  return error instanceof DefinitionNotFound;
}

export class StreamsClient {
  constructor(
    private readonly dependencies: {
      scopedClusterClient: IScopedClusterClient;
      assetClient: AssetClient;
      storageClient: StreamsStorageClient;
      logger: Logger;
      isServerless: boolean;
    }
  ) {}

  /**
   * Streams is considered enabled when:
   * - the logs root stream exists
   * - it is a wired stream (as opposed to an ingest stream)
   */
  async isStreamsEnabled(): Promise<boolean> {
    const rootLogsStreamExists = await this.getStream(LOGS_ROOT_STREAM_NAME)
      .then((definition) => isWiredStreamDefinition(definition))
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });

    return rootLogsStreamExists;
  }

  /**
   * Enabling streams means creating the logs root stream.
   * If it is already enabled, it is a noop.
   */
  async enableStreams(): Promise<EnableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();

    if (isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    await this.upsertStream({
      request: {
        dashboards: [],
        stream: omit(rootStreamDefinition, 'name'),
      },
      name: rootStreamDefinition.name,
    });

    return { acknowledged: true, result: 'created' };
  }

  /**
   * Disabling streams means deleting the logs root stream
   * AND its descendants, including any Elasticsearch objects,
   * such as data streams. That means it deletes all data
   * belonging to wired streams.
   *
   * It does NOT delete ingest streams.
   */
  async disableStreams(): Promise<DisableStreamsResponse> {
    const isEnabled = await this.isStreamsEnabled();
    if (!isEnabled) {
      return { acknowledged: true, result: 'noop' };
    }

    const definition = await this.getStream(LOGS_ROOT_STREAM_NAME);

    await this.deleteStreamFromDefinition(definition);

    const { assetClient, storageClient } = this.dependencies;
    await Promise.all([assetClient.clean(), storageClient.clean()]);

    return { acknowledged: true, result: 'deleted' };
  }

  /**
   * Resyncing streams means re-installing all Elasticsearch
   * objects (index and component templates, pipelines, and
   * assets), using the stream definitions as the source of
   * truth.
   *
   * Streams are re-synced in a specific order:
   * the leaf nodes are synced first, then its parents, etc.
   * Thiis prevents us from routing to data streams that do
   * not exist yet.
   */
  async resyncStreams(): Promise<ResyncStreamsResponse> {
    const streams = await this.getManagedStreams();

    const streamsWithDepth = streams.map((stream) => ({
      stream,
      depth: stream.name.match(/\./g)?.length ?? 0,
    }));

    const streamsInOrder = orderBy(streamsWithDepth, 'depth', 'desc');

    for (const { stream } of streamsInOrder) {
      await this.syncStreamObjects({
        definition: stream,
      });
    }
    return { acknowledged: true, result: 'updated' };
  }

  private async syncStreamObjects({ definition }: { definition: StreamDefinition }) {
    const { logger, scopedClusterClient } = this.dependencies;

    if (isWiredStreamDefinition(definition)) {
      await syncWiredStreamDefinitionObjects({
        definition,
        logger,
        scopedClusterClient,
        isServerless: this.dependencies.isServerless,
      });
    } else if (isUnwiredStreamDefinition(definition)) {
      await syncUnwiredStreamDefinitionObjects({
        definition,
        scopedClusterClient,
        logger,
        dataStream: await this.getDataStream(definition.name),
      });
    }
  }

  /**
   * Creates or updates a stream. The routing of the parent is
   * also updated (including syncing to Elasticsearch).
   */
  async upsertStream({
    name,
    request,
  }: {
    name: string;
    request: StreamUpsertRequest;
  }): Promise<UpsertStreamResponse> {
    const stream: StreamDefinition = { ...request.stream, name };
    const { dashboards } = request;
    const { result, parentDefinition } = await this.validateAndUpsertStream({
      definition: stream,
    });

    if (parentDefinition) {
      const isRoutingToChild = parentDefinition.ingest.routing.find(
        (item) => item.destination === name
      );

      if (!isRoutingToChild) {
        // If the parent is not routing to the child, we need to update the parent
        // to include the child in the routing with an empty condition, which means that no data is routed.
        // The user can set the condition later on the parent
        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.ingest.routing.concat({
            destination: name,
            if: { never: {} },
          }),
        });
      }
    } else if (isWiredStreamDefinition(stream)) {
      // if there is no parent, this is either the root stream, or
      // there are intermediate streams missing in the tree.
      // In the latter case, we need to create the intermediate streams first.
      const parentId = getParentId(stream.name);
      if (parentId) {
        await this.upsertStream({
          name: parentId,
          request: {
            dashboards: [],
            stream: {
              ingest: {
                processing: [],
                routing: [
                  {
                    destination: stream.name,
                    if: { never: {} },
                  },
                ],
                wired: {
                  fields: {},
                },
              },
            },
          },
        });
      }
    }

    await this.dependencies.assetClient.syncAssetList({
      entityId: stream.name,
      entityType: 'stream',
      assetIds: dashboards,
      assetType: 'dashboard',
    });

    return { acknowledged: true, result };
  }
  /**
   * `validateAndUpsertStream` does the following things:
   * - determining whether the given definition is valid
   * - creating empty streams for non-existing children
   * - synchronizes the Elasticsearch objects
   * - updating the stored stream definition document
   */
  private async validateAndUpsertStream({ definition }: { definition: StreamDefinition }): Promise<{
    result: 'created' | 'updated';
    parentDefinition?: WiredStreamDefinition;
  }> {
    const existingDefinition = await this.getStream(definition.name).catch((error) => {
      if (isDefinitionNotFoundError(error)) {
        return undefined;
      }
      throw error;
    });

    // we need to return this to allow consumers to update the routing of the parent
    let parentDefinition: WiredStreamDefinition | undefined;

    if (existingDefinition) {
      // Only allow wired-to-wired and ingest-to-ingest updates
      validateStreamTypeChanges(existingDefinition, definition);
    }

    if (isRootStreamDefinition(definition)) {
      // only allow selective updates to a root stream
      validateRootStreamChanges(
        (existingDefinition as undefined | WiredStreamDefinition) || rootStreamDefinition,
        definition
      );
    }

    if (isWiredStreamDefinition(definition)) {
      const validateWiredStreamResult = await this.validateWiredStreamAndCreateChildrenIfNeeded({
        existingDefinition: existingDefinition as WiredStreamDefinition,
        definition,
      });

      parentDefinition = validateWiredStreamResult.parentDefinition;
    }

    const result = !!existingDefinition ? ('updated' as const) : ('created' as const);

    await this.syncStreamObjects({
      definition,
    });

    await this.updateStoredStream(definition);

    return {
      result,
      parentDefinition,
    };
  }

  /**
   * Validates whether:
   * - there are no conflicting field types,
   * - the parent is not an ingest stream
   *
   * It also creates children that do not exist.
   */
  private async validateWiredStreamAndCreateChildrenIfNeeded({
    existingDefinition,
    definition,
  }: {
    existingDefinition?: WiredStreamDefinition;
    definition: WiredStreamDefinition;
  }): Promise<{ parentDefinition?: WiredStreamDefinition }> {
    const [ancestors, descendants] = await Promise.all([
      this.getAncestors(definition.name),
      this.getDescendants(definition.name),
    ]);

    const descendantsById = keyBy(descendants, (stream) => stream.name);

    const parentId = getParentId(definition.name);

    const parentDefinition = parentId
      ? ancestors.find((parent) => parent.name === parentId)
      : undefined;

    // If no existing definition exists, this is a fork via upsert,
    // and we need to validate whether the parent is a wired stream
    if (
      !existingDefinition &&
      parentId &&
      parentDefinition &&
      !isWiredStreamDefinition(parentDefinition)
    ) {
      throw new MalformedStreamId('Cannot fork a stream that is not managed');
    }

    validateAncestorFields({
      ancestors,
      fields: definition.ingest.wired.fields,
    });

    validateDescendantFields({
      descendants,
      fields: definition.ingest.wired.fields,
    });

    if (existingDefinition) {
      validateStreamChildrenChanges(existingDefinition, definition);
    }

    for (const item of definition.ingest.routing) {
      if (descendantsById[item.destination]) {
        continue;
      }
      if (!isChildOf(definition.name, item.destination)) {
        throw new MalformedStreamId(
          `The ID (${item.destination}) from the child stream must start with the parent's id (${definition.name}), followed by a dot and a name`
        );
      }
      await this.validateAndUpsertStream({
        definition: {
          name: item.destination,
          ingest: {
            processing: [],
            routing: [],
            wired: {
              fields: {},
            },
          },
        },
      });
    }

    return { parentDefinition };
  }

  /**
   * Forks a stream into a child with a specific condition.
   * It mostly defers to `upsertStream` for its validations,
   * except for two things:
   * - it makes sure the name is valid for a child of the
   * forked stream
   * - the child does not already exist
   *
   * Additionally, it adds the specified condition to the
   * forked stream (which cannot happen via a PUT of the
   * child stream).
   */
  async forkStream({
    parent,
    name,
    if: condition,
  }: {
    parent: string;
    name: string;
    if: Condition;
  }): Promise<ForkStreamResponse> {
    const parentDefinition = await this.getStream(parent);

    const childDefinition: WiredStreamDefinition = {
      name,
      ingest: { processing: [], routing: [], wired: { fields: {} } },
    };

    // check whether root stream has a child of the given name already
    if (parentDefinition.ingest.routing.some((item) => item.destination === childDefinition.name)) {
      throw new MalformedStreamId(
        `The stream with ID (${name}) already exists as a child of the parent stream`
      );
    }
    if (!isChildOf(parentDefinition.name, childDefinition.name)) {
      throw new MalformedStreamId(
        `The ID (${name}) from the new stream must start with the parent's id (${parentDefinition.name}), followed by a dot and a name`
      );
    }

    // need to create the child first, otherwise we risk streaming data even though the child data stream is not ready

    const { parentDefinition: updatedParentDefinition } = await this.validateAndUpsertStream({
      definition: childDefinition,
    });

    await this.updateStreamRouting({
      definition: updatedParentDefinition!,
      routing: parentDefinition.ingest.routing.concat({
        destination: name,
        if: condition,
      }),
    });

    return { acknowledged: true, result: 'created' };
  }

  /**
   * Returns a stream definition for the given name:
   * - if a wired stream definition exists
   * - if an ingest stream definition exists
   * - if a data stream exists (creates an ingest
   * definition on the fly)
   *
   * Throws when:
   * - no definition is found
   * - the user does not have access to the stream
   */
  async getStream(name: string): Promise<StreamDefinition> {
    const definition = await Promise.all([
      this.dependencies.storageClient.get({ id: name }).then((response) => {
        const source = response._source;
        assertsSchema(streamDefinitionSchema, source);
        return source;
      }),
      checkAccess({ id: name, scopedClusterClient: this.dependencies.scopedClusterClient }).then(
        (privileges) => {
          if (!privileges.read) {
            throw new DefinitionNotFound(`Stream definition for ${name} not found`);
          }
        }
      ),
    ])
      .then(([wiredDefinition]) => {
        return wiredDefinition;
      })
      .catch(async (error) => {
        if (isElasticsearch404(error)) {
          const dataStream = await this.getDataStream(name);
          return await this.getDataStreamAsIngestStream(dataStream);
        }
        throw error;
      })
      .catch(async (error) => {
        if (isElasticsearch404(error)) {
          throw new DefinitionNotFound(`Cannot find stream ${name}`);
        }
        throw error;
      });

    return definition;
  }

  async getDataStream(name: string): Promise<IndicesDataStream> {
    return this.dependencies.scopedClusterClient.asCurrentUser.indices
      .getDataStream({ name })
      .then((response) => {
        const dataStream = response.data_streams[0];
        return dataStream;
      });
  }

  /**
   * Creates an on-the-fly ingest stream definition
   * from a concrete data stream.
   */
  private async getDataStreamAsIngestStream(
    dataStream: IndicesDataStream
  ): Promise<UnwiredStreamDefinition> {
    const definition: UnwiredStreamDefinition = {
      name: dataStream.name,
      ingest: {
        routing: [],
        processing: [],
        unwired: {},
      },
    };

    return definition;
  }

  /**
   * Checks whether the stream exists (and whether the
   * user has access to it).
   */
  async existsStream(name: string): Promise<boolean> {
    const exists = await this.getStream(name)
      .then(() => true)
      .catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return false;
        }
        throw error;
      });

    return exists;
  }

  /**
   * Lists both managed and unmanaged streams
   */
  async listStreams(): Promise<StreamDefinition[]> {
    const [managedStreams, unmanagedStreams] = await Promise.all([
      this.getManagedStreams(),
      this.getUnmanagedDataStreams(),
    ]);

    const allDefinitionsById = new Map<string, StreamDefinition>(
      managedStreams.map((stream) => [stream.name, stream])
    );

    unmanagedStreams.forEach((stream) => {
      if (!allDefinitionsById.get(stream.name)) {
        allDefinitionsById.set(stream.name, stream);
      }
    });

    return Array.from(allDefinitionsById.values());
  }

  /**
   * Lists all unmanaged streams (unwired streams without a
   * stored definition).
   */
  private async getUnmanagedDataStreams(): Promise<UnwiredStreamDefinition[]> {
    const response =
      await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream();

    return response.data_streams.map((dataStream) => ({
      name: dataStream.name,
      ingest: {
        processing: [],
        routing: [],
        unwired: {},
      },
    }));
  }

  /**
   * Lists managed streams, and verifies access to it.
   */
  private async getManagedStreams({ query }: { query?: QueryDslQueryContainer } = {}): Promise<
    StreamDefinition[]
  > {
    const { scopedClusterClient, storageClient } = this.dependencies;

    const streamsSearchResponse = await storageClient.search({
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
      query,
    });

    const streams = streamsSearchResponse.hits.hits.flatMap((hit) => {
      const source = hit._source;
      assertsSchema(streamDefinitionSchema, source);
      return source;
    });

    const privileges = await checkAccessBulk({
      ids: streams.map((stream) => stream.name),
      scopedClusterClient,
    });

    return streams.filter((stream) => {
      return privileges[stream.name]?.read === true;
    });
  }

  /**
   * Delete stream from definition. This has no access check,
   * which needs to happen in the consumer. This is to allow
   * us to delete the root stream internally.
   */
  private async deleteStreamFromDefinition(definition: StreamDefinition): Promise<void> {
    const { assetClient, logger, scopedClusterClient } = this.dependencies;

    if (!isWiredStreamDefinition(definition)) {
      await deleteUnmanagedStreamObjects({
        scopedClusterClient,
        id: definition.name,
        logger,
      });
    } else {
      const parentId = getParentId(definition.name);

      // need to update parent first to cut off documents streaming down
      if (parentId) {
        const parentDefinition = (await this.getStream(parentId)) as WiredStreamDefinition;

        await this.updateStreamRouting({
          definition: parentDefinition,
          routing: parentDefinition.ingest.routing.filter(
            (item) => item.destination !== definition.name
          ),
        });
      }

      // delete the children first, as this will update
      // the parent as well
      for (const item of definition.ingest.routing) {
        await this.deleteStream(item.destination);
      }

      await deleteStreamObjects({ scopedClusterClient, id: definition.name, logger });
    }

    await assetClient.syncAssetList({
      entityId: definition.name,
      entityType: 'stream',
      assetType: 'dashboard',
      assetIds: [],
    });

    await this.dependencies.storageClient.delete({ id: definition.name });
  }

  /**
   * Updates the routing of the stream, and synchronizes
   * the Elasticsearch objects. This allows us to update
   * only the routing of a parent, without triggering
   * a cascade of updates due to how `upsertStream` works.
   */
  private async updateStreamRouting({
    definition,
    routing,
  }: {
    definition: WiredStreamDefinition;
    routing: WiredStreamDefinition['ingest']['routing'];
  }) {
    const update = cloneDeep(definition);
    update.ingest.routing = routing;

    await this.updateStoredStream(update);

    await this.syncStreamObjects({
      definition: update,
    });
  }

  /**
   * Deletes a stream, and its Elasticsearch objects, and its data.
   * Also verifies whether the user has access to the stream.
   */
  async deleteStream(name: string): Promise<DeleteStreamResponse> {
    const [definition, access] = await Promise.all([
      this.getStream(name).catch((error) => {
        if (isDefinitionNotFoundError(error)) {
          return undefined;
        }
        throw error;
      }),
      checkAccess({ id: name, scopedClusterClient: this.dependencies.scopedClusterClient }),
    ]);

    if (!access.write) {
      throw new SecurityException(`Cannot delete stream, insufficient privileges`);
    }

    if (!definition) {
      return { acknowledged: true, result: 'noop' };
    }

    const parentId = getParentId(name);
    if (isWiredStreamDefinition(definition) && !parentId) {
      throw new MalformedStreamId('Cannot delete root stream');
    }

    await this.deleteStreamFromDefinition(definition);

    return { acknowledged: true, result: 'deleted' };
  }

  private async updateStoredStream(definition: StreamDefinition) {
    return this.dependencies.storageClient.index({
      id: definition.name,
      document: omit(
        definition,
        'elasticsearch_assets',
        'dashboards',
        'inherited_fields',
        'lifecycle'
      ),
    });
  }

  async getAncestors(name: string): Promise<WiredStreamDefinition[]> {
    const ancestorIds = getAncestors(name);

    return this.getManagedStreams({
      query: {
        bool: {
          filter: [{ terms: { name: ancestorIds } }],
        },
      },
    }).then((streams) => streams.filter(isWiredStreamDefinition));
  }

  async getDescendants(name: string): Promise<WiredStreamDefinition[]> {
    return this.getManagedStreams({
      query: {
        bool: {
          filter: [
            {
              prefix: {
                name,
              },
            },
          ],
          must_not: [
            {
              term: {
                name,
              },
            },
          ],
        },
      },
    }).then((streams) => streams.filter(isWiredStreamDefinition));
  }
}
