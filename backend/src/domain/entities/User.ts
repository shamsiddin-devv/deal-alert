import { ValidationError } from '../errors/ValidationError';
import { Email } from '../value-objects/Email';

export class User {
  readonly name: string;
  readonly email: Email;
  constructor(name: string, email: string) {
    this.name = name.trim();
    if (this.name.length < 2 || this.name.length > 120)
      throw new ValidationError('Enter your full name');
    this.email = new Email(email);
  }
}
