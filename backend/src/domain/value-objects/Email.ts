import { ValidationError } from '../errors/ValidationError';

export class Email {
  private readonly value: string;
  constructor(email: string) {
    const value = email.trim().toLowerCase();
    if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      throw new ValidationError('Enter a valid email address');
    }
    this.value = value;
  }
  toString() {
    return this.value;
  }
  equals(other: Email) {
    return this.value === other.value;
  }
}
