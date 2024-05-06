/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { mockTimelineData } from '../../../../../../common/mock';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { SuricataDetails } from './suricata_details';
import { waitFor } from '@testing-library/react';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/link_to');

describe('SuricataDetails', () => {
  const mount = useMountAppended();

  const getWrapper = async (childrenComponent: JSX.Element) => {
    const wrapper = mount(childrenComponent);
    await waitFor(() => wrapper.find('[data-test-subj="suricataRefs"]').exists()); // check for presence of query input
    return wrapper;
  };
  describe('rendering', () => {
    test('it renders the default SuricataDetails', () => {
      const wrapper = shallow(<SuricataDetails data={mockTimelineData[2].ecs} timelineId="test" />);
      expect(wrapper).toMatchSnapshot();
    });

    test('it returns text if the data does contain suricata data', async () => {
      const wrapper = await getWrapper(
        <TestProviders>
          <SuricataDetails data={mockTimelineData[2].ecs} timelineId="test" />
        </TestProviders>
      );
      const removeEuiIconText = removeExternalLinkText(wrapper.text()).replaceAll(
        'External link',
        ''
      );
      expect(removeEuiIconText).toEqual(
        '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
      );
    });

    test('it returns null for text if the data contains no suricata data', () => {
      const wrapper = shallow(<SuricataDetails data={mockTimelineData[0].ecs} timelineId="test" />);
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });
  });
});
