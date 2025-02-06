/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  IlmLocatorParams,
  Phases,
  PolicyFromES,
} from '@kbn/index-lifecycle-management-common-shared';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  IngestStreamGetResponse,
  IngestStreamLifecycle,
  StreamGetResponse,
  isIlmLifecycle,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import useToggle from 'react-use/lib/useToggle';

export type LifecycleEditAction = 'none' | 'dsl' | 'ilm' | 'inherit';

interface ModalOptions {
  closeModal: () => void;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  getIlmPolicies: () => Promise<PolicyFromES[]>;
  definition: IngestStreamGetResponse;
  updateInProgress: boolean;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
}

export function EditLifecycleModal({
  action,
  ...options
}: { action: LifecycleEditAction } & ModalOptions) {
  if (action === 'none') {
    return null;
  }

  if (action === 'dsl') {
    return <DslModal {...options} />;
  }

  if (action === 'ilm') {
    return <IlmModal {...options} />;
  }

  return <InheritModal {...options} />;
}

function DslModal({ closeModal, definition, updateInProgress, updateLifecycle }: ModalOptions) {
  const timeUnits = [
    { name: 'Days', value: 'd' },
    { name: 'Hours', value: 'h' },
    { name: 'Minutes', value: 'm' },
    { name: 'Seconds', value: 's' },
  ];

  const [selectedUnit, setSelectedUnit] = useState(timeUnits[0]);
  const [retentionValue, setRetentionValue] = useState(1);
  const [noRetention, toggleNoRetention] = useToggle(false);
  const [showUnitMenu, { on: openUnitMenu, off: closeUnitMenu }] = useBoolean(false);

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.streamDetailLifecycle.editRetention', {
            defaultMessage: 'Edit data retention for stream',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.setCustomDsl', {
          defaultMessage: 'Specify a custom data retention period for this stream.',
        })}
        <EuiSpacer />
        <EuiFieldNumber
          data-test-subj="streamsAppDslModalFieldNumber"
          value={retentionValue}
          onChange={(e) => {
            const valueAsNumber = e.target.valueAsNumber;
            if (isNaN(valueAsNumber) || valueAsNumber < 1) {
              setRetentionValue(1);
            } else {
              setRetentionValue(valueAsNumber);
            }
          }}
          min={1}
          disabled={noRetention}
          fullWidth
          append={
            <EuiPopover
              isOpen={showUnitMenu}
              panelPaddingSize="none"
              closePopover={closeUnitMenu}
              button={
                <EuiButton
                  data-test-subj="streamsAppDslModalButton"
                  disabled={noRetention}
                  iconType="arrowDown"
                  iconSide="right"
                  color="text"
                  onClick={openUnitMenu}
                >
                  {selectedUnit.name}
                </EuiButton>
              }
            >
              <EuiContextMenuPanel
                size="s"
                items={timeUnits.map((unit) => (
                  <EuiContextMenuItem
                    key={unit.value}
                    icon={selectedUnit.value === unit.value ? 'check' : 'empty'}
                    onClick={() => {
                      closeUnitMenu();
                      setSelectedUnit(unit);
                    }}
                  >
                    {unit.name}
                  </EuiContextMenuItem>
                ))}
              />
            </EuiPopover>
          }
        />
        <EuiSpacer />
        <EuiSwitch
          label={i18n.translate('xpack.streams.streamDetailLifecycle.keepDataIndefinitely', {
            defaultMessage: 'Keep data indefinitely',
          })}
          checked={noRetention}
          onChange={() => toggleNoRetention()}
        />
        <EuiSpacer />
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel="Save"
        closeModal={closeModal}
        onConfirm={() => {
          updateLifecycle({
            dsl: {
              data_retention: noRetention ? undefined : `${retentionValue}${selectedUnit.value}`,
            },
          });
        }}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

interface IlmOptionData {
  phases?: string;
}

function IlmModal({
  closeModal,
  updateLifecycle,
  updateInProgress,
  getIlmPolicies,
  ilmLocator,
  definition,
}: ModalOptions) {
  const existingLifecycle = definition.stream.ingest.lifecycle;
  const [selectedPolicy, setSelectedPolicy] = useState(
    isIlmLifecycle(existingLifecycle) ? existingLifecycle.ilm.policy : undefined
  );
  const [policies, setPolicies] = useState<Array<EuiSelectableOption<IlmOptionData>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    const phasesDescription = (phases: Phases) => {
      const desc: string[] = [];
      if (phases.hot) {
        const rollover = phases.hot.actions.rollover;
        const rolloverWhen = [
          rollover?.max_age && 'max age ' + rollover.max_age,
          rollover?.max_docs && 'max docs ' + rollover.max_docs,
          rollover?.max_primary_shard_docs &&
            'primary shard docs ' + rollover.max_primary_shard_docs,
          rollover?.max_primary_shard_size &&
            'primary shard size ' + rollover.max_primary_shard_size,
          rollover?.max_size && 'index size ' + rollover.max_size,
        ]
          .filter(Boolean)
          .join(' or ');
        desc.push(`Hot (${rolloverWhen ? 'rollover when ' + rolloverWhen : 'no rollover'})`);
      }
      if (phases.warm) {
        desc.push(`Warm after ${phases.warm.min_age}`);
      }
      if (phases.cold) {
        desc.push(`Cold after ${phases.cold.min_age}`);
      }
      if (phases.frozen) {
        desc.push(`Frozen after ${phases.frozen.min_age}`);
      }
      if (phases.delete) {
        desc.push(`Delete after ${phases.delete.min_age}`);
      } else {
        desc.push('Keep data indefinitely');
      }

      return desc.join(', ');
    };

    setIsLoading(true);
    getIlmPolicies()
      .then((ilmPolicies) => {
        const policyOptions = ilmPolicies.map(
          ({ name, policy }): EuiSelectableOption<IlmOptionData> => ({
            label: `${name}`,
            searchableLabel: name,
            checked: selectedPolicy === name ? 'on' : undefined,
            data: {
              phases: phasesDescription(policy.phases),
            },
          })
        );

        setPolicies(policyOptions);
      })
      .catch((error) => {
        setErrorMessage('body' in error ? error.body.message : error.message);
      })
      .finally(() => setIsLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.streamDetailLifecycle.attachIlm', {
            defaultMessage: 'Attach a lifecycle policy to this stream',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.selectIlmOrVisit1', {
          defaultMessage: 'Select a pre-defined policy or visit',
        })}{' '}
        <EuiLink
          data-test-subj="streamsAppIlmModalIndexLifecyclePoliciesLink"
          target="_blank"
          href={ilmLocator?.getRedirectUrl({ page: 'policies_list' })}
        >
          {i18n.translate('xpack.streams.streamDetailLifecycle.selectIlmOrVisit2', {
            defaultMessage: 'Index Lifecycle Policies',
          })}
        </EuiLink>{' '}
        {i18n.translate('xpack.streams.streamDetailLifecycle.selectIlmOrVisit3', {
          defaultMessage: 'to create a new one.',
        })}
        <EuiSpacer />
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          <EuiSelectable
            searchable
            singleSelection
            isLoading={isLoading}
            options={policies}
            errorMessage={errorMessage}
            onChange={(options) => {
              setSelectedPolicy(options.find((option) => option.checked === 'on')?.label);
              setPolicies(options);
            }}
            listProps={{
              rowHeight: 45,
            }}
            renderOption={(option: EuiSelectableOption<IlmOptionData>, searchValue: string) => (
              <>
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
                <EuiText size="xs" color="subdued" className="eui-displayBlock">
                  <small>
                    <EuiHighlight search={searchValue}>{option.phases || ''}</EuiHighlight>
                  </small>
                </EuiText>
              </>
            )}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiPanel>
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel="Attach policy"
        closeModal={closeModal}
        onConfirm={() => {
          if (selectedPolicy) {
            updateLifecycle({ ilm: { policy: selectedPolicy } });
          }
        }}
        confirmationIsDisabled={!selectedPolicy}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function InheritModal({ definition, closeModal, updateInProgress, updateLifecycle }: ModalOptions) {
  return (
    <EuiModal onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleTitle', {
            defaultMessage: 'Set data retention to default',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {isWiredStreamGetResponse(definition)
          ? i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleWiredDesc', {
              defaultMessage:
                'All custom retention settings for this stream will be removed, resetting it to inherit data retention from its nearest parent.',
            })
          : i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleUnwiredDesc', {
              defaultMessage:
                'All custom retention settings for this stream will be removed, resetting it to use the configuration of the data stream.',
            })}
        <EuiSpacer />
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel="Set to default"
        closeModal={closeModal}
        onConfirm={() => updateLifecycle({ inherit: {} })}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function ModalFooter({
  definition,
  updateInProgress,
  confirmationLabel,
  confirmationIsDisabled,
  onConfirm,
  closeModal,
}: {
  definition: StreamGetResponse;
  updateInProgress: boolean;
  confirmationLabel: string;
  confirmationIsDisabled?: boolean;
  onConfirm: () => void;
  closeModal: () => void;
}) {
  return (
    <EuiModalFooter>
      <EuiFlexGroup direction="column">
        {isWiredStreamGetResponse(definition) ? (
          <EuiFlexItem>
            <EuiCallOut
              title={i18n.translate(
                'xpack.streams.streamDetailLifecycle.lifecycleDependentImpactTitle',
                {
                  defaultMessage: 'Retention changes for dependent streams',
                }
              )}
              iconType="logstashFilter"
            >
              <p>
                {i18n.translate(
                  'xpack.streams.streamDetailLifecycle.lifecycleDependentImpactDesc',
                  {
                    defaultMessage:
                      'Data retention changes will apply to dependant streams unless they already have custom retention settings in place.',
                  }
                )}
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="streamsAppModalFooterCancelButton"
                disabled={updateInProgress}
                color="primary"
                onClick={() => closeModal()}
              >
                {i18n.translate('xpack.streams.streamDetailLifecycle.cancelLifecycleUpdate', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="streamsAppModalFooterButton"
                fill
                disabled={confirmationIsDisabled}
                isLoading={updateInProgress}
                onClick={() => onConfirm()}
              >
                {confirmationLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalFooter>
  );
}
