import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../../application/auth.service';
import {
  alertDto,
  csvCell,
  productDto,
  WorkspaceService,
} from '../../application/workspace.service';
import {
  SCRAPER,
  type MarketplaceGateway,
  type Session,
} from '../../application/ports';
import { MARKETPLACES, SOURCES } from '../../domain/marketplace';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { CurrentSession, SessionGuard } from './http-boundaries';
import * as dto from './validation';

const idOf = (value: string) => dto.parse(dto.uuid, value);
const requireChange = (success: boolean, kind: string) => {
  if (!success) throw new NotFoundError(kind + ' not found');
};

@Controller()
export class MarketplaceController {
  constructor(@Inject(SCRAPER) private readonly scraper: MarketplaceGateway) {}
  @Get('marketplaces')
  marketplaces() {
    const enabled = this.scraper.enabled();
    return SOURCES.map((source) => ({
      source,
      name: MARKETPLACES[source].name,
      enabled: enabled.includes(source),
      ...(source === 'olx' ? { access: 'licensed-feed-required' } : {}),
    }));
  }
}

@Controller()
@UseGuards(SessionGuard)
export class WorkspaceController {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly auth: AuthService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentSession() session: Session) {
    return this.workspace.dashboard(session.userId);
  }

  @Get('deals')
  async deals(@CurrentSession() session: Session, @Query() query: unknown) {
    const [items, facets] = await Promise.all([
      this.workspace.list(
        session.userId,
        dto.parse(dto.dealQuery, query),
        false,
      ),
      this.workspace.repository.facets(session.userId),
    ]);
    return { ...items, facets };
  }

  @Get('search')
  search(@CurrentSession() session: Session, @Query() query: unknown) {
    return this.workspace.list(
      session.userId,
      dto.parse(dto.searchQuery, query),
      false,
    );
  }

  @Get('products')
  products(@CurrentSession() session: Session, @Query() query: unknown) {
    return this.workspace.list(
      session.userId,
      dto.parse(dto.productQuery, query),
      true,
    );
  }

  @Get('products/export')
  async csv(@CurrentSession() session: Session, @Res() response: Response) {
    const { items } = await this.workspace.list(
      session.userId,
      { page: 1, pageSize: 100, sort: 'name' },
      true,
    );
    const rows = [
      ['id', 'title', 'marketplace', 'price', 'targetPrice', 'status', 'url'],
    ];
    for (let page = 1; page <= 100; page++) {
      const data =
        page === 1
          ? items
          : (
              await this.workspace.list(
                session.userId,
                { page, pageSize: 100, sort: 'name' },
                true,
              )
            ).items;
      rows.push(
        ...data.map((item) =>
          [
            item.id,
            item.title,
            item.marketplace,
            item.price,
            item.targetPrice,
            item.status,
            item.url,
          ].map(csvCell),
        ),
      );
      if (data.length < 100) break;
    }
    response
      .attachment('deal-alert-products.csv')
      .type('text/csv')
      .send(rows.map((value) => value.join(',')).join('\r\n'));
  }

  @Post('products/preview')
  @HttpCode(200)
  async preview(@CurrentSession() session: Session, @Body() body: unknown) {
    await this.auth.limit('product-preview', session.userId, 20, 3600);
    return productDto(
      await this.workspace.preview(dto.parse(dto.preview, body).url),
    );
  }

  @Post('products')
  async add(@CurrentSession() session: Session, @Body() body: unknown) {
    return this.workspace.add(session.userId, dto.parse(dto.addProduct, body));
  }

  @Post('products/bulk')
  @HttpCode(204)
  async bulk(@CurrentSession() session: Session, @Body() body: unknown) {
    const data = dto.parse(dto.bulk, body);
    await this.workspace.repository.bulk(session.userId, data.ids, data.action);
  }

  @Get('products/:id')
  async product(@CurrentSession() session: Session, @Param('id') id: string) {
    return productDto(
      await this.workspace.requireProduct(session.userId, idOf(id)),
    );
  }

  @Patch('products/:id')
  patch(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.workspace.update(
      session.userId,
      idOf(id),
      dto.parse(dto.patchProduct, body),
    );
  }

  @Delete('products/:id')
  @HttpCode(204)
  async remove(@CurrentSession() session: Session, @Param('id') id: string) {
    await this.workspace.repository.bulk(session.userId, [idOf(id)], 'remove');
  }

  @Post('products/:id/check')
  @HttpCode(202)
  async requestCheck(
    @CurrentSession() session: Session,
    @Param('id') id: string,
  ) {
    await this.auth.limit('request-check', session.userId, 10, 3600);
    return this.workspace.requestCheck(session.userId, idOf(id));
  }

  @Get('products/:id/history')
  async productHistory(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Query('range') range: unknown,
  ) {
    const value = idOf(id);
    await this.workspace.requireProduct(session.userId, value);
    return this.workspace.repository.history(
      value,
      dto.parse(dto.range, range),
    );
  }

  @Get('products/:id/offers')
  offers(@CurrentSession() session: Session, @Param('id') id: string) {
    return this.workspace.offers(session.userId, idOf(id));
  }

  @Post('products/:id/purchases')
  async purchase(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.auth.limit('purchase', session.userId, 25, 3600);
    const listing = await this.workspace.requireProduct(
      session.userId,
      idOf(id),
    );
    const data = dto.parse(dto.purchase, body);
    return this.workspace.repository.purchase(
      session.userId,
      listing,
      data.paid,
      data.idempotencyKey,
    );
  }

  @Get('history')
  history(@CurrentSession() session: Session, @Query() input: unknown) {
    const { range, ...query } = dto.parse(dto.eventQuery, input);
    return this.workspace.repository.events(session.userId, range, query);
  }

  @Get('insights')
  insights(
    @CurrentSession() session: Session,
    @Query('period') value: unknown,
  ) {
    return this.workspace.insights(
      session.userId,
      dto.parse(dto.period, value),
    );
  }

  @Get('alerts')
  async alerts(@CurrentSession() session: Session, @Query() input: unknown) {
    const page = await this.workspace.repository.alerts(
      session.userId,
      dto.parse(dto.alertQuery, input),
    );
    return { ...page, items: page.items.map(alertDto) };
  }

  @Post('alerts/read-all')
  @HttpCode(204)
  async allRead(@CurrentSession() session: Session) {
    await this.workspace.repository.alertRead(session.userId, null, true);
  }

  @Patch('alerts/:id')
  @HttpCode(204)
  async alertRead(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Body() input: unknown,
  ) {
    requireChange(
      await this.workspace.repository.alertRead(
        session.userId,
        idOf(id),
        dto.parse(dto.alertPatch, input).read,
      ),
      'Alert',
    );
  }

  @Delete('alerts/:id')
  @HttpCode(204)
  async alertRemove(
    @CurrentSession() session: Session,
    @Param('id') id: string,
  ) {
    requireChange(
      await this.workspace.repository.removeAlert(session.userId, idOf(id)),
      'Alert',
    );
  }

  @Get('collections')
  collections(@CurrentSession() session: Session) {
    return this.workspace.repository.collections(session.userId);
  }

  @Post('collections')
  async collection(@CurrentSession() session: Session, @Body() input: unknown) {
    await this.auth.limit('collection-create', session.userId, 25, 3600);
    const { name, description } = dto.parse(dto.collection, input);
    return this.workspace.repository.createCollection(
      session.userId,
      name,
      description,
    );
  }

  @Patch('collections/:id')
  @HttpCode(204)
  async editCollection(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Body() input: unknown,
  ) {
    requireChange(
      await this.workspace.repository.editCollection(
        session.userId,
        idOf(id),
        dto.parse(dto.collectionPatch, input),
      ),
      'Collection',
    );
  }

  @Delete('collections/:id')
  @HttpCode(204)
  async removeCollection(
    @CurrentSession() session: Session,
    @Param('id') id: string,
  ) {
    requireChange(
      await this.workspace.repository.removeCollection(
        session.userId,
        idOf(id),
      ),
      'Collection',
    );
  }

  @Put('collections/:id/products/:productId')
  @HttpCode(204)
  async addItem(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    requireChange(
      await this.workspace.repository.collectionItem(
        session.userId,
        idOf(id),
        idOf(productId),
        true,
      ),
      'Collection or tracked product',
    );
  }

  @Delete('collections/:id/products/:productId')
  @HttpCode(204)
  async deleteItem(
    @CurrentSession() session: Session,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    requireChange(
      await this.workspace.repository.collectionItem(
        session.userId,
        idOf(id),
        idOf(productId),
        false,
      ),
      'Collection or tracked product',
    );
  }

  @Post('support')
  @HttpCode(202)
  async support(@CurrentSession() session: Session, @Body() input: unknown) {
    await this.auth.limit('support', session.userId, 5, 86400);
    const { subject, message } = dto.parse(dto.support, input);
    return this.workspace.repository.support(session.userId, subject, message);
  }
}
