/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  InternalUnifiedManifestCreatedSchema,
  InternalUnifiedManifestSchema,
} from '../../schemas';

export const mapUnifiedManifestSavedObjectToUnifiedManifest = ({
  id,
  attributes: { artifactIds, policyId, semanticVersion, created },
}: SavedObject<InternalUnifiedManifestCreatedSchema>): InternalUnifiedManifestSchema => {
  return {
    id,
    policyId,
    semanticVersion,
    created,
    artifactIds,
  };
};
