/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Prompt } from '@kbn/observability-shared-plugin/public';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { useLogViewContext } from '@kbn/logs-shared-plugin/public';
import type { LogView, LogViewAttributes, LogViewStatus } from '@kbn/logs-shared-plugin/common';
import { SourceErrorPage } from '../../../components/source_error_page';
import { LogsDeprecationCallout } from '../../../components/logs_deprecation_callout';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useLogsBreadcrumbs } from '../../../hooks/use_logs_breadcrumbs';
import { settingsTitle } from '../../../translations';
import { LogsPageTemplate } from '../shared/page_template';
import { IndicesConfigurationPanel } from './indices_configuration_panel';
import { LogColumnsConfigurationPanel } from './log_columns_configuration_panel';
import { NameConfigurationPanel } from './name_configuration_panel';
import { LogSourceConfigurationFormErrors } from './source_configuration_form_errors';
import { useLogSourceConfigurationFormState } from './source_configuration_form_state';
import { InlineLogViewCallout } from './inline_log_view_callout';

export const LogsSettingsPage = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const shouldAllowEdit = uiCapabilities?.logs?.configureSource === true;

  useTrackPageview({ app: 'infra_logs', path: 'log_source_configuration' });
  useTrackPageview({
    app: 'infra_logs',
    path: 'log_source_configuration',
    delay: 15000,
  });

  useLogsBreadcrumbs([
    {
      text: settingsTitle,
    },
  ]);

  const {
    hasFailedLoadingLogView,
    isInlineLogView,
    isLoading,
    isUninitialized,
    latestLoadLogViewFailures,
    logView,
    logViewStatus,
    resolvedLogView,
    retry,
    revertToDefaultLogView,
    update,
  } = useLogViewContext();

  const availableFields = useMemo(
    () => resolvedLogView?.fields.map((field) => field.name) ?? [],
    [resolvedLogView]
  );

  const isWriteable = shouldAllowEdit && logView != null && logView.origin !== 'internal';

  if ((isLoading || isUninitialized) && logView == null) {
    return <SourceLoadingPage />;
  } else if (hasFailedLoadingLogView || logView == null) {
    return <SourceErrorPage errorMessage={latestLoadLogViewFailures[0].message} retry={retry} />;
  } else {
    return (
      <LogsSettingsPageContent
        availableFields={availableFields}
        isInlineLogView={isInlineLogView}
        isLoading={isLoading}
        isWriteable={isWriteable}
        logView={logView}
        logViewStatus={logViewStatus}
        revertToDefaultLogView={revertToDefaultLogView}
        onUpdateLogViewAttributes={update}
      />
    );
  }
};

const LogsSettingsPageContent = ({
  availableFields,
  isInlineLogView,
  isLoading,
  isWriteable,
  logView,
  logViewStatus,
  revertToDefaultLogView,
  onUpdateLogViewAttributes,
}: {
  availableFields: string[];
  isInlineLogView: boolean;
  isLoading: boolean;
  isWriteable: boolean;
  logView: LogView;
  logViewStatus: LogViewStatus;
  revertToDefaultLogView: () => void;
  onUpdateLogViewAttributes: (logViewAttributes: Partial<LogViewAttributes>) => Promise<void>;
}) => {
  const {
    sourceConfigurationFormElement,
    formState,
    logIndicesFormElement,
    logColumnsFormElement,
    nameFormElement,
  } = useLogSourceConfigurationFormState(logView?.attributes);

  const persistUpdates = useCallback(async () => {
    try {
      await onUpdateLogViewAttributes(formState);
      sourceConfigurationFormElement.resetValue();
    } catch {
      // the error is handled in the state machine already, but without this the
      // global promise rejection tracker would complain about it being
      // unhandled
    }
  }, [onUpdateLogViewAttributes, sourceConfigurationFormElement, formState]);

  return (
    <EuiErrorBoundary>
      <LogsPageTemplate
        pageHeader={{
          pageTitle: settingsTitle,
        }}
        data-test-subj="sourceConfigurationContent"
        restrictWidth
      >
        <LogsDeprecationCallout page="settings" />
        <Prompt
          prompt={sourceConfigurationFormElement.isDirty ? unsavedFormPromptMessage : undefined}
        />
        {isInlineLogView && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <InlineLogViewCallout revertToDefaultLogView={revertToDefaultLogView} />
              <EuiSpacer />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
          <NameConfigurationPanel
            isLoading={isLoading}
            isReadOnly={!isWriteable}
            nameFormElement={nameFormElement}
          />
        </EuiPanel>
        <EuiSpacer />
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
          <IndicesConfigurationPanel
            isLoading={isLoading}
            isReadOnly={!isWriteable}
            indicesFormElement={logIndicesFormElement}
            logViewStatus={logViewStatus}
          />
        </EuiPanel>
        <EuiSpacer />
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
          <LogColumnsConfigurationPanel
            availableFields={availableFields}
            isLoading={isLoading}
            logColumnsFormElement={logColumnsFormElement}
          />
        </EuiPanel>
        <EuiSpacer />
        {sourceConfigurationFormElement.validity.validity === 'invalid' ? (
          <>
            <LogSourceConfigurationFormErrors
              errors={sourceConfigurationFormElement.validity.reasons}
            />
            <EuiSpacer />
          </>
        ) : null}
        <EuiFlexGroup>
          {isWriteable && (
            <EuiFlexItem>
              {isLoading ? (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="infraLogsSettingsPageLoadingButton"
                      color="primary"
                      isLoading
                      fill
                    >
                      {i18n.translate('xpack.infra.logsSettingsPage.loadingButtonLabel', {
                        defaultMessage: 'Loading',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="discardSettingsButton"
                      color="danger"
                      iconType="cross"
                      isDisabled={isLoading || !sourceConfigurationFormElement.isDirty}
                      onClick={() => {
                        sourceConfigurationFormElement.resetValue();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.infra.sourceConfiguration.discardSettingsButtonLabel"
                        defaultMessage="Discard"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="applySettingsButton"
                      color="primary"
                      isDisabled={
                        !sourceConfigurationFormElement.isDirty ||
                        sourceConfigurationFormElement.validity.validity !== 'valid'
                      }
                      fill
                      onClick={persistUpdates}
                    >
                      <FormattedMessage
                        id="xpack.infra.sourceConfiguration.applySettingsButtonLabel"
                        defaultMessage="Apply"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </LogsPageTemplate>
    </EuiErrorBoundary>
  );
};

const unsavedFormPromptMessage = i18n.translate(
  'xpack.infra.logSourceConfiguration.unsavedFormPromptMessage',
  {
    defaultMessage: 'Are you sure you want to leave? Changes will be lost',
  }
);
