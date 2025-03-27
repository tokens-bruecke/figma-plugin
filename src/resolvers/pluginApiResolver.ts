import { IResolver } from "./resolver";

export class PluginAPIResolver implements IResolver {
  async getLocalEffectStyles(): Promise<EffectStyle[]> {
    return figma.getLocalEffectStyles();
  }

  async getLocalVariableCollections(): Promise<VariableCollection[]> {
    return figma.variables.getLocalVariableCollectionsAsync();
  }

  async getLocalVariables(): Promise<Variable[]> {
    return figma.variables.getLocalVariablesAsync();
  }

  async getLocalGridStyles(): Promise<GridStyle[]> {
    return figma.getLocalGridStylesAsync();
  }

  async getLocalTextStyles(): Promise<TextStyle[]> {
    return figma.getLocalTextStylesAsync();
  }

  getVariableById(variableId: string): Variable {
    return figma.variables.getVariableById(variableId);
  }

  getVariableCollectionById(id: string): VariableCollection {
    return figma.variables.getVariableCollectionById(id);
  }
}
