export interface IResolver {
  getLocalEffectStyles(): Promise<EffectStyle[]>;
  getLocalVariableCollections(): Promise<VariableCollection[]>;
  getLocalVariables(): Promise<Variable[]>;
  getLocalGridStyles(): Promise<GridStyle[]>;
  getLocalTextStyles(): Promise<TextStyle[]>;
  getVariableById(variableId: string): Variable;
  getVariableCollectionById(id: string): VariableCollection;
}
