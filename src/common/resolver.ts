export interface IResolver {
  getLocalEffectStyles(): Promise<EffectStyle[]>;
  getLocalVariableCollections(): Promise<VariableCollection[]>;
  getLocalVariables(): Promise<Variable[]>;
  getLocalGridStyles(): Promise<GridStyle[]>;
  getLocalTextStyles(): Promise<TextStyle[]>;
  getLocalPaintStyles(): Promise<PaintStyle[]>;
  getVariableById(variableId: string): Promise<Variable | null>;
  getVariableCollectionById(id: string): Promise<VariableCollection | null>;
}
