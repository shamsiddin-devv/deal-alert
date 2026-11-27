export class ScrapeError extends Error {
  constructor(
    readonly code: string,
    readonly retryMs?: number,
  ) {
    super(code);
  }
}
