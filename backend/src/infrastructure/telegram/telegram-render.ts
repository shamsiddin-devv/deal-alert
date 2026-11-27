import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  GrammyError,
  InputFile,
  type Context,
  type InlineKeyboard,
} from 'grammy';
import { publicOrigin } from '../../application/public-origin';

export function webLink(path: string) {
  const origin = publicOrigin();
  return origin.protocol === 'https:' ? new URL(path, origin).href : null;
}

async function resolvePhoto(
  image: string,
): Promise<string | InputFile | undefined> {
  if (image.startsWith('https://')) return image;
  const filename =
    /^\/images\/products\/([a-z0-9][a-z0-9.-]*\.(?:jpg|jpeg|png|webp))$/i.exec(
      image,
    )?.[1];
  if (!filename) return;
  const directory = process.env.FRONTEND_DIST_DIR || '../frontend/public';
  const file = resolve(directory, 'images', 'products', filename);
  try {
    await access(file);
    return new InputFile(file);
  } catch {
    return webLink(image) ?? undefined;
  }
}

function clientError(error: unknown, pattern: RegExp) {
  return (
    error instanceof GrammyError &&
    error.error_code === 400 &&
    pattern.test(error.description)
  );
}

export async function renderTelegram(
  ctx: Context,
  text: string,
  keyboard: InlineKeyboard,
  image?: string,
) {
  const photo = image ? await resolvePhoto(image) : undefined;
  const message = ctx.callbackQuery?.message;
  const oldPhoto = message && 'photo' in message;
  const oldText = message && 'text' in message;
  const options = { reply_markup: keyboard };
  if (photo) {
    try {
      if (oldPhoto) {
        await ctx.editMessageMedia(
          { type: 'photo', media: photo, caption: text },
          options,
        );
        return;
      }
      await ctx.replyWithPhoto(photo, { ...options, caption: text });
      if (message) await deletePrevious(ctx);
      return;
    } catch (error) {
      if (clientError(error, /message is not modified/i)) return;
      if (!(error instanceof GrammyError && error.error_code === 400))
        throw error;
    }
  }
  if (oldText) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch (error) {
      if (clientError(error, /message is not modified/i)) return;
      if (!clientError(error, /message (?:can.t be edited|to edit not found)/i))
        throw error;
    }
  }
  await ctx.reply(text, options);
  if (message) await deletePrevious(ctx);
}

async function deletePrevious(ctx: Context) {
  try {
    await ctx.deleteMessage();
  } catch (error) {
    if (!(
      error instanceof GrammyError && [400, 403].includes(error.error_code)
    ))
      throw error;
  }
}
