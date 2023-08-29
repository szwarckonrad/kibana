/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  deleteProtectionUpdatesNoteHandler,
  getProtectionUpdatesNoteHandler,
  postProtectionUpdatesNoteHandler,
  putProtectionUpdatesNoteHandler,
} from './handlers';
import {
  GetProtectionUpdatesNoteSchema,
  UpdateProtectionUpdatesNoteSchema,
} from '../../../../common/api/endpoint/protection_updates_note/protection_updates_note_schema';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { PROTECTION_UPDATES_NOTE_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';

export function registerProtectionUpdatesNoteRoutes(
  router: IRouter,
  endpointAppContext: EndpointAppContext
) {
  const logger = endpointAppContext.logFactory.get('protectionUpdatesNote');

  router.versioned
    .post({
      access: 'public',
      path: PROTECTION_UPDATES_NOTE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UpdateProtectionUpdatesNoteSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWritePolicyManagement'] },
        logger,
        postProtectionUpdatesNoteHandler()
      )
    );

  router.versioned
    .get({
      access: 'public',
      path: PROTECTION_UPDATES_NOTE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: GetProtectionUpdatesNoteSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canReadSecuritySolution'] },
        logger,
        getProtectionUpdatesNoteHandler()
      )
    );

  router.versioned
    .put({
      access: 'public',
      path: PROTECTION_UPDATES_NOTE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UpdateProtectionUpdatesNoteSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWritePolicyManagement'] },
        logger,
        putProtectionUpdatesNoteHandler()
      )
    );

  router.versioned
    .delete({
      access: 'public',
      path: PROTECTION_UPDATES_NOTE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: GetProtectionUpdatesNoteSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWritePolicyManagement'] },
        logger,
        deleteProtectionUpdatesNoteHandler()
      )
    );
}
