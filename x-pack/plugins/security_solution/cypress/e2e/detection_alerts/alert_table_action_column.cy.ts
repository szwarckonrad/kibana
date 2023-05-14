/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OVERLAY_CONTAINER } from '../../screens/alerts';
import {
  closeAnalyzer,
  closeSessionViewerFromAlertTable,
  openAnalyzerForFirstAlertInTimeline,
  openSessionViewerFromAlertTable,
} from '../../tasks/alerts';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { esArchiverLoad, esArchiverUnload } from '../../tasks/es_archiver';
import { login, visit } from '../../tasks/login';
import { ALERTS_URL } from '../../urls/navigation';

describe('Alerts Table Action column', { testIsolation: false }, () => {
  before(() => {
    cleanKibana();
    esArchiverLoad('process_ancestry');
  });

  beforeEach(() => {
    login();
    visit(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  after(() => {
    esArchiverUnload('process_ancestry');
  });

  it('should have session viewer button visible & open session viewer on click', () => {
    openSessionViewerFromAlertTable();
    cy.get(OVERLAY_CONTAINER).should('be.visible');
    // cleanup
    closeSessionViewerFromAlertTable();
  });

  it('should have analyzer button visible & open analyzer on click', () => {
    openAnalyzerForFirstAlertInTimeline();
    cy.get(OVERLAY_CONTAINER).should('be.visible');
    // cleanup
    closeAnalyzer();
  });
});
