# Render deploy

Frontend Render Static Site sifatida `frontend/dist` katalogidan beriladi. API va Telegram bot bitta NestJS Web Service’da ishlaydi.

| Sozlama | Static Site | Web Service |
| --- | --- | --- |
| Build | `npm --prefix frontend ci --include=dev && npm --prefix frontend run build` | `npm --prefix backend ci --include=dev && npm --prefix backend run build` |
| Publish yoki start | `frontend/dist` | `cd backend && npm run db:migrate && npm run start:prod` |
| Health | | `/api/health/ready` |

`render.yaml` SPA marshrutlarini tayyorlaydi va frontendning Render originini backenddagi `APP_ORIGIN`ga beradi. Servislar yaratilgach, aynan shu workspace’dagi backendning haqiqiy HTTPS URL’ini tasdiqlang. Static Site’da `/api/*` uchun `Rewrite` qoidasini yarating. Destination qiymati backendning HTTPS URL’i va `/api/*`dan iborat. Masalan, `https://example-api.onrender.com/api/*`. Brauzer sessiyasi frontend originidagi HttpOnly cookie orqali ishlaydi.

Web Service uchun `DATABASE_URL` sifatida Neon pooled PostgreSQL ulanishini bering. Drizzle migratsiyalari uchun `DATABASE_MIGRATION_URL` orqali Neon direct ulanishidan foydalaning. Lokal baza va Render bazasi alohida saqlanadi.

Render Free 25, 465 va 587 SMTP portlarini bloklaydi. Brevo SMTP rasmiy 2525-portda STARTTLS bilan ishlaydi. Web Service’dagi `SMTP_URL` Brevo SMTP login, SMTP kaliti, `smtp-relay.brevo.com` hosti va 2525-portdan tuziladi. Login hamda kalitni URL percent-encoding bilan yozing. `MAIL_FROM` uchun Brevo’da tasdiqlangan jo‘natuvchi manzilidan foydalaning. [Brevo SMTP parametrlari](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP)

Telegram tokeni va bot nomi Web Service sozlamalariga tegishli. Telegram webhook’i Web Service manzilida ro‘yxatdan o‘tadi.

Yakuniy sinovda quyidagilarni tekshiring.

- Static Site’da `/signup`, `/verify-email` va `/app/products` to‘g‘ridan to‘g‘ri ochiladi.
- Frontend URL’idagi `/api/health/ready` so‘rovi JSON qaytaradi.
- Email tasdiqlanadi va sessiya sahifa yangilanganda saqlanadi.
- Telegram bot `/start` buyrug‘iga javob beradi va hisob bir martalik havola orqali bog‘lanadi.

Render Free Web Service bo‘sh turganda uyquga o‘tadi. Render Free PostgreSQL 30 kundan keyin eskiradi. [Render Free cheklovlari](https://render.com/docs/free)
