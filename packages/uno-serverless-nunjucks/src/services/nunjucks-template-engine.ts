import * as accounting from "accounting";
import * as currencyFormatter from "currency-formatter";
import * as handlebarsDateFormat from "handlebars-dateformat";
import { Environment, Extension, FileSystemLoader, ILoader } from "nunjucks";
import * as pluralize from "pluralize";
import { TemplateEngine } from "uno-serverless";

type FilterCallback = (...args: any[]) => any;

export interface NunjucksTemplateEngineOptions {
  extensions?: Record<string, Extension>;
  filters?: Record<string, FilterCallback>;
  globals?: Record<string, any>;
  autoescape?: boolean;
  throwOnUndefined?: boolean;
  trimBlocks?: boolean;
  lstripBlocks?: boolean;

  /** The path to the template directory. defaults to "./templates" if no loaders are specified. */
  templateDirectory?: string;

  /** An array of loaders; if undefined, will default to a FileSystemLoader to the templateDirectory */
  loaders?: ILoader[];
}

export class NunjucksTemplateEngine implements TemplateEngine {
  // tslint:disable-next-line:variable-name
  private _nunjucksEnv?: Environment;

  constructor(private readonly engineOpts: NunjucksTemplateEngineOptions) {
  }

  public render(template: string, context: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        const result = this.nunjucksEnv.render(template, context);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  private get nunjucksEnv(): Environment {
    if (this._nunjucksEnv !== undefined) {
      return this._nunjucksEnv;
    }

    const opts = {
      autoescape: (this.engineOpts.autoescape !== false),
      lstripBlocks: (this.engineOpts.lstripBlocks !== undefined && this.engineOpts.lstripBlocks),
      throwOnUndefined: (this.engineOpts.throwOnUndefined !== undefined && this.engineOpts.throwOnUndefined),
      trimBlocks: (this.engineOpts.trimBlocks !== undefined && this.engineOpts.trimBlocks),
    };

    let loaders = this.engineOpts.loaders;

    if (loaders === undefined) {
      let templateDir = this.engineOpts.templateDirectory;
      if (templateDir === undefined) {
        templateDir = "./templates";
      }

      loaders = [new FileSystemLoader(templateDir)];
    }

    this._nunjucksEnv = new Environment(loaders, opts);

    if (this.engineOpts.extensions) {
      for (const extName in this.engineOpts.extensions) {
        if (!this.engineOpts.extensions.hasOwnProperty(extName)) {
          continue;
        }
        this._nunjucksEnv.addExtension(extName, this.engineOpts.extensions[extName]);
      }
    }

    const filters: Record<string, FilterCallback> = {
      currency: (value: number, currency: string) => {
        if (value === null || value === undefined) {
          return value;
        }

        return currencyFormatter.format(value, { code: currency });
      },
      date: handlebarsDateFormat,
      number: (value: number, formatOpts: any) =>
        accounting.formatNumber(value, formatOpts && formatOpts.hash ? formatOpts.hash : formatOpts),
      pluralize: (num: number, singular: string, plural?: string) => {
        if (num === 1) {
          return singular;
        } else {
          return (typeof plural === "string" ? plural : pluralize(singular));
        }
      },
    };

    if (this.engineOpts.filters) {
      for (const filterName in this.engineOpts.filters) {
        if (!this.engineOpts.filters.hasOwnProperty(filterName)) {
          continue;
        }
        filters[filterName] = this.engineOpts.filters[filterName];
      }
    }

    for (const filterName in filters) {
      if (!filters.hasOwnProperty(filterName)) {
        continue;
      }
      this._nunjucksEnv.addFilter(filterName, filters[filterName]);
    }

    return this._nunjucksEnv;
  }
}
