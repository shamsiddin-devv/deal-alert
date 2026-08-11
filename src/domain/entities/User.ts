import { BadRequestError } from '../errors/BadRequestError';
import { ConflictError } from '../errors/ConflictError';
import { Email } from '../value-objects/Email';
import { PhoneNumber } from '../value-objects/PhoneNumber';

export interface IUser {
  id?: string;
  fullName: string;
  phoneNumber: PhoneNumber;
  email?: Email;
  telegramId?: string;
  chatId?: string;
  createdAt?: Date;
}

export class User {
  private _telegramId: string;
  private _chatId: string;
  private _email: Email;

  constructor(private readonly props: IUser) {
    if (!props.fullName || props.fullName.trim() === '') {
      throw new BadRequestError('Full name must not be empty.');
    }

    if (!props.phoneNumber)
      throw new BadRequestError('Phone number must not be empty.');

    if (props.telegramId && !props.chatId) {
      throw new BadRequestError('chatId is required when telegramId is provided')
    }

    this._telegramId = props.telegramId!;
    this._chatId = props.chatId!;
    this._email = props.email!;
  };

  hasWebAccess(): boolean {
    return this._email !== undefined;
  }

  hasTelegramAccess(): boolean {
    return this._telegramId !== undefined;
  }

  linkTelegram(telegramId, chatId): void {
    if (this._telegramId)
      throw new ConflictError('Telegram already linked to this account');

    this._telegramId = telegramId;
    this._chatId = chatId;
  }

  linkWebAccount(email: Email): void {
    if (this._email) throw new ConflictError('Web account already linked');

    this._email = email;
  };

  get id() {return this.props.id};
  get fullName() { return this.props.fullName; }
  get phoneNumber() { return this.props.phoneNumber; }
  get email() { return this._email; }
  get telegramId() { return this._telegramId; }
  get chatId() { return this._chatId; }
  get createdAt() { return this.props.createdAt; }
}
