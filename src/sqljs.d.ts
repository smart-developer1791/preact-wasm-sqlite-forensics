declare module "sql.js" {
  export type SqlValue = number | string | Uint8Array | null

  export interface QueryExecResult {
    columns: string[]
    values: SqlValue[][]
  }

  export class Database {
    constructor(data?: ArrayLike<number> | null)
    close(): void
    exec(sql: string, params?: SqlValue[] | Record<string, SqlValue> | null): QueryExecResult[]
    export(): Uint8Array
    getRowsModified(): number
  }

  export interface SqlJsStatic {
    Database: typeof Database
  }

  export interface SqlJsConfig {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}
