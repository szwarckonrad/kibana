/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestCaseWithoutTimeline } from '../../objects/case';
import { ALL_CASES_CREATE_NEW_CASE_BTN, ALL_CASES_NAME } from '../../screens/all_cases';

import { goToCreateNewCase } from '../../tasks/all_cases';
import { cleanKibana, deleteCases } from '../../tasks/common';

import {
  backToCases,
  createCase,
  fillCasesMandatoryfields,
  filterStatusOpen,
} from '../../tasks/create_new_case';
import {
  login,
  loginWithUser,
  logout,
  visitHostDetailsPage,
  visitWithUser,
} from '../../tasks/login';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
  secAll,
  secAllUser,
  secReadCasesAllUser,
  secReadCasesAll,
  secAllCasesNoDelete,
  secAllCasesNoDeleteUser,
  secAllCasesOnlyReadDeleteUser,
  secAllCasesOnlyReadDelete,
} from '../../tasks/privileges';

import { CASES_URL } from '../../urls/navigation';
import { openSourcerer } from '../../tasks/sourcerer';
const usersToCreate = [
  secAllUser,
  secReadCasesAllUser,
  secAllCasesNoDeleteUser,
  secAllCasesOnlyReadDeleteUser,
];
const rolesToCreate = [secAll, secReadCasesAll, secAllCasesNoDelete, secAllCasesOnlyReadDelete];
// needed to generate index pattern
const visitSecuritySolution = () => {
  visitHostDetailsPage();
  openSourcerer();
  logout();
};

const testCase: TestCaseWithoutTimeline = {
  name: 'This is the title of the case',
  tags: ['Tag1', 'Tag2'],
  description: 'This is the case description',
  reporter: 'elastic',
  owner: 'securitySolution',
};

describe('Cases privileges', () => {
  before(() => {
    cleanKibana();
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
  });

  beforeEach(() => {
    login();
    visitSecuritySolution();
    deleteCases();
  });

  for (const user of [secAllUser, secReadCasesAllUser, secAllCasesNoDeleteUser]) {
    it(`User ${user.username} with role(s) ${user.roles.join()} can create a case`, () => {
      loginWithUser(user);
      visitWithUser(CASES_URL, user);
      goToCreateNewCase();
      fillCasesMandatoryfields(testCase);
      createCase();
      backToCases();
      filterStatusOpen();

      cy.get(ALL_CASES_NAME).should('have.text', testCase.name);
    });
  }

  for (const user of [secAllCasesOnlyReadDeleteUser]) {
    it(`User ${user.username} with role(s) ${user.roles.join()} cannot create a case`, () => {
      loginWithUser(user);
      visitWithUser(CASES_URL, user);
      cy.get(ALL_CASES_CREATE_NEW_CASE_BTN).should('not.exist');
    });
  }
});
