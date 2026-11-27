import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

jest.setTimeout(30000);

describe('legacy tracking migration', () => {
  it('keeps legacy records and associates the imported history to one public listing', async () => {
    const pg = new PGlite();
    const root = join(__dirname, 'migrations');
    const apply = async (name: string) => {
      const sql = await readFile(join(root, name), 'utf8');
      await pg.transaction(async (tx) => {
        for (const statement of sql.split('--> statement-breakpoint')) {
          if (statement.trim()) await tx.exec(statement);
        }
      });
    };
    try {
      await apply('0000_fair_whistler.sql');
      await apply('0001_dashing_dark_phoenix.sql');
      const [user] = (
        await pg.query<{ id: string }>(
          "insert into users(full_name,phone_number) values('Legacy User','+998901111111') returning id",
        )
      ).rows;
      const product = 'https://asaxiy.uz/product/legacy-test';
      const [first] = (
        await pg.query<{ id: string }>(
          'insert into tracked_products(user_id,product_url,source,target_price,current_price) values($1,$2,$3,8000,10500) returning id',
          [user.id, product, 'ASAXIY'],
        )
      ).rows;
      await pg.query(
        "insert into tracked_products(user_id,product_url,source,target_price,current_price) values($1,$2,'ASAXIY',8000,10500)",
        [user.id, product],
      );
      await pg.query(
        'insert into price_history(tracked_product_id,price,"checkedAt") values($1,11000,$2),($1,9000,$3)',
        [first.id, '2026-10-01T00:00:00', '2026-10-02T00:00:00'],
      );
      await apply('0002_workspace_monitoring.sql');
      await apply('0003_listing_aliases.sql');
      await apply('0004_preserve_legacy_tracking.sql');
      expect(
        (
          await pg.query(
            'select price,first_price,low_price from market_listings',
          )
        ).rows,
      ).toEqual([{ price: 10500, first_price: 11000, low_price: 9000 }]);
      expect(
        (
          await pg.query(
            'select listing_id from tracked_products where listing_id is not null',
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (await pg.query('select id from tracked_products')).rows,
      ).toHaveLength(2);
      expect(
        (
          await pg.query(
            'select price,previous_price from price_observations order by checked_at',
          )
        ).rows,
      ).toEqual([
        { price: 11000, previous_price: null },
        { price: 9000, previous_price: 11000 },
      ]);
    } finally {
      await pg.close();
    }
  });
});
