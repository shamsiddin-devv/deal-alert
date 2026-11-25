# Render deploy

Frontend Render Static Site sifatida `frontend/dist` katalogidan beriladi. API va Telegram bot bitta NestJS Web Service’da ishlaydi.

| Sozlama | Static Site | Web Service |
| --- | --- | --- |
| Build | `npm --prefix frontend ci --include=dev && npm --prefix frontend run build` | `npm --prefix backend ci --include=dev && npm --prefix backend run build` |
| Publish yoki start | `frontend/dist` | `cd backend && npm run db:migrate && npm run start:prod` |
| Health | | `/api/health/ready` |

`render.yaml` SPA marshrutlarini tayyorlaydi va frontendning Render originini backenddagi `APP_ORIGIN`ga beradi. Servislar yaratilgach, aynan shu workspace’dagi backendning haqiqiy HTTPS URL’ini tasdiqlang. Static Site’da `/api/*` uchun `Rewrite` qoidasini yarating. Destination qiymati backendning HTTPS URL’i va `/api/*`dan iborat. Masalan, `https://example-api.onrender.com/api/*`. Brauzer sessiyasi frontend originidagi HttpOnly cookie orqali ishlaydi.

Web Service uchun `DATABASE_URL` sifatida bulut PostgreSQL ulanishidan foydalaning. Render Free SMTP portlarini yopadi. Email tasdiqlash uchun `RESEND_API_KEY` va tasdiqlangan `MAIL_FROM` ni Render maxfiy sozlamalariga kiriting. Telegram tokeni va bot nomi Web Service sozlamalariga tegishli. Telegram webhook’i Web Service manzilida ro‘yxatdan o‘tadi.

Yakuniy sinovda quyidagilarni tekshiring.

- Static Site’da `/signup`, `/verify-email` va `/app/products` to‘g‘ridan to‘g‘ri ochiladi.
- Frontend URL’idagi `/api/health/ready` so‘rovi JSON qaytaradi.
- Email tasdiqlanadi va sessiya sahifa yangilanganda saqlanadi.
- Telegram bot `/start` buyrug‘iga javob beradi va hisob bir martalik havola orqali bog‘lanadi.

Render Free Web Service bo‘sh turganda uyquga o‘tadi. Render Free PostgreSQL 30 kundan keyin eskiradi. [Render Free cheklovlari](https://render.com/docs/free)
