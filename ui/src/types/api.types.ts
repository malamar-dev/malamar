export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export class ApiException extends Error {
  code: string;
  status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.code = error.code;
    this.status = error.status;
  }
}

export interface ApiResponse<T> {
  data: T;
}
