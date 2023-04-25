/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';
import {
  checkReturnedProcessesTable,
  inputConsoleCommand,
  openResponseConsoleFromEndpointList,
  performCommandInputChecks,
  submitCommand,
  waitForCommandToBeExecuted,
  waitForEndpointListPageToBeLoaded,
} from '../../tasks/response_console';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  getAgentByHostName,
  getEndpointIntegrationVersion,
  reassignAgentPolicy,
} from '../../tasks/fleet';
import {
  checkEndpointListForOnlyIsolatedHosts,
  checkEndpointListForOnlyUnIsolatedHosts,
  createAgentPolicyTask,
} from '../../tasks/isolate';
import { login } from '../../tasks/login';
import { ENDPOINT_VM_NAME } from '../../tasks/common';

describe('Response console', () => {
  const endpointHostname = Cypress.env(ENDPOINT_VM_NAME);

  beforeEach(() => {
    login();
  });

  describe('Isolate command', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });

      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version, (data) => {
          response = data;
        });
      });
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
    });

    it('should isolate host from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointListForOnlyUnIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('isolate');
      submitCommand();
      waitForCommandToBeExecuted();
      checkEndpointListForOnlyIsolatedHosts();
    });

    it('should release host from response console', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointListForOnlyIsolatedHosts();
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('release');
      submitCommand();
      waitForCommandToBeExecuted();
      waitForEndpointListPageToBeLoaded(endpointHostname);
      checkEndpointListForOnlyUnIsolatedHosts();
    });
  });

  describe('Processes command', () => {
    let response: IndexedFleetEndpointPolicyResponse;
    let initialAgentData: Agent;
    let cronPID: string;
    let newCronPID: string;

    before(() => {
      getAgentByHostName(endpointHostname).then((agentData) => {
        initialAgentData = agentData;
      });

      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version, (data) => {
          response = data;
        });
      });
    });

    after(() => {
      if (initialAgentData?.policy_id) {
        reassignAgentPolicy(initialAgentData.id, initialAgentData.policy_id);
      }
      if (response) {
        cy.task('deleteIndexedFleetEndpointPolicies', response);
      }
    });

    it('"processes" - should obtain a list of processes', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      performCommandInputChecks('processes');
      submitCommand();
      cy.contains('Action pending.').should('exist');
      cy.getByTestSubj('getProcessesSuccessCallout', { timeout: 120000 }).within(() => {
        checkReturnedProcessesTable()
          .find('td')
          .contains('/usr/sbin/cron')
          .then((td) => {
            cronPID = td.parents('tr').find('td').eq(1).find('span').text();
          });
      });
    });

    it('"kill-process --pid" - should kill a process', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`kill-process --pid ${cronPID}`);
      submitCommand();
      waitForCommandToBeExecuted();

      performCommandInputChecks('processes');
      submitCommand();

      cy.getByTestSubj('getProcessesSuccessCallout', { timeout: 120000 }).within(() => {
        cy.get('tbody')
          .find('td')
          .contains('/usr/sbin/cron')
          .then((td) => {
            newCronPID = td.parents('tr').find('td').eq(1).find('span').text();
            expect(newCronPID).to.not.equal(cronPID);
          });
      });
    });

    it('"suspend-process --pid" - should suspend a process', () => {
      waitForEndpointListPageToBeLoaded(endpointHostname);
      openResponseConsoleFromEndpointList();
      inputConsoleCommand(`suspend-process --pid ${newCronPID}`);
      submitCommand();
      waitForCommandToBeExecuted();
    });
  });
});
