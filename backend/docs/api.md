# API ishlatish

Prefiks `/api`. Auth bilan bog‘liq javoblar va kabinet ma’lumotlari keshga berilmaydi. Brauzer bir origin orqali ishlaydi. Login va email tasdiqlashda `X-Deal-Client: browser` yuboriladi, server `HttpOnly` cookie o‘rnatadi. Cookie bilan holatni o‘zgartiruvchi so‘rovlarda origin `APP_ORIGIN` bilan mos bo‘lishi kerak. API klientlari `Authorization: Bearer <accessToken>` orqali ishlaydi.

| Amal | So‘rov va javob |
| --- | --- |
| Register | `POST /auth/register` bilan `{name,email,password,terms:true}`. 202 qabul qilinganini bildiradi. |
| Email kod | `POST /auth/verify-email` bilan `{email,code}`. `POST /auth/resend-verification` bilan `{email}`. Kod 10 daqiqa va ko‘pi bilan 5 tekshiruv. |
| Session | `POST /auth/login` bilan `{email,password,remember}`. Login va tasdiqlashda Bearer klienti `{accessToken,tokenType,expiresAt,user}`, brauzer `{expiresAt,user}` oladi. `POST /auth/logout` joriy sessiyani o‘chiradi. |
| Recovery | `POST /auth/forgot-password` bilan `{email}`. Linkdagi email va tokenni `POST /auth/reset-password` ga `{email,token,password}` sifatida uzating. Token 30 daqiqa amal qiladi. |
| Preview | `POST /products/preview` bilan `{url}`. Listing UUID, narx, holat, suratlar, seller, specs. Tashqi xizmat o‘chiq yoki cheklangan bo‘lsa 403, 429 yoki 503. |
| Kuzatishga qo‘shish | `POST /products` bilan `{listingId,targetPrice,dropPercent,watchStock,watchIncreases,frequency}`. `listingId` o‘rniga tasdiqlangan `url` qabul qilinadi. Kuzatuv parametrlari ixtiyoriy. |
| Yangilash | `PATCH /products/:id` bilan o‘zgargan kuzatuv maydonlari va `status: active\|paused`. `POST /products/bulk` bilan `{ids,action:pause\|resume\|remove}`. |
| Narx tarixi | `GET /products/:id/history?range=90d` bilan `{range,points,stats,events}`. Point `{date,ts,price}`, event `{date,from,to,change,pct}`. `GET /history` foydalanuvchi kuzatuvlari voqealarini sahifalaydi. |
| Offers | `GET /products/:id/offers` bilan `{productId,offers,bestNew,lowestOverall,priceSpread}`. Takliflar tekshirilgan moslikdan, noaniq qiymatlar `null`. |
| Alerts | `GET /alerts?types=target,price-drop&unread=true`. `PATCH /alerts/:id` bilan `{read:true\|false}`. `POST /alerts/read-all`. |
| Collections | `POST /collections` bilan `{name,description}`. Collection mahsulotini URL orqali PUT/DELETE, rename PATCH orqali. |
| Insights | `GET /insights?period=daily\|weekly\|monthly\|yearly`. `POST /products/:id/purchases` bilan `{paid,idempotencyKey}`. UUID kaliti takroriy xarid yozuvining oldini oladi. |
| Hisob | `PATCH /me` bilan `{name?,email?,currentPassword?}`. Email almashtirish joriy parol va yangi emailni tasdiqlashni talab qiladi. `PUT /me/password` bilan `{currentPassword,password}`; `DELETE /me` bilan `{currentPassword}`. |
| Avatar | `PUT /me/avatar` bilan `{mime,data}`, base64 PNG/JPEG/WebP, 128 kB gacha. Rasm marshrutini bearer bilan blob sifatida o‘qing. |
| Support | `POST /support` bilan `{subject,message}`. Murojaat DB’da saqlanadi. Operatorning javob interfeysi kiritilmagan. |

Qidiruv `query`, `page`, `pageSize` qabul qiladi. Deal filterida `marketplaces` nom yoki kodlarning vergul bilan ajratilgan ro‘yxati. Xatolar `{statusCode,code,message,details?}` bilan qaytadi. Boshqa foydalanuvchiga tegishli xususiy yozuvga murojaat 404 bilan tugaydi.

Narx, seller rating, yetkazish, kafolat va qaytarish siyosati manbada bo‘lmasa nullable. Brauzerning demo `seed` maydoni real narx tarixini shakllantirishda ishlatilmaydi.
