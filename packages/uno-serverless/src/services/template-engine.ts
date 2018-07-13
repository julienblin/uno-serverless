
/** Standard interface for template engines. */
export interface TemplateEngine {

  /** Renders template with a context. */
  render(template: string, context: any): Promise<string>;
}
