/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IbmResilientConnectorOptions,
  JiraConnectorOptions,
  ServiceNowconnectorOptions,
  TestCase,
  TestCaseWithoutTimeline,
} from '../objects/case';
import { ALL_CASES_OPEN_CASES_COUNT, ALL_CASES_OPEN_FILTER } from '../screens/all_cases';

import { TIMELINE_SEARCHBOX } from '../screens/common/controls';
import {
  BACK_TO_CASES_BTN,
  DESCRIPTION_INPUT,
  SUBMIT_BTN,
  INSERT_TIMELINE_BTN,
  LOADING_SPINNER,
  TAGS_INPUT,
  TITLE_INPUT,
} from '../screens/create_new_case';
import {
  CONNECTOR_RESILIENT,
  CONNECTOR_SELECTOR,
  SELECT_IMPACT,
  SELECT_INCIDENT_TYPE,
  SELECT_ISSUE_TYPE,
  SELECT_JIRA,
  SELECT_PRIORITY,
  SELECT_RESILIENT,
  SELECT_SEVERITY,
  SELECT_SN,
  SELECT_URGENCY,
} from '../screens/edit_connector';

export const backToCases = () => {
  cy.get(BACK_TO_CASES_BTN).click();
};

export const filterStatusOpen = () => {
  cy.get(ALL_CASES_OPEN_CASES_COUNT).click();
  cy.get(ALL_CASES_OPEN_FILTER).click();
};

export const fillCasesMandatoryfields = (newCase: TestCaseWithoutTimeline) => {
  cy.get(TITLE_INPUT).focus();
  cy.get(TITLE_INPUT).filter(':visible').type(newCase.name);
  newCase.tags.forEach((tag) => {
    cy.get(TAGS_INPUT).type(`${tag}`);
    cy.get(TAGS_INPUT).realPress('Enter');
  });
  cy.get(DESCRIPTION_INPUT).type(`${newCase.description} `);
};

export const attachTimeline = (newCase: TestCase) => {
  cy.get(INSERT_TIMELINE_BTN).click();
  cy.get(TIMELINE_SEARCHBOX).type(`${newCase.timeline.title}{enter}`);
};

export const createCase = () => {
  cy.get(SUBMIT_BTN).click();
  cy.get(LOADING_SPINNER).should('exist');
  cy.get(LOADING_SPINNER).should('not.exist');
};

export const fillJiraConnectorOptions = (jiraConnector: JiraConnectorOptions) => {
  cy.get(CONNECTOR_SELECTOR).click();
  cy.get(SELECT_JIRA).click();
  cy.get(SELECT_ISSUE_TYPE).should('exist');
  cy.get(SELECT_ISSUE_TYPE).select(jiraConnector.issueType);

  cy.get(SELECT_PRIORITY).should('exist');
  cy.get(SELECT_PRIORITY).select(jiraConnector.priority);
};

export const fillServiceNowConnectorOptions = (
  serviceNowConnectorOpions: ServiceNowconnectorOptions
) => {
  cy.get(CONNECTOR_SELECTOR).click();
  cy.get(SELECT_SN).click();
  cy.get(SELECT_SEVERITY).should('exist');
  cy.get(SELECT_URGENCY).should('exist');
  cy.get(SELECT_IMPACT).should('exist');
  cy.get(SELECT_URGENCY).select(serviceNowConnectorOpions.urgency);
  cy.get(SELECT_SEVERITY).select(serviceNowConnectorOpions.severity);
  cy.get(SELECT_IMPACT).select(serviceNowConnectorOpions.impact);
};

export const fillIbmResilientConnectorOptions = (
  ibmResilientConnector: IbmResilientConnectorOptions
) => {
  cy.get(CONNECTOR_SELECTOR).click();
  cy.get(SELECT_RESILIENT).click();
  cy.get(SELECT_INCIDENT_TYPE).should('exist');
  cy.get(SELECT_SEVERITY).should('exist');
  ibmResilientConnector.incidentTypes.forEach((incidentType) => {
    cy.get(SELECT_INCIDENT_TYPE).type(`${incidentType}{enter}`);
  });
  cy.get(CONNECTOR_RESILIENT).click();
  cy.get(SELECT_SEVERITY).select(ibmResilientConnector.severity);
};
