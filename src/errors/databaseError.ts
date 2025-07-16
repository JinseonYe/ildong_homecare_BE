import { AppError } from './appError';

export class DatabaseError extends AppError {
  public readonly code?: string; // 예: 'ER_DUP_ENTRY'
  public readonly errno?: number; // 예: 1062
  public readonly sql?: string; // 실패한 SQL 쿼리
  public readonly sqlState?: string; // 예: '21S01'
  public readonly sqlMessage?: string; // 예: "Column count doesn't match value count at row 1"

  constructor(
    message: string,
    cause?: Error & {
      code?: string;
      errno?: number;
      sql?: string;
      sqlState?: string;
      sqlMessage?: string;
    },
  ) {
    super(message, 500, cause);
    this.name = 'DatabaseError';
    if (cause) {
      this.code = cause.code;
      this.errno = cause.errno;
      this.sql = cause.sql;
      this.sqlState = cause.sqlState;
      this.sql = cause.sql;
    }
  }
}
