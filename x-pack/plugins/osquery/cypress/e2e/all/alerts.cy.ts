/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cleanupCase,
  cleanupPack,
  cleanupAgentPolicy,
  cleanupRule,
  loadCase,
  loadPack,
  loadAgentPolicy,
  loadRule,
  multiQueryPackFixture,
  packFixture,
} from '../../tasks/api_fixtures';
import {
  RESPONSE_ACTIONS_ITEM_0,
  RESPONSE_ACTIONS_ITEM_1,
  RESPONSE_ACTIONS_ITEM_2,
  OSQUERY_RESPONSE_ACTION_ADD_BUTTON,
} from '../../tasks/response_actions';
import { ROLE, login } from '../../tasks/login';
import {
  addToCase,
  checkActionItemsInResults,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  loadRuleAlerts,
  submitQuery,
  takeOsqueryActionWithParams,
  toggleRuleOffAndOn,
  typeInECSFieldInput,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { preparePack } from '../../tasks/packs';
import { closeModalIfVisible, closeToastIfVisible } from '../../tasks/integrations';
import { navigateTo } from '../../tasks/navigation';
import { RESULTS_TABLE, RESULTS_TABLE_BUTTON } from '../../screens/live_query';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

describe('Alert Event Details', () => {
  beforeEach(() => {
    login(ROLE.soc_manager);
  });

  describe('Packs and rules creation', () => {
    let policyName: string;
    let policyId: string;
    let ruleId: string;
    let ruleName: string;
    let packId: string;
    let packName: string;

    const packData = packFixture();

    before(() => {
      loadPack(packData).then((data) => {
        packId = data.id;
        packName = data.attributes.name;
      });
      loadRule().then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
      loadAgentPolicy().then((data) => {
        policyId = data.id;
        policyName = data.name;
      });
    });
    after(() => {
      cleanupPack(packId);
      cleanupRule(ruleId);
      cleanupAgentPolicy(policyId);
    });

    it('should prepare packs and alert rules', () => {
      navigateTo('/app/osquery/live_queries');
      preparePack(packName);
      findAndClickButton('Edit');
      cy.contains(`Edit ${packName}`);
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        `${policyName}{downArrow}{enter}`
      );
      findAndClickButton('Update pack');
      closeModalIfVisible();
      cy.contains(`Successfully updated "${packName}" pack`);
      closeToastIfVisible();

      toggleRuleOffAndOn(ruleName);
    });
  });

  describe('Response actions', () => {
    let multiQueryPackId: string;
    let multiQueryPackName: string;
    let ruleId: string;
    let ruleName: string;
    let packId: string;
    let packName: string;
    const packData = packFixture();
    const multiQueryPackData = multiQueryPackFixture();

    before(() => {
      loadPack(packData).then((data) => {
        packId = data.id;
        packName = data.attributes.name;
      });
      loadPack(multiQueryPackData).then((data) => {
        multiQueryPackId = data.id;
        multiQueryPackName = data.attributes.name;
      });
      loadRule().then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupPack(packId);
      cleanupPack(multiQueryPackId);
      cleanupRule(ruleId);
    });

    it('adds response actions with osquery with proper validation and form values', () => {
      cy.visit('/app/security/rules');
      cy.contains(ruleName).click();
      cy.getBySel('editRuleSettingsLink').click({ force: true });
      cy.getBySel('edit-rule-actions-tab').wait(500).click();
      cy.contains('Response actions are run on each rule execution');
      cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('Query is a required field');
        inputQuery('select * from uptime1');
      });
      cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('Run a set of queries in a pack').click();
      });
      cy.contains('Save changes').click();
      cy.getBySel('response-actions-error')
        .within(() => {
          cy.contains(' Pack is a required field');
        })
        .should('exist');
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('Pack is a required field');
        cy.getBySel('comboBoxInput').type(`${packName}{downArrow}{enter}`);
      });

      cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();

      cy.getBySel(RESPONSE_ACTIONS_ITEM_2).within(() => {
        cy.contains('Query is a required field');
        inputQuery('select * from uptime');
        cy.contains('Advanced').click();
        typeInECSFieldInput('message{downArrow}{enter}');
        cy.getBySel('osqueryColumnValueSelect').type('days{downArrow}{enter}');
        cy.wait(1000); // wait for the validation to trigger - cypress is way faster than users ;)
      });

      cy.getBySel('ruleEditSubmitButton').click();
      cy.contains(`${ruleName} was saved`).should('exist');
      closeToastIfVisible();

      cy.getBySel('editRuleSettingsLink').click({ force: true });
      cy.getBySel('edit-rule-actions-tab').wait(500).click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('select * from uptime1');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_2).within(() => {
        cy.contains('select * from uptime');
        cy.contains('Log message optimized for viewing in a log viewer');
        cy.contains('Days of uptime');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains(packName);
        cy.getBySel('comboBoxInput').type('{backspace}{enter}');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('select * from uptime1');
        cy.getBySel('remove-response-action').click();
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('Search for a pack to run');
        cy.contains('Pack is a required field');
        cy.getBySel('comboBoxInput').type(`${packName}{downArrow}{enter}`);
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('select * from uptime');
        cy.contains('Log message optimized for viewing in a log viewer');
        cy.contains('Days of uptime');
      });
      cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleSingleQuery');
      cy.getBySel('ruleEditSubmitButton').click();
      cy.wait('@saveRuleSingleQuery').should(({ request }) => {
        const oneQuery = [
          {
            interval: 3600,
            query: 'select * from uptime;',
            id: Object.keys(packData.queries)[0],
          },
        ];
        expect(request.body.response_actions[0].params.queries).to.deep.equal(oneQuery);
      });

      cy.contains(`${ruleName} was saved`).should('exist');
      closeToastIfVisible();

      cy.getBySel('editRuleSettingsLink').click({ force: true });
      cy.getBySel('edit-rule-actions-tab').wait(500).click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains(packName);
        cy.getBySel('comboBoxInput').type(`${multiQueryPackName}{downArrow}{enter}`);
        checkActionItemsInResults({
          cases: false,
          lens: false,
          discover: false,
          timeline: false,
        });
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('select * from uptime');
        cy.contains('Log message optimized for viewing in a log viewer');
        cy.contains('Days of uptime');
      });
      cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleMultiQuery');

      cy.contains('Save changes').click();
      cy.wait('@saveRuleMultiQuery').should(({ request }) => {
        const threeQueries = [
          {
            interval: 3600,
            query: 'SELECT * FROM memory_info;',
            platform: 'linux',
            id: Object.keys(multiQueryPackData.queries)[0],
          },
          {
            interval: 3600,
            query: 'SELECT * FROM system_info;',
            id: Object.keys(multiQueryPackData.queries)[1],
          },
          {
            interval: 10,
            query: 'select opera_extensions.* from users join opera_extensions using (uid);',
            id: Object.keys(multiQueryPackData.queries)[2],
          },
        ];
        expect(request.body.response_actions[0].params.queries).to.deep.equal(threeQueries);
      });
    });
  });

  describe('investigation guide', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule().then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });
    it('should be able to add investigation guides to response actions', () => {
      const investigationGuideNote =
        'You have queries in the investigation guide. Add them as response actions?';
      cy.visit('/app/security/rules');
      cy.contains(ruleName).click();
      cy.getBySel('editRuleSettingsLink').click({ force: true });
      cy.getBySel('edit-rule-actions-tab').wait(500).click();

      cy.contains(investigationGuideNote);
      cy.getBySel('osqueryAddInvestigationGuideQueries').click();
      cy.contains(investigationGuideNote).should('not.exist');

      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains("SELECT * FROM os_version where name='{{host.os.name}}';");
        cy.contains('host.os.platform');
        cy.contains('platform');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('select * from users');
      });
      cy.contains('Save changes').click();
      cy.contains(`${ruleName} was saved`).should('exist');
      closeToastIfVisible();
    });
  });

  describe('timeline', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule().then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });
    it('should be able to run live query and add to timeline (-depending on the previous test)', () => {
      const TIMELINE_NAME = 'Untitled timeline';
      loadRuleAlerts(ruleName);
      cy.getBySel('timeline-context-menu-button').first().click({ force: true });
      cy.contains('Run Osquery');
      cy.getBySel('expand-event').first().click({ force: true });
      cy.getBySel('take-action-dropdown-btn').click();
      cy.getBySel('osquery-action-item').click();
      cy.contains('1 agent selected.');
      inputQuery('select * from uptime;');
      submitQuery();
      cy.contains('Results');
      cy.contains('Add to timeline investigation');
      cy.contains('Save for later').click();
      cy.contains('Save query');
      cy.get('.euiButtonEmpty--flushLeft').contains('Cancel').click();
      cy.getBySel('add-to-timeline').first().click();
      cy.getBySel('globalToastList').contains('Added');
      closeToastIfVisible();
      cy.getBySel(RESULTS_TABLE).within(() => {
        cy.getBySel(RESULTS_TABLE_BUTTON).should('not.exist');
      });
      cy.contains('Cancel').click();
      cy.contains(TIMELINE_NAME).click();
      cy.getBySel('draggableWrapperKeyboardHandler').contains('action_id: "');
      // timeline unsaved changes modal
      cy.visit('/app/osquery');
      closeModalIfVisible();
    });
  });

  describe('substitute params', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule().then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });

    it('should substitute parameters in investigation guide', () => {
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.contains('Get processes').click();
      cy.getBySel('flyout-body-osquery').within(() => {
        cy.contains("SELECT * FROM os_version where name='Ubuntu';");
        cy.contains('host.os.platform');
        cy.contains('platform');
      });
    });
  });

  describe('Case', () => {
    let ruleId: string;
    let ruleName: string;
    let caseId: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
      loadCase('securitySolution').then((data) => {
        caseId = data.id;
      });
    });
    after(() => {
      cleanupRule(ruleId);
      cleanupCase(caseId);
    });
    it('sees osquery results from last action and add to a case', () => {
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.contains('Osquery Results').click();
      cy.getBySel('osquery-results').should('exist');
      cy.contains('select * from users;');
      cy.contains("SELECT * FROM os_version where name='Ubuntu';");
      cy.getBySel('osquery-results-comment').each(($comment) => {
        cy.wrap($comment).within(() => {
          // On initial load result table might not render due to displayed error
          if ($comment.find('div .euiDataGridRow').length <= 0) {
            // If tabs are present try clicking between status and results to get rid of the error message
            if ($comment.find('div .euiTabs').length > 0) {
              cy.getBySel('osquery-status-tab').click();
              cy.getBySel('osquery-results-tab').click();
              cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.lengthOf.above', 0);
            }
          } else {
            // Result tab was rendered successfully
            cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.lengthOf.above', 0);
          }
          // }
        });
      });
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: true,
      });
      addToCase(caseId);
      viewRecentCaseAndCheckResults();
    });
  });

  describe('Discover', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });

    it('can visit discover from response action results', () => {
      const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.contains('Osquery Results').click();
      cy.getBySel('osquery-results').should('exist');
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: true,
      });
      cy.contains('View in Discover')
        .should('exist')
        .should('have.attr', 'href')
        .then(($href) => {
          // @ts-expect-error-next-line href string - check types
          cy.visit($href);
          cy.getBySel('breadcrumbs').contains('Discover').should('exist');
          cy.getBySel('discoverDocTable', { timeout: 60000 }).within(() => {
            cy.contains(`action_data.query`);
          });
          cy.contains(discoverRegex);
        });
    });
  });

  describe('Lens', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });

    it('can visit lens from response action results', () => {
      const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.contains('Osquery Results').click();
      cy.getBySel('osquery-results').should('exist');
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: true,
      });
      cy.getBySel('osquery-results-comment')
        .first()
        .within(() => {
          let lensUrl = '';
          cy.window().then((win) => {
            cy.stub(win, 'open')
              .as('windowOpen')
              .callsFake((url) => {
                lensUrl = url;
              });
          });
          cy.get(`[aria-label="View in Lens"]`).click();
          cy.window()
            .its('open')
            .then(() => {
              cy.visit(lensUrl);
            });
        });
      cy.getBySel('lnsWorkspace').should('exist');
      cy.getBySel('breadcrumbs').contains(lensRegex);
    });
  });

  describe('Timeline', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });

    it('can add to timeline from response action results', () => {
      const timelineRegex = new RegExp(`Added ${UUID_REGEX} to timeline`);
      const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.contains('Osquery Results').click();
      cy.getBySel('osquery-results').should('exist');
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: true,
      });
      cy.getBySel('osquery-results-comment')
        .first()
        .within(() => {
          cy.get('.euiTableRow')
            .first()
            .within(() => {
              cy.getBySel('add-to-timeline').click();
            });
        });
      cy.contains(timelineRegex);
      cy.contains('Untitled timeline').click();
      cy.contains(filterRegex);
    });
  });

  describe('Params', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });

    it('should substitute parameters in live query and increase number of ran queries', () => {
      let initialNotificationCount: number;
      let updatedNotificationCount: number;
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.getBySel('osquery-actions-notification')
        .should('not.have.text', '0')
        .then((element) => {
          initialNotificationCount = parseInt(element.text(), 10);
        });
      takeOsqueryActionWithParams();
      cy.getBySel('osquery-empty-button').click();
      cy.getBySel('osquery-actions-notification')
        .should('not.have.text', '0')
        .then((element) => {
          updatedNotificationCount = parseInt(element.text(), 10);
          expect(initialNotificationCount).to.be.equal(updatedNotificationCount - 1);
        })
        .then(() => {
          cy.contains('Osquery Results').click();
          cy.getBySel('osquery-results').within(() => {
            cy.contains('tags');
            cy.getBySel('osquery-results-comment').should('have.length', updatedNotificationCount);
          });
        });
    });
  });

  describe('Multiple agents', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });
    it('should be able to run take action query against all enrolled agents', () => {
      loadRuleAlerts(ruleName);
      cy.getBySel('expand-event').first().click({ force: true });
      cy.getBySel('take-action-dropdown-btn').click();
      cy.getBySel('osquery-action-item').click();
      cy.getBySel('agentSelection').within(() => {
        cy.getBySel('comboBoxClearButton').click();
        cy.getBySel('comboBoxInput').type('All{downArrow}{enter}{esc}');
        cy.contains('All agents');
      });
      inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
        parseSpecialCharSequences: false,
      });
      cy.wait(1000);
      submitQuery();
      cy.getBySel('flyout-body-osquery').within(() => {
        // at least 2 agents should have responded
        cy.get('[data-grid-row-index]').should('have.length.at.least', 2);
      });
    });
  });

  describe('Params in timeline', () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      loadRule(true).then((data) => {
        ruleId = data.rule_id;
        ruleName = data.name;
      });
    });
    after(() => {
      cleanupRule(ruleId);
    });
    it('should substitute params in osquery ran from timelines alerts', () => {
      loadRuleAlerts(ruleName);
      cy.getBySel('send-alert-to-timeline-button').first().click({ force: true });
      cy.getBySel('query-events-table').within(() => {
        cy.getBySel('expand-event').first().click();
      });
      takeOsqueryActionWithParams();
    });
  });
});
