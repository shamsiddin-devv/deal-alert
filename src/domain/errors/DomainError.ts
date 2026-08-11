export class DomainError extends Error {
  constructor(message: string, private readonly status: number) {
    super(message);
    this.name = 'DomainError'
  };
};