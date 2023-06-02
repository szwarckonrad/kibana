/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, mergeWith, isArray, uniq } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { AppFeatureKibanaConfig, SubFeaturesPrivileges } from './types';

export class AppFeaturesConfigMerger {
  constructor(private readonly logger: Logger) {}

  /**
   * Merges `appFeaturesConfigs` into `kibanaFeatureConfig`.
   * @param kibanaFeatureConfig the KibanaFeatureConfig to merge into
   * @param appFeaturesConfigs the AppFeatureKibanaConfig to merge
   * @returns mergedKibanaFeatureConfig the merged KibanaFeatureConfig
   * */
  public mergeAppFeatureConfigs(
    kibanaFeatureConfig: KibanaFeatureConfig,
    appFeaturesConfigs: AppFeatureKibanaConfig[]
  ): KibanaFeatureConfig {
    const mergedKibanaFeatureConfig = cloneDeep(kibanaFeatureConfig);
    const subFeaturesPrivilegesToMerge: SubFeaturesPrivileges[] = [];

    appFeaturesConfigs.forEach((appFeatureConfig) => {
      const { subFeaturesPrivileges, ...appFeatureConfigToMerge } = cloneDeep(appFeatureConfig);
      if (subFeaturesPrivileges) {
        subFeaturesPrivilegesToMerge.push(...subFeaturesPrivileges);
      }
      mergeWith(mergedKibanaFeatureConfig, appFeatureConfigToMerge, featureConfigMerger);
    });

    // add subFeaturePrivileges at the end to make sure all enabled subFeatures are merged
    subFeaturesPrivilegesToMerge.forEach((subFeaturesPrivileges) => {
      this.mergeSubFeaturesPrivileges(mergedKibanaFeatureConfig.subFeatures, subFeaturesPrivileges);
    });

    return mergedKibanaFeatureConfig;
  }

  /**
   * Merges `subFeaturesPrivileges` into `kibanaFeatureConfig.subFeatures` by finding the subFeature privilege id.
   * @param subFeatures the subFeatures to merge into
   * @param subFeaturesPrivileges the subFeaturesPrivileges to merge
   * @returns void
   * */
  private mergeSubFeaturesPrivileges(
    subFeatures: KibanaFeatureConfig['subFeatures'],
    subFeaturesPrivileges: SubFeaturesPrivileges
  ): void {
    if (!subFeatures) {
      this.logger.warn('Trying to merge subFeaturesPrivileges but no subFeatures found');
      return;
    }
    const merged = subFeatures.find(({ privilegeGroups }) =>
      privilegeGroups.some(({ privileges }) => {
        const subFeaturePrivilegeToUpdate = privileges.find(
          ({ id }) => id === subFeaturesPrivileges.id
        );
        if (subFeaturePrivilegeToUpdate) {
          mergeWith(subFeaturePrivilegeToUpdate, subFeaturesPrivileges, featureConfigMerger);
          return true;
        }
        return false;
      })
    );
    if (!merged) {
      this.logger.warn(
        `Trying to merge subFeaturesPrivileges ${subFeaturesPrivileges.id} but the subFeature privilege was not found`
      );
    }
  }
}

/**
 * The customizer used by lodash.mergeWith to merge deep objects
 * Uses concatenation for arrays and removes duplicates, objects are merged using lodash.mergeWith default behavior
 * */
function featureConfigMerger(objValue: unknown, srcValue: unknown) {
  if (isArray(srcValue)) {
    if (isArray(objValue)) {
      return uniq(objValue.concat(srcValue));
    }
    return srcValue;
  }
}
