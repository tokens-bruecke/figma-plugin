import { createContext, useContext } from 'react';

export const defaultPluginEnvironment: PluginEnvironmentI = {
  editorType: 'figma',
  mode: 'default',
  isVSCode: false,
};

export const PluginEnvironmentContext = createContext<PluginEnvironmentI>(
  defaultPluginEnvironment
);

export const usePluginEnvironment = () => useContext(PluginEnvironmentContext);

/**
 * In Dev Mode the UI fills the Inspect panel, and the user sets its size.
 * The window layout (300 px column, preview beside it, resize handles)
 * only works in Figma Design, where the plugin sizes its own window.
 */
export const isPanelLayout = (environment: PluginEnvironmentI) =>
  environment.editorType === 'dev';

/** Dev Mode is read-only for every plugin, so variables can't be created */
export const canImportTokens = (environment: PluginEnvironmentI) =>
  environment.editorType !== 'dev';
