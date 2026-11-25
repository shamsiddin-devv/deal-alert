# Marketplace ishlash tartibi

Asaxiy, Mediapark, Texnomart, ISHONCH, OLX, Uzum, NOUT.uz, ComputerHouse va UPG uchun source profillari mavjud. Profil ruxsat etilgan host, mahsulot yo‘li, HTML selektorlari va minimal so‘rov oralig‘ini belgilaydi. Normalizator tanlangan listingning Product/Offer JSON-LD’ini, metadata va hududga mos selectorlarni o‘qiydi. Qo‘llab-quvvatlanadigan valyuta UZS. To‘lov rejasi yoki tavsiya qilingan boshqa mahsulotni joriy narx sifatida ishlatmaydi.

| Manba | Kirish holati |
| --- | --- |
| OLX.uz | [Amaldagi foydalanish qoidalari](https://help.olx.uz/olxuzhelp/s/article/olxuz-tos-november-2026-update-uz) avtomatik yig‘ishni cheklaydi. HTML parser faqat fixture uchun. Jonli rejimda adapter yopiq. Ruxsat berilgan feed uchun alohida integratsiya kerak. |
| ISHONCH | [Rasmiy sayt](https://ishonchsavdo.uz/) ko‘rsatgan online do‘kon hosti `ecom.ishonchsavdo.uz`. Mahsulot yo‘li va formatini ruxsatli namunalar bilan tekshirgach yoqing. |
| Texnomart | [Robots qoidalari](https://texnomart.uz/robots.txt) rasmiy CDN manziliga yo‘naltiriladi. Adapter faqat shu aniq siyosat manziliga o‘tadi. |
| UPG | [Robots qoidalari](https://upg.uz/robots.txt) ayrim javoblarda `Content-Type` sarlavhasisiz keladi. Bunday javobda `User-agent` qatori tekshiriladi. |
| Qolgan manbalar | Ruxsat va markup tekshirilmaguncha o‘chiq. Fixture sinovi jonli sayt sertifikati sifatida ishlatilmaydi. |

Manba shartlari va ruxsat ko‘lami aniq bo‘lganda `SCRAPE_APPROVED_SOURCES`ga source kodini, `SCRAPE_CONTACT`ga javob qabul qiladigan emailni kiriting. Broker, captcha yechish, proksi almashtirish hamda autentifikatsiya sahifalariga avtomatik kirish ishlatilmaydi. Product HTTP worker faqat HTTPS va ma’lum marketplace hostlariga ulanadi, redirects qayta tekshiriladi, DNS global unicast manzilga bog‘lanadi, javob hajmi va vaqt cheklanadi. 401, 403 va 451 kirishni to‘xtatadi. 429 va 503 manba byudjetini sovutadi. Robots javobi xato yoki mos formatda bo‘lmasa listing olinmaydi.

Bir listingni bir necha foydalanuvchi kuzatsa, bitta snapshot olinadi. Yangi narx avvalgi narx bilan qiyoslanadi. Deal bahosi oxirgi 90 kun medianasi, tarixiy minimum va reklama qilingan ustama bilan solishtiriladi. Brend va MPN, GTIN yoki aniq konfiguratsiya dalili yetarli takliflar taqqoslanadi. Barcha manbalarni yoppasiga crawler orqali kataloglash yoki litsenziyasiz agregatsiya rejimi yo‘q.
