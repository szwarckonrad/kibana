/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFieldText, EuiFormRow, EuiLink, EuiSelect, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../../../hooks';

import { kafkaSupportedVersions } from '../../../../../../../common/constants';

import { MultiRowInput } from '../multi_row_input';

import { OutputFormKafkaTopics } from './output_form_kafka_topics';

import { OutputFormKafkaHeaders } from './output_form_kafka_headers';

import { OutputFormKafkaBroker } from './output_form_kafka_broker';

import { OutputFormKafkaCompression } from './output_form_kafka_compression';

import { OutputFormKafkaPartitioning } from './output_form_kafka_partitioning';

import { OutputFormKafkaAuthentication } from './output_form_kafka_authentication';

import type { OutputFormInputsType } from './use_output_form';

interface Props {
  inputs: OutputFormInputsType;
}

export const OutputFormKafkaSection: React.FunctionComponent<Props> = (props) => {
  const { inputs } = props;

  const { docLinks } = useStartServices();

  const kafkaVersionOptions = useMemo(
    () =>
      kafkaSupportedVersions.map((version) => ({
        text: version,
        label: version,
      })),
    []
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaVersionInputLabel"
            defaultMessage="Kafka version"
          />
        }
      >
        <EuiSelect
          fullWidth
          data-test-subj="settingsOutputsFlyout.kafkaVersionInput"
          {...inputs.kafkaVersionInput.props}
          options={kafkaVersionOptions}
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaVersionInputPlaceholder',
            {
              defaultMessage: 'Specify version',
            }
          )}
        />
      </EuiFormRow>

      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.kafkaHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host',
          }
        )}
        sortable={false}
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.logstashHostsInputDescription"
            defaultMessage="Specify the URLs that your agents will use to connect to Kafka. For more information, see the {guideLink}."
            values={{
              guideLink: (
                <EuiLink href={docLinks.links.fleet.settings} target="_blank" external>
                  <FormattedMessage
                    id="xpack.fleet.settings.fleetUserGuideLink"
                    defaultMessage="Fleet User Guide"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaHostsInputLabel', {
          defaultMessage: 'Hosts',
        })}
        {...inputs.kafkaHostsInput.props}
      />
      <EuiSpacer size="m" />

      <OutputFormKafkaAuthentication inputs={inputs} />
      <EuiSpacer size="m" />

      <OutputFormKafkaPartitioning inputs={inputs} />
      <EuiSpacer size="m" />

      <OutputFormKafkaTopics inputs={inputs} />
      <EuiSpacer size="m" />

      <OutputFormKafkaHeaders inputs={inputs} />
      <EuiSpacer size="m" />

      <OutputFormKafkaCompression inputs={inputs} />
      <EuiSpacer size="m" />

      <OutputFormKafkaBroker inputs={inputs} />
      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaKeyInputLabel"
            defaultMessage="Key (optional)"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.kafkaKeyInputHelpText"
            defaultMessage="If configured, the event key can be extracted from the event using a format string."
          />
        }
      >
        <EuiFieldText
          data-test-subj="settingsOutputsFlyout.kafkaKeyInput"
          fullWidth
          {...inputs.kafkaKeyInput.props}
        />
      </EuiFormRow>

      {/* <EuiPanel*/}
      {/*  borderRadius="m"*/}
      {/*  hasShadow={false}*/}
      {/*  paddingSize={'m'}*/}
      {/*  color={'subdued'}*/}
      {/*  data-test-subj="settingsOutputsFlyout.kafkaTopicsPanel"*/}
      {/* > */}
      {/*  <EuiTitle size="s">*/}
      {/*    <h3 id="FleetEditOutputFlyoutKafkaTopicsTitle">*/}
      {/*      <FormattedMessage*/}
      {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsTitle"*/}
      {/*        defaultMessage="Topics"*/}
      {/*      />*/}
      {/*    </h3>*/}
      {/*  </EuiTitle>*/}
      {/*  <EuiSpacer size="m" />*/}
      {/* </EuiPanel>*/}
      {/* <EuiPanel*/}
      {/*  borderRadius="m"*/}
      {/*  hasShadow={false}*/}
      {/*  paddingSize={'m'}*/}
      {/*  color={'subdued'}*/}
      {/*  data-test-subj="settingsOutputsFlyout.kafkaHeadersPanel"*/}
      {/* >*/}
      {/*  <EuiTitle size="s">*/}
      {/*    <h3 id="FleetEditOutputFlyoutKafkaHeadersTitle">*/}
      {/*      <FormattedMessage*/}
      {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersTitle"*/}
      {/*        defaultMessage="Headers"*/}
      {/*      />*/}
      {/*    </h3>*/}
      {/*  </EuiTitle>*/}
      {/*  <EuiSpacer size="m" />*/}
      {/*  <MultiRowInput multiline={false} sortable={false} {...inputs.kafkaHeadersInput.props} />*/}
      {/*  <EuiFormRow*/}
      {/*    fullWidth*/}
      {/*    label={*/}
      {/*      <FormattedMessage*/}
      {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersKeyInputLabel"*/}
      {/*        defaultMessage="Key"*/}
      {/*      />*/}
      {/*    }*/}
      {/*  >*/}
      {/*    <EuiFieldText*/}
      {/*      data-test-subj="settingsOutputsFlyout.kafkaHeadersKeyInput"*/}
      {/*      fullWidth*/}
      {/*      {...inputs.kafkaHeadersKeyInput.props}*/}
      {/*    />*/}
      {/*  </EuiFormRow>*/}
      {/*  <EuiFormRow*/}
      {/*    fullWidth*/}
      {/*    label={*/}
      {/*      <FormattedMessage*/}
      {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersValueLabel"*/}
      {/*        defaultMessage="Value"*/}
      {/*      />*/}
      {/*    }*/}
      {/*  >*/}
      {/*    <EuiFieldText*/}
      {/*      data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeHashInput"*/}
      {/*      fullWidth*/}
      {/*      {...inputs.kafkaHeadersValueInput.props}*/}
      {/*    />*/}
      {/*  </EuiFormRow>*/}
      {/* </EuiPanel>*/}
    </>
  );
};
