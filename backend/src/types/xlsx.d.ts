declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [key: string]: WorkSheet };
  }
  
  export interface WorkSheet {
    [key: string]: any;
  }
  
  export interface Sheet2JSONOpts {
    header?: string[] | number;
    range?: any;
  }
  
  export function readFile(file: string): WorkBook;
  export function read(data: any, opts?: any): WorkBook;
  export const utils: {
    sheet_to_json: (worksheet: WorkSheet, opts?: Sheet2JSONOpts) => any[];
    json_to_sheet: (data: any[]) => WorkSheet;
    book_new: () => WorkBook;
    book_append_sheet: (workbook: WorkBook, worksheet: WorkSheet, name: string) => void;
  };
}
