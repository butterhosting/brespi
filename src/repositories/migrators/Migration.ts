export interface Migration {
  file(): string;
  apply(configuration: any): Promise<any>;
}
