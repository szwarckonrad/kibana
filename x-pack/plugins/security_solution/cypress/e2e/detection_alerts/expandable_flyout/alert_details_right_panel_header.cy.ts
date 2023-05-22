/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import {
  DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_RISK_SCORE,
  DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_RISK_SCORE_VALUE,
  DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_SEVERITY,
  DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_SEVERITY_VALUE,
  DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_TITLE,
} from '../../../screens/document_expandable_flyout';
import { expandFirstAlertExpandableFlyout } from '../../../tasks/document_expandable_flyout';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';
import { createRule } from '../../../tasks/api_calls/rules';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_URL } from '../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';

describe.skip(
  'Alert details expandable flyout right panel header',
  { env: { ftrConfig: { enableExperimental: ['securityFlyoutEnabled'] } } },
  () => {
    const rule = getNewRule();

    before(() => {
      cleanKibana();
      createRule(rule);
    });

    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlertExpandableFlyout();
    });

    it('should display correct title in header', () => {
      cy.get(DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_TITLE)
        .should('be.visible')
        .and('have.text', rule.name);
    });

    it('should display risk score in header', () => {
      cy.get(DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_RISK_SCORE).should('be.visible');
      cy.get(DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_RISK_SCORE_VALUE)
        .should('be.visible')
        .and('have.text', rule.risk_score);
    });

    it('should display severity in header', () => {
      cy.get(DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_SEVERITY).should('be.visible');
      cy.get(DOCUMENT_DETAILS_OVERVIEW_TAB_HEADER_SEVERITY_VALUE)
        .should('be.visible')
        .and('have.text', upperFirst(rule.severity));
    });
  }
);
