/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsBulkDeleteResponse,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { createSoFindIterable } from '../../utils/create_so_find_iterable';
import { mapUnifiedManifestSavedObjectToUnifiedManifest } from './utils';
import type {
  InternalUnifiedManifestCreateSchema,
  InternalUnifiedManifestSchema,
} from '../../schemas';
import { ManifestConstants } from '../../lib/artifacts';

interface FetchAllUnifiedManifestsOptions {
  perPage?: number;
  kuery?: string;
  sortField?: string;
  sortOrder?: 'desc' | 'asc';
  fields?: string[];
}

export class UnifiedManifestClient {
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(savedObjectsClient: SavedObjectsClientContract) {
    this.savedObjectsClient = savedObjectsClient;
  }

  /**
   * Create
   */

  public createUnifiedManifest(
    manifest: InternalUnifiedManifestCreateSchema
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestCreateSchema>> {
    return this.createUnifiedManifests([manifest]);
  }

  public createUnifiedManifests(
    manifest: InternalUnifiedManifestCreateSchema[]
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestCreateSchema>> {
    return this.savedObjectsClient.bulkCreate<InternalUnifiedManifestCreateSchema>(
      manifest.map((attributes) => ({
        type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
        attributes,
      }))
    );
  }

  /**
   * Read
   */

  public getUnifiedManifestByPolicyId(
    policyId: string
  ): Promise<SavedObjectsFindResponse<InternalUnifiedManifestSchema>> {
    return this.savedObjectsClient.find({
      type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
      search: policyId,
      searchFields: ['policyId'],
    });
  }

  public getUnifiedManifestById(
    manifestId: string
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestSchema>> {
    return this.getUnifiedManifestByIds([manifestId]);
  }

  public getUnifiedManifestByIds(
    manifestIds: string[]
  ): Promise<SavedObjectsBulkResponse<InternalUnifiedManifestSchema>> {
    return this.savedObjectsClient.bulkGet(
      manifestIds.map((id) => ({ id, type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE }))
    );
  }

  public async getAllUnifiedManifests(
    cb: (unifiedManifests: InternalUnifiedManifestSchema[]) => void | Promise<void>,
    options?: FetchAllUnifiedManifestsOptions
  ): Promise<void> {
    const unifiedManifestsFetcher = this.fetchAllUnifiedManifests(options);

    for await (const unifiedManifests of unifiedManifestsFetcher) {
      if (cb.constructor.name === 'AsyncFunction') {
        await cb(unifiedManifests);
      } else {
        cb(unifiedManifests);
      }
    }
  }

  /**
   * Update
   */

  public updateUnifiedManifest(
    manifest: InternalUnifiedManifestSchema,
    opts?: { version: string }
  ): Promise<SavedObjectsBulkUpdateResponse<InternalUnifiedManifestSchema>> {
    return this.updateUnifiedManifests([manifest], opts);
  }

  public updateUnifiedManifests(
    manifests: InternalUnifiedManifestSchema[],
    opts?: { version: string }
  ): Promise<SavedObjectsBulkUpdateResponse<InternalUnifiedManifestSchema>> {
    return this.savedObjectsClient.bulkUpdate<InternalUnifiedManifestCreateSchema>(
      manifests.map((manifest) => {
        const { id, ...attributes } = manifest;
        return {
          type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
          id,
          attributes,
          ...(opts?.version ? { version: opts.version } : {}),
        };
      })
    );
  }

  /**
   * Delete
   */

  public deleteUnifiedManifestById(manifestId: string): Promise<SavedObjectsBulkDeleteResponse> {
    return this.deleteUnifiedManifestByIds([manifestId]);
  }

  public deleteUnifiedManifestByIds(
    manifestIds: string[]
  ): Promise<SavedObjectsBulkDeleteResponse> {
    return this.savedObjectsClient.bulkDelete(
      manifestIds.map((id) => ({ id, type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE }))
    );
  }

  /**
   * Private
   */

  private fetchAllUnifiedManifests({
    perPage = 1000,
    fields = [],
    kuery,
    sortOrder = 'asc',
    sortField = 'created',
  }: FetchAllUnifiedManifestsOptions = {}): AsyncIterable<InternalUnifiedManifestSchema[]> {
    const normalizeKuery = (savedObjectType: string, kueryInput: string): string => {
      return kueryInput.replace(
        new RegExp(`${savedObjectType}\\.(?!attributes\\.)`, 'g'),
        `${savedObjectType}.attributes.`
      );
    };
    return createSoFindIterable<InternalUnifiedManifestCreateSchema>({
      soClient: this.savedObjectsClient,
      findRequest: {
        type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
        perPage,
        filter: kuery
          ? normalizeKuery(ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE, kuery)
          : undefined,
        sortOrder,
        sortField,
        fields,
      },
      resultsMapper(results) {
        return results.saved_objects.map(mapUnifiedManifestSavedObjectToUnifiedManifest);
      },
    });
  }
}
