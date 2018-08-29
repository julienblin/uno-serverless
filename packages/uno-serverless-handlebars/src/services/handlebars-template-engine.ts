import * as accounting from "accounting";
import * as currencyFormatter from "currency-formatter";
import { exists, readdir, readFile } from "fs";
import * as handlebars from "handlebars";
import * as handlebarsDateFormat from "handlebars-dateformat";
import { basename, extname, join } from "path";
import * as pluralize from "pluralize";
import { lazyAsync, TemplateEngine } from "uno-serverless";

export interface HandlebarsTemplateEngineOptions {
  helpers?: Record<string, handlebars.HelperDelegate>;

  /** The path to the partials directory. defaults to "[templateDirectory]/partials". */
  partialsDirectory?: string;

  /** The path to the template directory. defaults to "./templates". */
  templateDirectory?: string;
}

/**
 * TemplateEngine implementation using Handlebars.
 *
 * Partials templates are automatically available.
 * e.g. partials/header.handlebars is available through {{>header}}
 * Included helpers:
 *   - currency: {{currency [value] "USD"}} (Uses currency-formatter)
 *   - date: {{date [value] "dddd, MMMM Do YYYY, h:mm:ss a"}} (Uses moment.js format)
 *   - lowercase: {{lowercase [value]}} (Calls value.toLowerCase())
 *   - number: {{number [value] [precision = 0], [thousand = ","], [decimal = "."]}}
 *   - pluralize: {{pluralize [number] "child"}} (Uses pluralize if plural form not provided)
 *   - t: {{t [resource] }}: allow translation of context.resources based on context.language
 *   - uppercase: {{uppercase [value]}} (Calls value.toUpperCase())
 *     The resources can also contain substitutions as well.
 */
export class HandlebarsTemplateEngine implements TemplateEngine {

  private readonly options: Required<HandlebarsTemplateEngineOptions>;
  private handlebarsInitialization = lazyAsync(() => this.initializeHandlebars());
  private readonly compiledTemplates: Record<string, HandlebarsTemplateDelegate<any>> = {};

  public constructor(options: HandlebarsTemplateEngineOptions) {
    this.options = {
      helpers: options.helpers || {},
      partialsDirectory: options.partialsDirectory || join(options.templateDirectory || "./templates", "partials"),
      templateDirectory: options.templateDirectory || "./templates",
    };
  }

  public async render(template: string, context: any): Promise<string> {
    if (!this.compiledTemplates[template]) {
      this.compiledTemplates[template] = await this.compileTemplate(template);
    }

    return this.compiledTemplates[template](context);
  }

  private async compileTemplate(path: string) {
    await this.handlebarsInitialization();
    const templateContent = await this.readFile(join(this.options.templateDirectory, path));
    return handlebars.compile(templateContent);
  }

  private async initializeHandlebars(): Promise<void> {
    handlebars.registerHelper({
      currency: (value: number, currency: string) => currencyFormatter.format(value, { code: currency }),
      date: handlebarsDateFormat,
      lowercase: (value: string) => value.toLowerCase(),
      number: (value: number, options: any) =>
        accounting.formatNumber(value, options && options.hash ? options.hash : options),
      pluralize: (num: number, singular: string, plural?: string) => {
        if (num === 1) {
          return singular;
        } else {
          return (typeof plural === "string" ? plural : pluralize(singular));
        }
      },
      t: (resource: string, options: any) => {
        const root = options.data.root;
        if (!root.language) {
          throw new Error(`Unable to translate resource ${resource} - Missing language property in root context.`);
        }

        const resourcePath = `${root.language}.${resource}`;
        const resourceValue = resourcePath.split(".").reduce(
          (acc, cur) => acc ? acc[cur] : undefined,
          options.data.root.resources);
        if (!resourceValue) {
          throw new Error(`Unable to find resource ${resource} for language ${root.language}.`);
        }
        if (!resourceValue.includes("{{")) {
          return resourceValue;
        }
        const template = handlebars.compile(resourceValue);
        return template(options.data.root);
      },
      uppercase: (value: string) => value.toUpperCase(),
    });
    handlebars.registerHelper(this.options.helpers || {});

    const partialFiles = await this.listPartialFiles();
    const partialFilesContent = await Promise.all(partialFiles.map((x) => this.readFile(x)));
    partialFiles.forEach((file, index) => {
      handlebars.registerPartial(basename(file, extname(file)), partialFilesContent[index]);
    });
  }

  private async listPartialFiles() {
    return new Promise<string[]>((resolve, reject) => {
      exists(this.options.partialsDirectory, (dirExists) => {
        if (!dirExists) {
          return resolve([]);
        }

        readdir(this.options.partialsDirectory, (err, files) => {
          if (err) {
            return reject(err);
          }

          return resolve(files.map((x) => join(this.options.partialsDirectory, x)));
        });
      });
    });
  }

  private async readFile(path: string) {
    return new Promise<string>((resolve, reject) => {
      readFile(path, (err, file) => {
        if (err) {
          return reject(err);
        }

        return resolve(file.toString());
      });
    });
  }
}
