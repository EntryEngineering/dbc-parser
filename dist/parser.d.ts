import { DbcParserResult } from "./types";
export declare function isResultEmpty(res: DbcParserResult): boolean;
export declare function parseFile(file: Blob): Promise<DbcParserResult>;
export declare function parseString(dbcString: string): DbcParserResult;
