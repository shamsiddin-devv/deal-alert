# Deal Alert frontend

React, TypeScript, Vite, Tailwind CSS, React Router va Recharts.

## Lokal ishga tushirish

Avval PostgreSQL migratsiyalarini qo‘llang va NestJS’ni ishga tushiring. Backend sozlamalari [backend qo‘llanmasida](../backend/README.md). Frontend katalogida quyidagilarni bajaring.

```powershell
npm.cmd ci
npm.cmd run dev
```

`http://localhost:5173` manzilini oching. NestJS boshqa portda ishlasa, `DEAL_API_PROXY_TARGET` ni Vite ishga tushishidan oldin belgilang. Backenddagi `APP_ORIGIN` brauzerda ochilgan origin bilan bir xil bo‘lishi kerak.

`npm.cmd run build` TypeScript’ni tekshiradi va `dist/` katalogini yaratadi. Production’da `/api/*` so‘rovlarini NestJS’ga, frontend marshrutlarini esa `index.html` ga yo‘naltiring. Brauzer sessiyasi bir origin ostida HttpOnly cookie orqali ishlaydi.

NestJS production build assetlarni ham berishi uchun backendda `FRONTEND_DIST_DIR=../frontend/dist` ni belgilang. Shu rejimda sahifa va API’ni backendning tashqi HTTPS manzilidan oching. Ishga tushirish tartibi [backend qo‘llanmasida](../backend/README.md).
