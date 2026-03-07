declare module 'csv-parser' {
  import { Transform } from 'stream';
  
  interface CsvParserOptions {
    headers?: string[] | boolean;
    separator?: string;
    quote?: string;
    escape?: string;
    skipComments?: boolean | string;
    strict?: boolean;
    maxRowBytes?: number;
    checkType?: boolean;
    skipLines?: number;
    [key: string]: any;
  }
  
  function csvParser(options?: CsvParserOptions): Transform;
  export = csvParser;
}
