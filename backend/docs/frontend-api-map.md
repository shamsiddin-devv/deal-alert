# Frontend → backend shartnomasi

Frontend `AuthContext` orqali sessiya, `WorkspaceContext` orqali kabinet ma’lumotlari va amallarini boshqaradi. Brauzer `/api` ni bir origin orqali chaqiradi.

| UI va amallar | Backend kontrakti |
| --- | --- |
| Landing, hero va narx misoli, FAQ, mobil menyu, 404 | Statik matn, demo grafik, havolalar, animatsiya va ko‘rinish frontendga tegishli. `GET /marketplaces` manbalar holatini beradi. |
| Sign up, login, remember, verify, resend, recovery, reset | `POST /auth/register`, `/login`, `/verify-email`, `/resend-verification`, `/forgot-password`, `/reset-password`, `/logout`. Tasdiqlash olti raqamli kod, tiklash bir martalik token bilan. |
| Overview va Topbar | `GET /dashboard` hisoblagich, recent, tavsiyalar va salomatlik; `GET /products/:id/history` grafik; `GET /search` global qidiruv; `GET /alerts` va `POST /alerts/read-all`. |
| Add Product dialog, URL → preview → tracking | `POST /products/preview`, `POST /products`. Faqat tanilgan manba URL’i, mavjud listingni qayta ishlatish, target, drop %, stock/increase va chastota. |
| Explore Deals, grid/list, pagination | `GET /deals`. Query, marketplace, brand, category, condition, min/max, minDiscount, inStock, histLow, dropOnly, score/discount/price-asc/change/recent. Layout switch mijozda. |
| My Products, status, target dialog va bulk amallar | `GET /products`, `PATCH /products/:id`, `DELETE /products/:id`, `POST /products/bulk`, `GET /products/export`. Status, query va recent/change/price/name saralash. |
| Product Detail, galereya, specs, takliflar, chart, events | `GET /products/:id`, `/history`, `/offers`; kuzatuv shartlarini PATCH bilan saqlash, `POST /products/:id/check` bilan navbatdagi tekshiruvni tezlashtirish. Galereya tanlovi lokal. |
| Compare, qidiruv, yangi va ishlatilgan takliflar | `GET /search`, `GET /products/:id/offers`; model+konfiguratsiya mosligi, narx va yetkazish, kafolat, qaytarish, mavjudlik. Ma’lumot yo‘qligi null bilan beriladi. |
| Collections, create/rename/delete va item boshqarish | `GET/POST /collections`, `PATCH/DELETE /collections/:id`, `PUT/DELETE /collections/:id/products/:productId`. |
| History, vaqt oralig‘i, jadval, marketplace/query | `GET /products/:id/history?range=90d`, `GET /history`; 7d/30d/90d/6m/1y/all, stats, real o‘zgarishlar, pagination. |
| Alerts, tur bo‘yicha tab, read/unread, delete, prefs | `GET /alerts`, `PATCH/DELETE /alerts/:id`, `POST /alerts/read-all`, `GET/PATCH /me/preferences`. |
| Insights & savings | `GET /insights?period=weekly`: real narxlar, marketplace statistikasi, davriy trend, potensial/confirmed savings; `POST /products/:id/purchases` tasdiqlangan xarid. |
| Settings: profile, monitoring, notification, theme, security, account | `GET/PATCH/DELETE /me`, `GET/PATCH /me/preferences`, `PUT /me/avatar`, `GET /avatars/:id`, `PUT /me/password`, `GET /me/sessions`, `DELETE /me/sessions/:id`, `GET /me/export`. Billing uchun API mavjud emas. |
| Help, keyboard shortcuts, FAQ qidiruvi va toastlar | Statik kontent va mahalliy boshqaruv. Murojaat formasi `POST /support` ga yuboriladi. |

`id` mahsulot uchun listing UUID; monitoring va savat egaligi server tomonda sessiyadan olinadi. UI bilan mos camelCase va marketplace nomlari hamda qo‘shimcha source kodlari. Paginatsiya `{ items, page, pageSize, total, totalPages }`. Xatolar `{ statusCode, code, message, details? }`. Miqdorlar integer UZS. Haqiqiy yozuv bo‘lmagan narx, rating yoki delivery o‘rniga o‘ylab topilgan qiymat qaytarilmaydi.

