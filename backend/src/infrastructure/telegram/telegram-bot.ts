import {
  Bot,
  GrammyError,
  InlineKeyboard,
  type BotConfig,
  type Context,
} from 'grammy';
import type { TelegramLinkService } from '../../application/telegram-link.service';
import {
  productDto,
  type WorkspaceService,
} from '../../application/workspace.service';
import { DomainError } from '../../domain/errors/DomainError';
import { renderTelegram, webLink } from './telegram-render';

const PAGE_SIZE = 5;
const amount = new Intl.NumberFormat('uz-UZ');
const date = new Intl.DateTimeFormat('uz-UZ', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Tashkent',
});
const uv = (price: number | null) =>
  price === null ? '—' : amount.format(price) + ' so‘m';
const productId =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pageAction = /^(watch|deals|alerts|collections):([1-9][0-9]{0,4})$/;
const itemAction = new RegExp(
  '^(item|track|pause|resume|ask-remove|remove|history|offers|collection):(' +
    productId +
    ')$',
  'i',
);

export function createTelegramBot(
  token: string,
  links: TelegramLinkService,
  workspace: WorkspaceService,
  config?: BotConfig<Context>,
) {
  const bot = new Bot(token, { client: { timeoutSeconds: 5 }, ...config });

  const renderUnlinked = (
    ctx: Context,
    message = 'Deal Alert hisobingizni veb-saytdagi Settings → Account orqali bog‘lang.',
  ) => {
    const keyboard = new InlineKeyboard();
    const url = webLink('/app/settings?tab=account');
    if (url) keyboard.url('Hisobni bog‘lash', url).primary();
    return renderTelegram(ctx, message, keyboard);
  };

  const home = (ctx: Context) => {
    const keyboard = new InlineKeyboard()
      .text('📦 Kuzatuvim', 'watch:1')
      .primary()
      .text('🏷 Takliflar', 'deals:1')
      .success()
      .row()
      .text('🔔 Bildirishnomalar', 'alerts:1')
      .text('📁 Kolleksiyalar', 'collections:1');
    const url = webLink('/app');
    if (url) keyboard.row().url('Veb-kabinet', url);
    return renderTelegram(
      ctx,
      'Deal Alert\nKuzatuv, takliflar va narx tarixi bir joyda.',
      keyboard,
    );
  };

  const resolveOwner = async (ctx: Context) => {
    if (
      ctx.chat?.type !== 'private' ||
      !ctx.from ||
      ctx.chat.id !== ctx.from.id
    )
      return null;
    return links.owner(ctx.from.id);
  };

  const details = async (ctx: Context, owner: string, id: string) => {
    const product = productDto(await workspace.requireProduct(owner, id));
    const val = [
      '🔹 ' + product.title,
      product.marketplace + ' · ' + product.stock,
      '',
      'Narx: ' + uv(product.price),
    ];
    if (product.tracked) val.push('Maqsad: ' + uv(product.targetPrice));
    if (
      product.previousPrice !== null &&
      product.previousPrice !== product.price
    )
      val.push('Avval: ' + uv(product.previousPrice));
    if (product.isSample) val.push('Sinov taklifi');
    for (const spec of product.specs.slice(0, 3))
      val.push(spec.label + ': ' + spec.value);
    const keyboard = new InlineKeyboard();
    if (product.tracked) {
      keyboard
        .text(
          product.status === 'paused' ? '▶ Davom ettirish' : '⏸ Pauza',
          (product.status === 'paused' ? 'resume:' : 'pause:') + id,
        )
        .primary()
        .text('Olib tashlash', 'ask-remove:' + id)
        .danger();
    } else keyboard.text('➕ Kuzatish', 'track:' + id).success();
    keyboard
      .row()
      .text('📈 Tarix', 'history:' + id)
      .text('↔ Taqqoslash', 'offers:' + id);
    if (!product.isSample && product.url.startsWith('https://'))
      keyboard.row().url('Do‘konda ochish', product.url);
    await renderTelegram(
      ctx,
      val.join('\n').slice(0, 980),
      back(keyboard, product.tracked ? 'watch:1' : 'deals:1'),
      product.image ?? undefined,
    );
  };

  const showProducts = async (
    ctx: Context,
    owner: string,
    view: 'watch' | 'deals',
    index: number,
    query?: string,
  ) => {
    const watched = view === 'watch';
    const items = await workspace.list(
      owner,
      {
        page: index,
        pageSize: PAGE_SIZE,
        sort: watched ? 'recent' : 'score',
        query,
      },
      watched,
    );
    if (index > items.totalPages)
      return showProducts(ctx, owner, view, items.totalPages, query);
    const keyboard = new InlineKeyboard();
    for (const item of items.items)
      keyboard
        .text(buttonLabel(item.title, uv(item.price)), 'item:' + item.id)
        .row();
    const title = query
      ? '🔎 ' + query
      : watched
        ? '📦 Kuzatuvdagi mahsulotlar'
        : '🏷 Takliflar';
    const empty = watched ? 'Kuzatuv ro‘yxati bo‘sh.' : 'Mos taklif topilmadi.';
    if (!query) pagination(keyboard, view, index, items.totalPages);
    if (watched && items.total === 0)
      keyboard.text('Takliflarni ko‘rish', 'deals:1').primary().row();
    await renderTelegram(
      ctx,
      title + '\n' + (items.total ? String(items.total) + ' ta' : empty),
      back(keyboard),
    );
  };

  const alerts = async (ctx: Context, owner: string, index: number) => {
    const feed = await workspace.repository.alerts(owner, {
      page: index,
      pageSize: PAGE_SIZE,
    });
    if (index > feed.totalPages) return alerts(ctx, owner, feed.totalPages);
    const lines = [
      '🔔 Bildirishnomalar',
      feed.unread
        ? feed.unread + ' ta o‘qilmagan'
        : 'Yangi bildirishnoma yo‘q.',
    ];
    const keyboard = new InlineKeyboard();
    for (const entry of feed.items) {
      lines.push(
        '',
        (entry.read_at ? '▫ ' : '• ') + entry.title.slice(0, 120),
        entry.message.slice(0, 180),
      );
      if (entry.listing_id)
        keyboard
          .text(buttonLabel(entry.title), 'item:' + entry.listing_id)
          .row();
    }
    pagination(keyboard, 'alerts', index, feed.totalPages);
    await renderTelegram(ctx, lines.join('\n'), back(keyboard));
  };

  const collections = async (ctx: Context, owner: string, index: number) => {
    const groups = await workspace.repository.collections(owner);
    const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
    if (index > totalPages) return collections(ctx, owner, totalPages);
    const keyboard = new InlineKeyboard();
    for (const group of groups.slice(
      (index - 1) * PAGE_SIZE,
      index * PAGE_SIZE,
    ))
      keyboard
        .text(
          buttonLabel(group.name, String(group.productIds.length)),
          'collection:' + group.id,
        )
        .row();
    pagination(keyboard, 'collections', index, totalPages);
    await renderTelegram(
      ctx,
      '📁 Kolleksiyalar\n' +
        (groups.length
          ? groups.length + ' ta'
          : 'Kolleksiya hali yaratilmagan.'),
      back(keyboard),
    );
  };

  bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private' || ctx.from?.id !== ctx.chat.id) return;
    if (ctx.match.startsWith('l_')) {
      const state = await links.consume(ctx.match.slice(2), ctx.from.id);
      if (state === 'conflict') {
        await renderUnlinked(
          ctx,
          'Bu Telegram yoki Deal Alert hisobi allaqachon bog‘langan.',
        );
        return;
      }
      if (state === 'invalid' && !(await resolveOwner(ctx))) {
        await renderUnlinked(
          ctx,
          'Havola ishlatilgan yoki muddati tugagan. Saytdan yangi havola oling.',
        );
        return;
      }
    }
    if (await resolveOwner(ctx)) await home(ctx);
    else await renderUnlinked(ctx);
  });
  bot.command('menu', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    if (await resolveOwner(ctx)) await home(ctx);
    else await renderUnlinked(ctx);
  });
  bot.command('qidir', async (ctx) => {
    if (ctx.chat.type !== 'private') return;
    const owner = await resolveOwner(ctx);
    if (!owner) {
      await renderUnlinked(ctx);
      return;
    }
    const query = ctx.match.trim().slice(0, 100);
    if (query) await showProducts(ctx, owner, 'deals', 1, query);
    else
      await renderTelegram(
        ctx,
        'Mahsulot nomini kiriting. Masalan, /qidir Galaxy A55',
        back(new InlineKeyboard()),
      );
  });

  bot.on('callback_query:data', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch (error) {
      if (error instanceof GrammyError && error.error_code === 400) return;
      throw error;
    }
    if (ctx.chat?.type !== 'private') return;
    const owner = await resolveOwner(ctx);
    if (!owner) {
      await renderUnlinked(ctx);
      return;
    }
    const data = ctx.callbackQuery.data;
    const page = pageAction.exec(data);
    const item = itemAction.exec(data);
    try {
      if (data === 'home') {
        await home(ctx);
        return;
      }
      if (page) {
        const index = Number(page[2]);
        switch (page[1]) {
          case 'watch':
            await showProducts(ctx, owner, 'watch', index);
            return;
          case 'deals':
            await showProducts(ctx, owner, 'deals', index);
            return;
          case 'alerts':
            await alerts(ctx, owner, index);
            return;
          case 'collections':
            await collections(ctx, owner, index);
            return;
        }
      }
      if (!item) {
        await home(ctx);
        return;
      }
      const [, action, id] = item;
      switch (action) {
        case 'item':
          await details(ctx, owner, id);
          return;
        case 'track':
          await workspace.add(owner, { listingId: id });
          await details(ctx, owner, id);
          return;
        case 'pause':
        case 'resume':
          await workspace.update(owner, id, {
            status: action === 'pause' ? 'paused' : 'active',
          });
          await details(ctx, owner, id);
          return;
        case 'ask-remove': {
          const product = await workspace.requireProduct(owner, id);
          const keyboard = new InlineKeyboard()
            .text('Olib tashlash', 'remove:' + id)
            .danger()
            .text('Bekor qilish', 'item:' + id);
          await renderTelegram(
            ctx,
            'Kuzatuvdan olib tashlansinmi?\n' + product.details.title,
            keyboard,
          );
          return;
        }
        case 'remove':
          await workspace.repository.bulk(owner, [id], 'remove');
          await showProducts(ctx, owner, 'watch', 1);
          return;
        case 'history': {
          const product = await workspace.requireProduct(owner, id);
          const history = await workspace.repository.history(id, '30d');
          const lines = history.points
            .slice(-6)
            .map(
              (point) =>
                date.format(new Date(point.date)) + ' · ' + uv(point.price),
            );
          await renderTelegram(
            ctx,
            '📈 ' +
              product.details.title +
              '\n\n' +
              (lines.join('\n') || 'So‘nggi 30 kunda narx qayd etilmagan.'),
            back(new InlineKeyboard(), 'item:' + id),
          );
          return;
        }
        case 'offers': {
          const matches = await workspace.offers(owner, id);
          const lines = matches.offers
            .slice(0, PAGE_SIZE)
            .map(
              (offer) =>
                offer.marketplace +
                ' · ' +
                uv(offer.finalCost ?? offer.price) +
                (offer.finalCost === null ? ' (yetkazish alohida)' : '') +
                (offer.isSample ? ' · sinov' : ''),
            );
          await renderTelegram(
            ctx,
            '↔ Takliflar\n\n' + (lines.join('\n') || 'Mos taklif topilmadi.'),
            back(new InlineKeyboard(), 'item:' + id),
          );
          return;
        }
        case 'collection': {
          const group = (await workspace.repository.collections(owner)).find(
            (value) => value.id === id,
          );
          if (!group) {
            await collections(ctx, owner, 1);
            return;
          }
          const catalog = await Promise.all(
            group.productIds
              .slice(0, PAGE_SIZE)
              .map((productId) =>
                workspace.repository.product(owner, productId),
              ),
          );
          const keyboard = new InlineKeyboard();
          for (const product of catalog)
            if (product)
              keyboard
                .text(
                  buttonLabel(product.details.title, uv(product.price)),
                  'item:' + product.id,
                )
                .row();
          const url = webLink('/app/collections');
          if (group.productIds.length > PAGE_SIZE && url)
            keyboard.url('Barchasini saytda ko‘rish', url).row();
          await renderTelegram(
            ctx,
            '📁 ' +
              group.name +
              '\n' +
              group.productIds.length +
              ' ta mahsulot',
            back(keyboard, 'collections:1'),
          );
          return;
        }
      }
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      await renderTelegram(
        ctx,
        error.status === 404
          ? 'Mahsulot topilmadi.'
          : 'Amalni bajarib bo‘lmadi. Keyinroq urinib ko‘ring.',
        back(new InlineKeyboard()),
      );
    }
  });
  return bot;
}

function buttonLabel(label: string, suffix?: string) {
  const clipped = Array.from(label).slice(0, 45).join('');
  return suffix ? clipped + ' · ' + suffix : clipped;
}

function pagination(
  keyboard: InlineKeyboard,
  view: string,
  current: number,
  total: number,
) {
  if (current > 1) keyboard.text('‹', view + ':' + (current - 1));
  if (current < total) keyboard.text('›', view + ':' + (current + 1));
  if (total > 1) keyboard.row();
}

function back(keyboard: InlineKeyboard, action = 'home') {
  return keyboard.text(action === 'home' ? '⌂ Menyu' : '‹ Orqaga', action);
}
