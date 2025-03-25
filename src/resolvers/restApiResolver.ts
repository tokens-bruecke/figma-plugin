import { type LocalVariable } from "@figma/rest-api-spec";
import { IResolver } from "./resolver";
import { Api } from "figma-api";

export class RestAPIResolver implements IResolver {
  private fileKey: string;
  private api: Api;
  private variables: Record<string, Variable>;
  private variableCollections: Record<string, VariableCollection>;
  private styles: any[];

  private fetchLocalVariablesPromise: Promise<void> | null = null;

  constructor(fileKey: string, token: string) {
    this.fileKey = fileKey;
    this.api = new Api({ personalAccessToken: token });
    this.styles = [];
  }

  async fetchLocalVariables(): Promise<void> {
    if (!this.variables) {
      if (!this.fetchLocalVariablesPromise) {
        this.fetchLocalVariablesPromise = this.api
          .getLocalVariables({ file_key: this.fileKey })
          .then((response) => {
            const { variables, variableCollections } = response.meta;
            this.variables = Object.fromEntries(
              Object.entries(variables).filter(
                ([_, variable]: [string, LocalVariable]) =>
                  !variable.remote && !variable.deletedButReferenced // exlude deleted variables https://forum.figma.com/ask-the-community-7/rest-api-variables-35406?tid=35406&fid=7
              )
            ) as Record<string, Variable>;
            this.variableCollections = Object.fromEntries(
              Object.entries(variableCollections).filter(
                ([_, collection]: [string, VariableCollection]) =>
                  !collection.remote && !collection.hiddenFromPublishing
              )
            ) as Record<string, VariableCollection>;
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
      const styles = await this.api.getFileStyles({
        file_key: this.fileKey,
      });
      this.styles = styles.meta.styles;
    }
  }

  async getLocalEffectStyles(): Promise<EffectStyle[]> {
    await this.fetchFileStyles();
    return this.styles.filter((style) => style.style_type === "EFFECT");
  }

  async getLocalVariableCollections(): Promise<VariableCollection[]> {
    await this.fetchLocalVariables();
    return Object.values(this.variableCollections);
  }

  async getLocalVariables(): Promise<Variable[]> {
    await this.fetchLocalVariables();
    return Object.values(this.variables);
  }

  async getLocalGridStyles(): Promise<GridStyle[]> {
    await this.fetchFileStyles();
    return this.styles.filter((style) => style.style_type === "GRID");
  }

  async getLocalTextStyles(): Promise<TextStyle[]> {
    await this.fetchFileStyles();
    return this.styles.filter((style) => style.style_type === "TEXT");
  }

  getVariableById(variableId: string): Variable {
    // Assuming variables are fetched and stored
    return this.variables[variableId];
  }

  getVariableCollectionById(id: string): VariableCollection {
    return this.variableCollections[id];
  }
}
