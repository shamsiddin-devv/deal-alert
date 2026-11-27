# Deal Alert backend

NestJS, PostgreSQL, Drizzle va bcrypt asosidagi bitta ilova. Domain qoidalari `src/domain`, use case va portlar `src/application`, persistence va tashqi adapterlar `src/infrastructure`, HTTP validatsiya hamda marshrutlar `src/presentation/http` ichida.

[Frontend amallari va API xaritasi](docs/frontend-api-map.md) · [API ishlatish](docs/api.md) · [Marketplace amaliyoti](docs/marketplaces.md) · [Telegram va Render](docs/telegram.md)

## Lokal ishga tushirish

Node.js 22+ va PostgreSQL 15+ kerak. `.env.example` asosida `.env` yarating yoki mavjud lokal sozlamalarni foydalaniladigan muhitga moslang. `DATABASE_URL`, kamida 32 baytli tasodifiy `APP_SECRET` va `APP_ORIGIN` kerak. Misoldagi placeholder kalit ishlatilmaydi. `APP_SECRET` almashtirilsa sessiyalar, amaldagi kodlar va eski shifrlangan navbat xabarlari bilan ishlash uchun rotatsiya rejasini oldindan belgilang.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run build
npm.cmd run start:prod
```

`GET /api/health` jarayon holatini, `GET /api/health/ready` baza va migratsiya holatini bildiradi. Migratsiyani serverdan mustaqil, maqsadli bazaga bir marta bajaring. Migratsiyalar eski jadval va yozuvlarni saqlaydi, tanilgan manbali HTTPS legacy kuzatuvlarini yangi katalogga bog‘laydi. Takroriy legacy kuzatuvlardan bittasi faol API modeli bilan bog‘lanadi, qolgan eski qatorlar o‘chirilmaydi. Eski bir xil emailning turli registrli yozuvlari bo‘lsa, bazada noyob indeks qo‘llashdan oldin ularni tekshiring.

`npm.cmd test` domain, manba adapterlari va ajratilgan PGlite SQL orqali HTTP testlarini ishlatadi. `npm.cmd run test:e2e` faqat HTTP to‘plamini ishlatadi. Testlar lokal `.env` bazasiga ulanmaydi va tashqi xabar yubormaydi.

## Ish jarayoni

- `@nestjs/schedule` ilova ichidagi tokni boshqaradi. PostgreSQL `FOR UPDATE SKIP LOCKED`, tokenli lease va manba bo‘yicha so‘rov byudjeti instansiyalarni muvofiqlashtiradi. Narx o‘lchovi, kuzatuv holati, alert va email outbox bir tranzaksiyada yoziladi.
- `WORKERS_DISABLED=true` rejalashtirilgan monitoring, email va xizmat vazifalarini to‘xtatadi. `SCRAPE_APPROVED_SOURCES` bo‘sh holatda tashqi marketplace so‘rovlari o‘chiq. Email transporti `MAIL_FROM` bilan birga `SMTP_URL` yoki `RESEND_API_KEY` orqali sozlanadi. Email outbox qayta urinish va barqaror Message-ID ishlatadi. SMTP yetkazish semantikasi kamida bir marta urinish; SMTP qabulidan keyingi uzilishda qabul qiluvchi dublikat olishi mumkin.
- BullMQ, Redis va mikroservis transporti runtime bilan bog‘lanmagan. `.env.example` dagi zaxira namunalari o‘qilmaydi.
- Narx va taklif katalogi tasdiqlangan listing preview va davriy o‘lchovlardan shakllanadi. Birinchi joriy narx tarix sifatida yoziladi, avvalgi tarix soxtalashtirilmaydi. Listing bo‘yicha mavjud dalillar yetarli bo‘lmasa deal balli yoki yakuniy yetkazish xarajati noma’lum bo‘lishi mumkin.

Frontend uchun `frontend/` katalogida `npm.cmd run dev` buyrug‘ini ishga tushiring. Vite `/api` so‘rovlarini NestJS’ga yo‘naltiradi. Production’da frontend va API bitta origin ostida ishlaydi. `APP_ORIGIN` qiymatini shu HTTPS manziliga tenglang. Email tasdiqlash va parolni tiklash SMTP sozlamalaridan foydalanadi.

## Production’da bitta origin orqali ishga tushirish

Frontendda `npm.cmd ci` va `npm.cmd run build` ni bajaring. Backend katalogida `npm.cmd ci`, `npm.cmd run db:check`, `npm.cmd run db:migrate` va `npm.cmd run build` ni bajaring.

Backend jarayoniga `NODE_ENV=production` va `FRONTEND_DIST_DIR=../frontend/dist` ni bering. `APP_ORIGIN` ni foydalanuvchi ochadigan HTTPS origin bilan moslang. `npm.cmd run start:prod` frontend fayllari va API’ni bir jarayonda beradi. TLS sertifikati va domen reverse proxy yoki hosting muhitida sozlanadi. `GET /api/health/ready` ni tayyorlik tekshiruvi sifatida ishlating.

Frontend boshqa serverda beriladigan bo‘lsa, `FRONTEND_DIST_DIR` ni bo‘sh qoldiring va ochiq origin ostidagi `/api/*` so‘rovlarini NestJS’ga yo‘naltiring.

Sinov mahsulotlari o‘z hisobida ko‘rinadi. Jonli katalog tasdiqlangan manbalar va monitoring orqali shakllanadi. Ruxsat va sozlamalar [marketplace qo‘llanmasida](docs/marketplaces.md).
