import { TextNode, type LocalVariable } from '@figma/rest-api-spec';

type LocalVariableCollection = {
  remote: boolean;
  hiddenFromPublishing: boolean;
  [key: string]: any;
};
import { IResolver } from '@common/resolver';
import { Api } from 'figma-api';
import { log as defaultLog, type LogFn } from './logger';

/**
 * The REST API does not return variables, collections, the `variableIds` of
 * a collection or styles in a fixed order, so they are sorted to make
 * exporting an unchanged file give identical output.
 */
const byNameThenId = (
  a: { name: string; id: string },
  b: { name: string; id: string }
): number => {
  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/**
 * The fields a text style can bind to a variable. A REST text node can also
 * bind fields that are not part of the style, such as `fills`.
 */
const TEXT_STYLE_FIELDS = new Set<string>([
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paragraphSpacing',
  'paragraphIndent',
] satisfies VariableBindableTextField[]);

/**
 * The REST API reports the scope of a number variable that is set to "Font
 * weight" as `FONT_STYLE`, where the Plugin API reports `FONT_WEIGHT`.
 * `FONT_STYLE` is only a valid scope for string variables, so on a number it
 * can only be a font weight. Without this, the weights are exported as
 * dimensions (`700px`) instead of `fontWeight` numbers.
 */
const normalizeScopes = (variable: LocalVariable): LocalVariable['scopes'] =>
  variable.resolvedType === 'FLOAT'
    ? (variable.scopes ?? []).map((scope) =>
        scope === 'FONT_STYLE' ? 'FONT_WEIGHT' : scope
      )
    : variable.scopes ?? [];

/**
 * The `meta` of a `GET /v1/files/:key/variables/local` response.
 */
export interface LocalVariablesMeta {
  variables: Record<string, LocalVariable>;
  variableCollections: Record<string, LocalVariableCollection>;
}

/**
 * Drops what the file does not own (library variables and collections, hidden
 * collections, deleted variables) and maps the REST scopes to the Plugin API
 * ones, so the REST response looks like the local variables of the file.
 */
export const normalizeLocalVariables = ({
  variables,
  variableCollections,
}: LocalVariablesMeta): {
  variables: Record<string, Variable>;
  variableCollections: Record<string, VariableCollection>;
} => ({
  variables: Object.fromEntries(
    Object.entries(variables)
      .filter(
        ([_, variable]: [string, LocalVariable]) =>
          !variable.remote && !variable.deletedButReferenced // exclude deleted variables https://forum.figma.com/ask-the-community-7/rest-api-variables-35406?tid=35406&fid=7
      )
      .map(([id, variable]: [string, LocalVariable]) => [
        id,
        { ...variable, scopes: normalizeScopes(variable) },
      ])
  ) as Record<string, Variable>,
  variableCollections: Object.fromEntries(
    Object.entries(variableCollections).filter(
      ([_, collection]: [string, LocalVariableCollection]) =>
        !collection.remote && !collection.hiddenFromPublishing
    )
  ) as Record<string, VariableCollection>,
});

/**
 * Sorts the collections, and the `variableIds` inside them, by name.
 */
export const sortCollections = (
  collections: VariableCollection[],
  variables: Record<string, Variable>
): VariableCollection[] =>
  [...collections].sort(byNameThenId).map((collection) => ({
    ...collection,
    variableIds: [...(collection.variableIds ?? [])].sort((a, b) =>
      byNameThenId(
        variables[a] ?? { name: '', id: a },
        variables[b] ?? { name: '', id: b }
      )
    ),
  }));

/**
 * Turns a REST variables response into a snapshot, with the same filtering
 * and order as `RestAPIResolver`. Styles are not part of that response.
 */
export const restVariablesToSnapshot = (
  meta: LocalVariablesMeta
): { variables: Variable[]; variableCollections: VariableCollection[] } => {
  const { variables, variableCollections } = normalizeLocalVariables(meta);
  return {
    variables: Object.values(variables).sort(byNameThenId),
    variableCollections: sortCollections(
      Object.values(variableCollections),
      variables
    ),
  };
};

export class RestAPIResolver implements IResolver {
  private fileKey: string;
  private api: Api;
  private variables: Record<string, Variable>;
  private variableCollections: Record<string, VariableCollection>;
  private styles: any[];
  private log: LogFn;

  private fetchLocalVariablesPromise: Promise<void> | null = null;

  constructor(
    fileKey: string,
    personalAccessToken?: string,
    oAuthToken?: string,
    log: LogFn = defaultLog
  ) {
    this.log = log;
    this.fileKey = fileKey;
    if (oAuthToken) {
      this.api = new Api({ oAuthToken });
    } else if (personalAccessToken) {
      this.api = new Api({ personalAccessToken });
    } else {
      throw new Error(
        'Either personalAccessToken or oAuthToken must be provided'
      );
    }
    this.styles = [];
  }

  async fetchLocalVariables(): Promise<void> {
    if (!this.variables) {
      if (!this.fetchLocalVariablesPromise) {
        this.log('⌛ Fetching local variables');
        this.fetchLocalVariablesPromise = this.api
          .getLocalVariables({ file_key: this.fileKey })
          .then((response) => {
            const { variables, variableCollections } = normalizeLocalVariables(
              response.meta as LocalVariablesMeta
            );
            this.variables = variables;
            this.variableCollections = variableCollections;
            this.log(
              '✅ Found %d local variables in %d collections',
              Object.keys(this.variables).length,
              Object.keys(this.variableCollections).length
            );
          })
          .catch((error) => {
            throw error;
          });
      }
      await this.fetchLocalVariablesPromise;
    }
  }

  async fetchFileStyles(): Promise<void> {
    if (this.styles.length === 0) {
      // Fetch file styles only if they are not already fetched
      this.log('⌛ Fetching file styles');
      const styles = await this.api.getFileStyles({
        file_key: this.fileKey,
      });
      this.styles = styles.meta.styles;
    }
  }

  async getLocalEffectStyles(): Promise<EffectStyle[]> {
    await this.fetchFileStyles();
    this.log('⌛ Fetching effect styles');
    const ids = this.styles
      .filter((style) => style.style_type === 'EFFECT')
      .map((style) => style.node_id);
    const r = await this.api.getFileNodes(
      { file_key: this.fileKey },
      { ids: ids.join(',') }
    );
    const effectStyles = Object.values(r.nodes)
      .map((node) => node.document as unknown as RectangleNode)
      .map(this.rectangleNodeToEffectStyle)
      .sort(byNameThenId);
    this.log('✅ Found %d effect styles', effectStyles.length);
    return effectStyles;
  }

  async getLocalVariableCollections(): Promise<VariableCollection[]> {
    await this.fetchLocalVariables();
    return sortCollections(
      Object.values(this.variableCollections),
      this.variables
    );
  }

  async getLocalVariables(): Promise<Variable[]> {
    await this.fetchLocalVariables();
    return Object.values(this.variables).sort(byNameThenId);
  }

  async getLocalGridStyles(): Promise<GridStyle[]> {
    await this.fetchFileStyles();
    this.log('⌛ Fetching grid styles');
    const ids = this.styles
      .filter((style) => style.style_type === 'GRID')
      .map((style) => style.node_id);
    const r = await this.api.getFileNodes(
      { file_key: this.fileKey },
      { ids: ids.join(',') }
    );
    const gridStyles = Object.values(r.nodes)
      .map((node) => node.document as unknown as FrameNode)
      .map(this.frameNodeToGrid)
      .sort(byNameThenId);
    this.log('✅ Found %d grid styles', gridStyles.length);
    return gridStyles;
  }

  async getLocalTextStyles(): Promise<TextStyle[]> {
    await this.fetchFileStyles();
    this.log('⌛ Fetching text styles');
    const ids = this.styles
      .filter((style) => style.style_type === 'TEXT')
      .map((style) => style.node_id);
    const r = await this.api.getFileNodes(
      { file_key: this.fileKey },
      { ids: ids.join(',') }
    );
    const textStyles = Object.values(r.nodes)
      .map((node) => node.document as TextNode)
      .map(this.textNodeToStyle)
      .sort(byNameThenId);
    this.log('✅ Found %d text styles', textStyles.length);
    return textStyles;
  }

  async getLocalPaintStyles(): Promise<PaintStyle[]> {
    await this.fetchFileStyles();
    this.log('⌛ Fetching paint styles');
    const ids = this.styles
      .filter((style) => style.style_type === 'FILL')
      .map((style) => style.node_id);
    const r = await this.api.getFileNodes(
      { file_key: this.fileKey },
      { ids: ids.join(',') }
    );
    const paintStyles = Object.values(r.nodes)
      .map((node) => node.document as unknown as RectangleNode)
      .map(this.rectangleNodeToPaint)
      .sort(byNameThenId);
    this.log('✅ Found %d paint styles', paintStyles.length);
    return paintStyles;
  }

  async getVariableById(variableId: string): Promise<Variable | null> {
    // Assuming variables are fetched and stored
    return this.variables[variableId] || null;
  }

  async getVariableCollectionById(
    id: string
  ): Promise<VariableCollection | null> {
    return this.variableCollections[id] || null;
  }

  rectangleNodeToEffectStyle(node: RectangleNode): EffectStyle {
    return {
      type: 'EFFECT',
      id: node.id,
      name: node.name,
      effects: node.effects,
      remote: false,
      key: node.id,
      description: '',
      documentationLinks: [],
      consumers: [],
      boundVariables: node.boundVariables,
    } as unknown as EffectStyle;
  }

  frameNodeToGrid(node: FrameNode): GridStyle {
    return {
      type: 'GRID',
      id: node.id,
      name: node.name,
      layoutGrids: node.layoutGrids,
      remote: false,
      key: node.id,
      description: '',
      documentationLinks: [],
      consumers: [],
      boundVariables: node.boundVariables,
    } as unknown as GridStyle;
  }

  textNodeToStyle(node: TextNode): TextStyle {
    // The REST API lists the variables bound to a text field as an array
    // (`fontSize: [{ id }]`), the plugin API as a single alias (`fontSize: { id }`).
    const boundVariables = Object.fromEntries(
      Object.entries(node.boundVariables ?? {})
        .map(([field, alias]) => [
          field,
          Array.isArray(alias) ? alias[0] : alias,
        ])
        .filter(([field, alias]) => TEXT_STYLE_FIELDS.has(field) && alias)
    );

    return {
      type: 'TEXT',
      id: node.id,
      remote: false,
      key: node.id,
      name: node.name,
      documentationLinks: [],
      consumers: [],
      boundVariables,
      fontName: {
        family: node.style.fontFamily,
        style: node.style.fontStyle,
      },
      fontSize: node.style.fontSize,
      fontWeight: node.style.fontWeight,
      textDecoration: node.style.textDecoration,
      textCase: node.style.textCase,
      paragraphIndent: node.style.paragraphIndent ?? 0,
      paragraphSpacing: node.style.paragraphSpacing ?? 0,
      listSpacing: node.style.listSpacing,
      hangingList: false, //not in API ?
      hangingPunctuation: false, //not in API ?
      leadingTrim: 'NONE', //not in API ?
      letterSpacing: { value: node.style.letterSpacing, unit: 'PIXELS' },
      lineHeight: {
        value:
          node.style.lineHeightUnit == 'PIXELS'
            ? node.style.lineHeightPx
            : node.style.lineHeightPercentFontSize,
        unit: node.style.lineHeightUnit == 'PIXELS' ? 'PIXELS' : 'PERCENT',
      },
    } as unknown as TextStyle;
  }

  rectangleNodeToPaint(node: RectangleNode): PaintStyle {
    const paints = (node.fills ?? []) as Paint[];
    // The REST API exposes bound variables per paint (`fills[].boundVariables.color`),
    // while the plugin API exposes them on the style (`boundVariables.paints[]`).
    // Reshape so colorStylesToTokens emits aliases for variable-bound color styles.
    const boundPaints = paints
      .map((paint) => (paint as any).boundVariables?.color)
      .filter(Boolean);

    return {
      type: 'PAINT',
      id: node.id,
      name: node.name,
      paints,
      remote: false,
      key: node.id,
      description: '',
      documentationLinks: [],
      consumers: [],
      ...(boundPaints.length > 0 && {
        boundVariables: { paints: boundPaints },
      }),
    } as unknown as PaintStyle;
  }
}
