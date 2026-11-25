import { BadRequestError } from '../errors/BadRequestError';

export class PhoneNumber {
  private value: string;

  constructor(private readonly phone: string) {
    let cleaned = phone.replace(/[\s\-()]/g, '');

    if (/^\d{9}$/.test(cleaned)) {
      cleaned = `+998` + cleaned;
    } else if (/^998\d{9}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    }

    if (!/^\+998\d{9}$/.test(cleaned)) {
      throw new BadRequestError('Phone number is in an incorrect format.');
    }
    this.value = cleaned;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  display(): string {
    const p = this.value;
    return `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11, 13)}`;
  }
}
