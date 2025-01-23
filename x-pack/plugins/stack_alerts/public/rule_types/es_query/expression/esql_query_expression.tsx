/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { getFields, RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import { fetchFieldsFromESQL } from '@kbn/esql-editor';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  firstFieldOption,
  getTimeFieldOptions,
  getTimeOptions,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType } from '../types';
import { DEFAULT_VALUES, SERVERLESS_DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import { rowToDocument, toEsQueryHits, transformDatatableToEsqlTable } from '../../../../common';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors }) => {
  const { expressions, http, fieldFormats, isServerless, dataViews } = useTriggerUiActionServices();
  const { esqlQuery, timeWindowSize, timeWindowUnit, timeField } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<
    EsQueryRuleParams<SearchType.esqlQuery>
  >({
    ...ruleParams,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    // ESQL queries compare conditions within the ES query
    // so only 'met' results are returned, therefore the threshold should always be 0
    threshold: [0],
    thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: isServerless ? SERVERLESS_DEFAULT_VALUES.SIZE : DEFAULT_VALUES.SIZE,
    esqlQuery: esqlQuery ?? { esql: '' },
    aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
    groupBy: DEFAULT_VALUES.GROUP_BY,
    termSize: DEFAULT_VALUES.TERM_SIZE,
    searchType: SearchType.esqlQuery,
    // The sourceFields param is ignored for the ES|QL type
    sourceFields: [],
  });
  const [query, setQuery] = useState<AggregateQuery>(esqlQuery ?? { esql: '' });
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [detectedTimestamp, setDetectedTimestamp] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setParam = useCallback(
    (paramField: string, paramValue: unknown) => {
      setCurrentRuleParams((currentParams) => ({
        ...currentParams,
        [paramField]: paramValue,
      }));
      setRuleParams(paramField, paramValue);
    },
    [setRuleParams]
  );

  const setDefaultExpressionValues = () => {
    setRuleProperty('params', currentRuleParams);
    if (esqlQuery?.esql) {
      refreshTimeFields(esqlQuery);
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTestQuery = useCallback(async () => {
    const window = `${timeWindowSize}${timeWindowUnit}`;
    const emptyResult = {
      testResults: { results: [], truncated: false },
      isGrouped: true,
      timeWindow: window,
    };

    if (hasExpressionValidationErrors(currentRuleParams, isServerless)) {
      return emptyResult;
    }
    const timeWindow = parseDuration(window);
    const now = Date.now();
    setIsLoading(true);
    const table = await fetchFieldsFromESQL(
      esqlQuery,
      expressions,
      {
        from: new Date(now - timeWindow).toISOString(),
        to: new Date(now).toISOString(),
      },
      undefined,
      // create a data view with the timefield to pass into the query
      new DataView({
        spec: { timeFieldName: timeField },
        fieldFormats,
      })
    );
    if (table) {
      const esqlTable = transformDatatableToEsqlTable(table);
      const hits = toEsQueryHits(esqlTable);
      setIsLoading(false);
      return {
        testResults: parseAggregationResults({
          isCountAgg: true,
          isGroupAgg: false,
          esResult: {
            took: 0,
            timed_out: false,
            _shards: { failed: 0, successful: 0, total: 0 },
            hits,
          },
        }),
        isGrouped: false,
        timeWindow: window,
        rawResults: {
          cols: esqlTable.columns.map((col) => ({
            id: col.name,
            actions: false,
          })),
          rows: esqlTable.values.slice(0, 5).map((row) => rowToDocument(esqlTable.columns, row)),
        },
      };
    }
    return emptyResult;
  }, [
    timeWindowSize,
    timeWindowUnit,
    currentRuleParams,
    esqlQuery,
    expressions,
    fieldFormats,
    timeField,
    isServerless,
  ]);

  const refreshTimeFields = useCallback(
    async (q: AggregateQuery) => {
      const fetchTimeFieldsData = async (queryObj: AggregateQuery) => {
        try {
          const esqlDataView = await getESQLAdHocDataview(queryObj.esql, dataViews);
          const indexPattern: string = esqlDataView.getIndexPattern();
          const currentEsFields = await getFields(http, [indexPattern]);
          const newTimeFieldOptions = getTimeFieldOptions(currentEsFields);
          const timestampField = esqlDataView.timeFieldName;
          return { newTimeFieldOptions, timestampField };
        } catch (e) {
          return { newTimeFieldOptions: [], timestampField: undefined };
        }
      };

      const { newTimeFieldOptions, timestampField } = await fetchTimeFieldsData(q);
      setTimeFieldOptions([firstFieldOption, ...newTimeFieldOptions]);
      if (!timeField && timestampField) {
        setParam('timeField', timestampField);
      }
      setDetectedTimestamp(timestampField);
    },
    [timeField, setParam, dataViews, http]
  );

  return (
    <Fragment>
      <EuiFormRow
        id="queryEditor"
        data-test-subj="queryEsqlEditor"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.defineEsqlQueryPrompt"
            defaultMessage="Define your query using ES|QL"
          />
        }
      >
        <ESQLLangEditor
          query={query}
          onTextLangQueryChange={(q: AggregateQuery) => {
            setQuery(q);
            setParam('esqlQuery', q);
            refreshTimeFields(q);
          }}
          onTextLangQuerySubmit={async () => {}}
          detectedTimestamp={detectedTimestamp}
          hideRunQueryText={true}
          isLoading={isLoading}
          editorIsInline
          hasOutline
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        id="timeField"
        fullWidth
        // @ts-expect-error upgrade typescript v5.1.6
        isInvalid={errors.timeField.length > 0 && timeField !== undefined}
        error={errors.timeField as string[]}
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectEsqlQueryTimeFieldPrompt"
            defaultMessage="Select a time field"
          />
        }
      >
        <EuiSelect
          options={timeFieldOptions}
          // @ts-expect-error upgrade typescript v5.1.6
          isInvalid={errors.timeField.length > 0 && timeField !== undefined}
          fullWidth
          name="timeField"
          data-test-subj="timeFieldSelect"
          value={timeField || ''}
          onChange={(e) => {
            setParam('timeField', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFlexGroup alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="timeWindowSize"
            // @ts-expect-error upgrade typescript v5.1.6
            isInvalid={errors.timeWindowSize.length > 0}
            error={errors.timeWindowSize as string[]}
            label={
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.setEsqlQueryTimeWindowPrompt"
                defaultMessage="Set the time window"
              />
            }
          >
            <EuiFieldNumber
              name="timeWindowSize"
              data-test-subj="timeWindowSizeNumber"
              // @ts-expect-error upgrade typescript v5.1.6
              isInvalid={errors.timeWindowSize.length > 0}
              min={0}
              value={timeWindowSize || ''}
              onChange={(e) => {
                const { value } = e.target;
                const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : undefined;
                setParam('timeWindowSize', timeWindowSizeVal);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow id="timeWindowUnit">
            <EuiSelect
              name="timeWindowUnit"
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={(e) => {
                setParam('timeWindowUnit', e.target.value);
              }}
              options={getTimeOptions(timeWindowSize ?? 1)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams, isServerless)}
        showTable
      />
    </Fragment>
  );
};
