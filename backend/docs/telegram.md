# Deal Alert Telegram bot

Bot grammY orqali bir xil NestJS jarayonida ishlaydi. U alohida worker, Redis yoki BullMQ talab qilmaydi. PostgreSQL hisob bog‘lanishi va takroriy webhook qabulini boshqaradi.

## Ishga tushirish

1. [BotFather](https://t.me/BotFather) orqali bot yarating. Tokenni serverning maxfiy sozlamalariga `TELEGRAM_BOT_TOKEN`, bot nomini esa `TELEGRAM_BOT_USERNAME` sifatida kiriting.
2. Endpoint ommaviy HTTPS orqali `POST /api/telegram/webhook` manzilida ishlashi kerak. `TELEGRAM_AUTO_WEBHOOK=true` server ishga tushganda webhook va bot buyruqlarini Telegram’da ro‘yxatga oladi.
3. Webhook kaliti odatda `APP_SECRET` dan alohida hosil qilinadi. `TELEGRAM_WEBHOOK_SECRET` berilsa, kamida 24 ta URL-safe belgi kiriting. Telegram shu qiymatni har bir webhook so‘rovida yuboradi.
4. Saytda **Settings → Account → Telegram** bo‘limini oching. Bir martalik havola orqali botga o‘ting va **Start** tugmasini bosing. Havola 5 daqiqada eskiradi. **Disconnect** bog‘lanish va faol havolani bekor qiladi.

Botda `/menu`, `/qidir <nom>`, kuzatuv, narx tarixi, taqqoslash, bildirishnomalar va kolleksiyalar bor. Mahsulot rasmi olinadigan joyga qarab Telegram’ga URL yoki yig‘ilgan lokal asset yuboriladi. Rasm ochilmasa mahsulot tafsilotlari matnda ko‘rsatiladi.

Bot alohida Telegram akkauntlarini yaratmaydi. Kuzatuv va harakatlar bog‘langan Deal Alert hisobida bajariladi. Bildirishnomalar Telegram menyusida ko‘rinadi.

## Render Free

Repozitordagi `render.yaml` frontendni Static Site sifatida, API va botni bitta Web Service shaklida yig‘adi. [Deploy sozlamalari](render-deploy.md). `DATABASE_URL` uchun doimiy PostgreSQL ulanishini bering. Render Free Postgres 30 kundan keyin tugaydi. Bepul web service 15 daqiqa kiruvchi trafik bo‘lmaganda uyquga o‘tadi, shu vaqt fon monitoringi va email navbati ishlamaydi. [Render Free cheklovlari](https://render.com/docs/free)

Render Free SMTP portlarini bloklaydi. `RESEND_API_KEY` va tasdiqlangan domeningizdagi `MAIL_FROM` orqali HTTPS email transportini ishlating. Lokal muhitda `SMTP_URL` bilan ishlash mumkin. [Resend email API](https://resend.com/docs/api-reference/emails/send-email)

Manbalarni tasdiqlashdan so‘nggina `SCRAPE_APPROVED_SOURCES` va `SCRAPE_CONTACT` ni kiriting. .env fayllarini repozitoriyga yuklamang.

## Lokal sinov

Localhost uchun `TELEGRAM_POLLING=true` ni belgilang. Shu NestJS jarayoni Telegram yangiliklarini oladi. Botda mavjud webhook aniqlansa, polling uni o‘zgartirmaydi. HTTPS muhitida `TELEGRAM_AUTO_WEBHOOK=true` orqali webhook ishlatiladi.
