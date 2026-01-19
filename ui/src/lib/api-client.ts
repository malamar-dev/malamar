export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? "An unexpected error occurred",
      response.status,
    );
  }
  return response.json();
}

export const apiClient = {
  get: <T>(path: string): Promise<T> =>
    fetch(`/api${path}`).then(handleResponse<T>),

  post: <T>(path: string, data: unknown): Promise<T> =>
    fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  put: <T>(path: string, data: unknown): Promise<T> =>
    fetch(`/api${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  delete: <T>(path: string): Promise<T> =>
    fetch(`/api${path}`, {
      method: "DELETE",
    }).then(handleResponse<T>),
};
