/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configureStore, getDefaultMiddleware, PreloadedState } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import { makeLensReducer, lensActions } from './lens_slice';
import { LensState, LensStoreDeps } from './types';
import { initMiddleware } from './init_middleware';
import { optimizingMiddleware } from './optimizing_middleware';
import { contextMiddleware } from './context_middleware';
import { fullscreenMiddleware } from './fullscreen_middleware';
export * from './types';
export * from './selectors';

export const {
  loadInitial,
  navigateAway,
  setState,
  enableAutoApply,
  disableAutoApply,
  applyChanges,
  setSaveable,
  onActiveDataChange,
  updateDatasourceState,
  updateVisualizationState,
  insertLayer,
  switchVisualization,
  rollbackSuggestion,
  submitSuggestion,
  switchDatasource,
  switchAndCleanDatasource,
  updateIndexPatterns,
  setToggleFullscreen,
  initEmpty,
  editVisualizationAction,
  removeLayers,
  removeOrClearLayer,
  cloneLayer,
  addLayer,
  onDimensionDrop,
  setLayerDefaultDimension,
  removeDimension,
  setIsLoadLibraryVisible,
  registerLibraryAnnotationGroup,
  changeIndexPattern,
} = lensActions;

export const makeConfigureStore = (
  storeDeps: LensStoreDeps,
  preloadedState: PreloadedState<LensState>
) => {
  const middleware = [
    ...getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: [
          'payload.dataViews.indexPatterns',
          'payload.redirectCallback',
          'payload.history',
          'payload.newState.dataViews',
          'lens.activeData',
          'payload.source.filterOperations',
          'payload.target.filterOperations',
        ],
        ignoredPaths: ['lens.dataViews.indexPatterns'],
      },
    }),
    initMiddleware(storeDeps),
    optimizingMiddleware(),
    contextMiddleware(storeDeps),
    fullscreenMiddleware(storeDeps),
  ];
  if (process.env.NODE_ENV === 'development') {
    middleware.push(
      createLogger({
        // @ts-ignore
        predicate: () => window.ELASTIC_LENS_LOGGER,
      })
    );
  }

  return configureStore({
    reducer: {
      lens: makeLensReducer(storeDeps),
    },
    middleware,
    preloadedState,
  });
};

export type LensRootStore = ReturnType<typeof makeConfigureStore>;

export type LensDispatch = LensRootStore['dispatch'];
export type LensGetState = LensRootStore['getState'];
export type LensRootState = ReturnType<LensGetState>;

export const useLensDispatch = () => useDispatch<LensDispatch>();
export const useLensSelector: TypedUseSelectorHook<LensRootState> = useSelector;
