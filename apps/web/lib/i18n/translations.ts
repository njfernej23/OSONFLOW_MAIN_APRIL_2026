import { supplementalTranslations } from "./supplemental-translations"

export const SUPPORTED_LANGUAGES = ["en", "uz", "ru"] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  uz: "O'zbek",
  ru: "Русский",
}

type TranslationValue = {
  uz: string
  ru: string
}

export const translations: Record<string, TranslationValue> = {
  Language: {
    uz: "Til",
    ru: "Язык",
  },
  English: {
    uz: "Inglizcha",
    ru: "Английский",
  },
  "O'zbek": {
    uz: "O'zbek",
    ru: "Узбекский",
  },
  Russian: {
    uz: "Ruscha",
    ru: "Русский",
  },
  Login: {
    uz: "Kirish",
    ru: "Войти",
  },
  "Sign up": {
    uz: "Ro'yxatdan o'tish",
    ru: "Регистрация",
  },
  "Book a demo": {
    uz: "Demo band qilish",
    ru: "Заказать демо",
  },
  Dashboard: {
    uz: "Boshqaruv paneli",
    ru: "Панель управления",
  },
  Product: {
    uz: "Mahsulot",
    ru: "Продукт",
  },
  Pricing: {
    uz: "Narxlar",
    ru: "Цены",
  },
  Automation: {
    uz: "Avtomatlashtirish",
    ru: "Автоматизация",
  },
  Integrations: {
    uz: "Integratsiyalar",
    ru: "Интеграции",
  },
  "Main navigation": {
    uz: "Asosiy navigatsiya",
    ru: "Основная навигация",
  },
  "Osonflow support desk": {
    uz: "Osonflow qo'llab-quvvatlash markazi",
    ru: "Служба поддержки Osonflow",
  },
  "Turn chat, voice, help content, and human follow-up into one live support workspace that answers quickly and escalates cleanly.":
    {
      uz: "Chat, ovoz, yordam kontenti va mutaxassis kuzatuvini tez javob beradigan va kerak bo'lsa aniq eskalatsiya qiladigan yagona jonli qo'llab-quvvatlash maydoniga aylantiring.",
      ru: "Объедините чат, голос, справочные материалы и работу операторов в единую живую рабочую область поддержки, которая быстро отвечает и аккуратно передает сложные вопросы.",
    },
  "Build my support desk": {
    uz: "Qo'llab-quvvatlash markazimni yaratish",
    ru: "Создать службу поддержки",
  },
  "See product": {
    uz: "Mahsulotni ko'rish",
    ru: "Смотреть продукт",
  },
  "Website chat": {
    uz: "Sayt chati",
    ru: "Чат на сайте",
  },
  "AI voice": {
    uz: "AI ovoz",
    ru: "AI-голос",
  },
  "Human handoff": {
    uz: "Mutaxassisga uzatish",
    ru: "Передача оператору",
  },
  "Customer memory": {
    uz: "Mijoz xotirasi",
    ru: "Память о клиенте",
  },
  "For teams that want fewer support tools and better answers.": {
    uz: "Kamroq qo'llab-quvvatlash vositalari va yaxshiroq javoblarni istagan jamoalar uchun.",
    ru: "Для команд, которым нужно меньше инструментов поддержки и больше качественных ответов.",
  },
  "Widget, inbox, voice, analytics, automations, and integrations move as one system.":
    {
      uz: "Vidjet, inbox, ovoz, analitika, avtomatlashtirish va integratsiyalar bitta tizim sifatida ishlaydi.",
      ru: "Виджет, inbox, голос, аналитика, автоматизация и интеграции работают как одна система.",
    },
  "Osonflow live": {
    uz: "Osonflow jonli",
    ru: "Osonflow онлайн",
  },
  Inbox: {
    uz: "Inbox",
    ru: "Входящие",
  },
  "AI chats": {
    uz: "AI chatlar",
    ru: "AI-чаты",
  },
  Voice: {
    uz: "Ovoz",
    ru: "Голос",
  },
  Memory: {
    uz: "Xotira",
    ru: "Память",
  },
  Analytics: {
    uz: "Analitika",
    ru: "Аналитика",
  },
  "Priority queue": {
    uz: "Ustuvor navbat",
    ru: "Приоритетная очередь",
  },
  "Ranked by urgency, revenue, and sentiment": {
    uz: "Shoshilinchlik, daromad va kayfiyat bo'yicha tartiblangan",
    ru: "Отсортировано по срочности, выручке и настроению",
  },
  "Plan change before renewal": {
    uz: "Yangilanishdan oldin tarifni o'zgartirish",
    ru: "Смена тарифа перед продлением",
  },
  "Payment failed twice": {
    uz: "To'lov ikki marta amalga oshmadi",
    ru: "Платеж дважды не прошел",
  },
  "Invoice export": {
    uz: "Hisob-fakturani eksport qilish",
    ru: "Экспорт счета",
  },
  "AI drafting": {
    uz: "AI javob tayyorlamoqda",
    ru: "AI готовит ответ",
  },
  "Human priority": {
    uz: "Mutaxassis ustuvorligi",
    ru: "Приоритет оператора",
  },
  Resolved: {
    uz: "Hal qilindi",
    ru: "Решено",
  },
  "AI confidence": {
    uz: "AI ishonchi",
    ru: "Уверенность AI",
  },
  "first reply": {
    uz: "birinchi javob",
    ru: "первый ответ",
  },
  "doc gaps": {
    uz: "hujjat kamchiliklari",
    ru: "пробелы в документах",
  },
  "Conversation with Amina": {
    uz: "Amina bilan suhbat",
    ru: "Диалог с Аминой",
  },
  "Customer memory loaded": {
    uz: "Mijoz xotirasi yuklandi",
    ru: "Память клиента загружена",
  },
  Call: {
    uz: "Qo'ng'iroq",
    ru: "Звонок",
  },
  "Can I change my plan today and keep the same billing cycle?": {
    uz: "Bugun tarifimni o'zgartirib, shu billing davrini saqlab qola olamanmi?",
    ru: "Могу ли я сегодня сменить тариф и сохранить тот же платежный цикл?",
  },
  "Yes. Your cycle stays the same, and the difference is prorated automatically.":
    {
      uz: "Ha. Davringiz o'zgarmaydi, farq esa avtomatik ravishda proporsional hisoblanadi.",
      ru: "Да. Ваш цикл останется прежним, а разница будет автоматически пересчитана пропорционально.",
    },
  "Suggested next action": {
    uz: "Tavsiya etilgan keyingi amal",
    ru: "Рекомендуемое следующее действие",
  },
  "Send upgrade link, mention prorated billing, and watch the account if payment fails.":
    {
      uz: "Yangilash havolasini yuboring, proporsional billingni eslating va to'lov amalga oshmasa akkauntni kuzating.",
      ru: "Отправьте ссылку на апгрейд, упомяните пропорциональный расчет и отслеживайте аккаунт при сбое платежа.",
    },
  "Reply with AI assistance...": {
    uz: "AI yordami bilan javob yozing...",
    ru: "Ответить с помощью AI...",
  },
  "One support layer for the channels customers already use.": {
    uz: "Mijozlar allaqachon foydalanadigan kanallar uchun yagona qo'llab-quvvatlash qatlami.",
    ru: "Единый слой поддержки для каналов, которыми клиенты уже пользуются.",
  },
  "fewer repeat questions": {
    uz: "takroriy savollar kamroq",
    ru: "меньше повторных вопросов",
  },
  "faster first response": {
    uz: "birinchi javob tezroq",
    ru: "быстрее первый ответ",
  },
  "coverage across chat and voice": {
    uz: "chat va ovoz bo'ylab qamrov",
    ru: "покрытие чата и голоса",
  },
  "Show the product doing the work": {
    uz: "Mahsulot ishni qanday bajarayotganini ko'rsating",
    ru: "Покажите продукт в работе",
  },
  "Customers see one story three ways: the dashboard steering work, the website widget answering on-site, and voice handoff preserving context.":
    {
      uz: "Mijozlar bitta jarayonni uch ko'rinishda ko'radi: ishni boshqaruvchi panel, saytda javob beruvchi vidjet va kontekstni saqlaydigan ovozli uzatish.",
      ru: "Клиенты видят один процесс в трех вариантах: панель управляет работой, виджет отвечает на сайте, а голосовая передача сохраняет контекст.",
    },
  "Dashboard command view": {
    uz: "Boshqaruv paneli ko'rinishi",
    ru: "Командный вид панели",
  },
  "Queue, AI confidence, customer memory, and escalation state.": {
    uz: "Navbat, AI ishonchi, mijoz xotirasi va eskalatsiya holati.",
    ru: "Очередь, уверенность AI, память клиента и статус эскалации.",
  },
  "Website widget moment": {
    uz: "Sayt vidjeti holati",
    ru: "Момент виджета на сайте",
  },
  "A branded customer-facing assistant on the live site.": {
    uz: "Jonli saytda mijozga ko'rinadigan brendlangan yordamchi.",
    ru: "Брендированный помощник для клиентов на живом сайте.",
  },
  "Voice handoff trace": {
    uz: "Ovozli uzatish izi",
    ru: "След голосовой передачи",
  },
  "Realtime voice support with transcript and next action.": {
    uz: "Transkript va keyingi amal bilan real vaqt ovozli yordam.",
    ru: "Голосовая поддержка в реальном времени с транскриптом и следующим действием.",
  },
  Intent: {
    uz: "Niyat",
    ru: "Намерение",
  },
  Tone: {
    uz: "Ohang",
    ru: "Тон",
  },
  Next: {
    uz: "Keyingi",
    ru: "Далее",
  },
  "One operating loop, not five disconnected tools": {
    uz: "Besh alohida vosita emas, bitta ish sikli",
    ru: "Один рабочий цикл, а не пять разрозненных инструментов",
  },
  "Osonflow keeps the customer-facing assistant, the agent inbox, and the improvement loop in the same mental model.":
    {
      uz: "Osonflow mijozga ko'rinadigan yordamchi, agent inboxi va takomillashtirish siklini bir xil mantiqda ushlab turadi.",
      ru: "Osonflow держит клиентского помощника, inbox операторов и цикл улучшений в одной рабочей логике.",
    },
  "Answer instantly": {
    uz: "Darhol javob berish",
    ru: "Отвечать мгновенно",
  },
  "Ground the assistant in your files, help center, and policies so common questions do not wait for an agent.":
    {
      uz: "Oddiy savollar agentni kutmasligi uchun yordamchini fayllar, yordam markazi va siyosatlaringizga tayantiring.",
      ru: "Опирайте помощника на файлы, справочный центр и правила, чтобы типовые вопросы не ждали оператора.",
    },
  "Handoff with context": {
    uz: "Kontekst bilan uzatish",
    ru: "Передача с контекстом",
  },
  "When the question needs judgment, agents receive the customer history, priority, sentiment, and a clean next action.":
    {
      uz: "Savol insoniy bahoni talab qilganda, agentlar mijoz tarixi, ustuvorlik, kayfiyat va aniq keyingi amalni oladi.",
      ru: "Когда вопрос требует суждения, оператор получает историю клиента, приоритет, настроение и понятное следующее действие.",
    },
  "Improve the source": {
    uz: "Manbani yaxshilash",
    ru: "Улучшать источник",
  },
  "Every missed answer becomes a visible gap in docs, routing, automation, or product education.":
    {
      uz: "Har bir topilmagan javob hujjatlar, marshrutlash, avtomatlashtirish yoki mahsulot tushuntirishidagi ko'rinadigan bo'shliqqa aylanadi.",
      ru: "Каждый пропущенный ответ становится видимым пробелом в документах, маршрутизации, автоматизации или обучении продукту.",
    },
  "See where support is leaking time": {
    uz: "Qo'llab-quvvatlash qayerda vaqt yo'qotayotganini ko'ring",
    ru: "Увидьте, где поддержка теряет время",
  },
  "Analytics are attached to the real queue: unanswered questions, escalation reasons, sentiment, resolution source, and customer memory stay visible while the team works.":
    {
      uz: "Analitika haqiqiy navbatga bog'langan: javobsiz savollar, eskalatsiya sabablari, kayfiyat, yechim manbai va mijoz xotirasi jamoa ishlayotgan paytda ko'rinib turadi.",
      ru: "Аналитика привязана к реальной очереди: вопросы без ответа, причины эскалации, настроение, источник решения и память клиента остаются видимыми во время работы команды.",
    },
  "AI analytics": {
    uz: "AI analitikasi",
    ru: "AI-аналитика",
  },
  "Last 30 days": {
    uz: "Oxirgi 30 kun",
    ru: "Последние 30 дней",
  },
  Improving: {
    uz: "Yaxshilanmoqda",
    ru: "Улучшается",
  },
  answered: {
    uz: "javob berildi",
    ru: "отвечено",
  },
  resolved: {
    uz: "hal qilindi",
    ru: "решено",
  },
  saved: {
    uz: "tejaldi",
    ru: "сэкономлено",
  },
  Topic: {
    uz: "Mavzu",
    ru: "Тема",
  },
  Status: {
    uz: "Holat",
    ru: "Статус",
  },
  Time: {
    uz: "Vaqt",
    ru: "Время",
  },
  "Billing change": {
    uz: "Billing o'zgarishi",
    ru: "Изменение биллинга",
  },
  "Resolved by AI": {
    uz: "AI tomonidan hal qilindi",
    ru: "Решено AI",
  },
  "Payment failure": {
    uz: "To'lov xatosi",
    ru: "Сбой платежа",
  },
  "Needs person": {
    uz: "Mutaxassis kerak",
    ru: "Нужен человек",
  },
  "Voice support": {
    uz: "Ovozli yordam",
    ru: "Голосовая поддержка",
  },
  "In call": {
    uz: "Qo'ng'iroqda",
    ru: "В звонке",
  },
  "Refund policy": {
    uz: "Qaytarish siyosati",
    ru: "Политика возврата",
  },
  "Missing doc": {
    uz: "Hujjat yetishmaydi",
    ru: "Нет документа",
  },
  "New gap": {
    uz: "Yangi bo'shliq",
    ru: "Новый пробел",
  },
  "The queue learns from every unresolved question, then points your team at the exact source that needs a better answer.":
    {
      uz: "Navbat har bir hal qilinmagan savoldan o'rganadi va jamoangizga yaxshiroq javob kerak bo'lgan aniq manbani ko'rsatadi.",
      ru: "Очередь учится на каждом нерешенном вопросе и указывает команде точный источник, которому нужен лучший ответ.",
    },
  "Automations with a human-shaped safety net": {
    uz: "Inson nazorati bilan avtomatlashtirish",
    ru: "Автоматизация с человеческой страховкой",
  },
  "Route repetitive questions, draft answers, and surface urgent work while keeping your team in control of edge cases.":
    {
      uz: "Takroriy savollarni yo'naltiring, javoblar loyihasini tayyorlang va shoshilinch ishlarni ko'rsating, murakkab holatlarda esa nazorat jamoangizda qoladi.",
      ru: "Маршрутизируйте повторяющиеся вопросы, готовьте черновики ответов и поднимайте срочные задачи, сохраняя контроль команды над сложными случаями.",
    },
  "Explore automation": {
    uz: "Avtomatlashtirishni ko'rish",
    ru: "Изучить автоматизацию",
  },
  Signal: {
    uz: "Signal",
    ru: "Сигнал",
  },
  Route: {
    uz: "Yo'nalish",
    ru: "Маршрут",
  },
  State: {
    uz: "Holat",
    ru: "Состояние",
  },
  "New billing question": {
    uz: "Yangi billing savoli",
    ru: "Новый вопрос по биллингу",
  },
  "AI answer with policy citation": {
    uz: "Siyosat manbasi bilan AI javobi",
    ru: "AI-ответ со ссылкой на правило",
  },
  "94% confidence": {
    uz: "94% ishonch",
    ru: "94% уверенности",
  },
  "Create human priority thread": {
    uz: "Ustuvor mutaxassis mavzusini yaratish",
    ru: "Создать приоритетный диалог для оператора",
  },
  Escalated: {
    uz: "Eskalatsiya qilindi",
    ru: "Эскалировано",
  },
  "Voice request": {
    uz: "Ovozli so'rov",
    ru: "Голосовой запрос",
  },
  "Realtime assistant then handoff": {
    uz: "Avval real vaqt yordamchisi, keyin uzatish",
    ru: "Сначала помощник в реальном времени, затем передача",
  },
  "Route every customer channel into one desk": {
    uz: "Har bir mijoz kanalini bitta deskka yo'naltiring",
    ru: "Направляйте каждый клиентский канал в один desk",
  },
  "Osonflow keeps website chat, messaging apps, model providers, and voice support moving through the same memory, queue, and handoff rules.":
    {
      uz: "Osonflow sayt chati, messenjerlar, model provayderlari va ovozli yordamni bir xil xotira, navbat va uzatish qoidalari orqali boshqaradi.",
      ru: "Osonflow проводит чат сайта, мессенджеры, провайдеров моделей и голосовую поддержку через общую память, очередь и правила передачи.",
    },
  Chat: {
    uz: "Chat",
    ru: "Чат",
  },
  Models: {
    uz: "Modellar",
    ru: "Модели",
  },
  "lands in one timeline": {
    uz: "bitta vaqt chizig'iga tushadi",
    ru: "попадает в одну хронологию",
  },
  "Inbound signals": {
    uz: "Kiruvchi signallar",
    ru: "Входящие сигналы",
  },
  "One router for chat, messaging, voice, and API events": {
    uz: "Chat, messenjer, ovoz va API hodisalari uchun bitta router",
    ru: "Один маршрутизатор для чата, сообщений, голоса и API-событий",
  },
  "Website widget": {
    uz: "Sayt vidjeti",
    ru: "Виджет сайта",
  },
  "Plans, billing, product questions": {
    uz: "Tariflar, billing, mahsulot savollari",
    ru: "Тарифы, биллинг, вопросы о продукте",
  },
  "AI answer with source": {
    uz: "Manba bilan AI javobi",
    ru: "AI-ответ с источником",
  },
  "Customer resolved": {
    uz: "Mijoz muammosi hal qilindi",
    ru: "Клиентский вопрос решен",
  },
  "WhatsApp + Telegram": {
    uz: "WhatsApp + Telegram",
    ru: "WhatsApp + Telegram",
  },
  "Repeat questions from existing customers": {
    uz: "Mavjud mijozlardan takroriy savollar",
    ru: "Повторные вопросы от существующих клиентов",
  },
  "Same memory, same inbox": {
    uz: "Bir xil xotira, bir xil inbox",
    ru: "Та же память, тот же inbox",
  },
  "Thread unified": {
    uz: "Mavzu birlashtirildi",
    ru: "Диалог объединен",
  },
  "Urgent issue or typing is too slow": {
    uz: "Shoshilinch masala yoki yozish juda sekin",
    ru: "Срочная проблема или печатать слишком долго",
  },
  "Agent brief ready": {
    uz: "Agent uchun qisqacha ma'lumot tayyor",
    ru: "Сводка для оператора готова",
  },
  "Memory, confidence, and routing policy attached": {
    uz: "Xotira, ishonch va marshrutlash siyosati biriktirilgan",
    ru: "Память, уверенность и политика маршрутизации приложены",
  },
  "Shared customer memory": {
    uz: "Umumiy mijoz xotirasi",
    ru: "Общая память клиента",
  },
  "Channel analytics": {
    uz: "Kanal analitikasi",
    ru: "Аналитика каналов",
  },
  "Plans that scale with support complexity": {
    uz: "Qo'llab-quvvatlash murakkabligi bilan o'sadigan tariflar",
    ru: "Тарифы, которые растут вместе со сложностью поддержки",
  },
  "Start with the widget and inbox, then add automation, voice, analytics, and custom integrations when your team is ready.":
    {
      uz: "Vidjet va inboxdan boshlang, jamoangiz tayyor bo'lganda avtomatlashtirish, ovoz, analitika va maxsus integratsiyalarni qo'shing.",
      ru: "Начните с виджета и inbox, а затем добавляйте автоматизацию, голос, аналитику и кастомные интеграции, когда команда будет готова.",
    },
  Capability: {
    uz: "Imkoniyat",
    ru: "Возможность",
  },
  Launch: {
    uz: "Launch",
    ru: "Launch",
  },
  Scale: {
    uz: "Scale",
    ru: "Scale",
  },
  Custom: {
    uz: "Maxsus",
    ru: "Custom",
  },
  Talk: {
    uz: "Gaplashish",
    ru: "Обсудить",
  },
  "AI website widget": {
    uz: "AI sayt vidjeti",
    ru: "AI-виджет сайта",
  },
  "Knowledge base uploads": {
    uz: "Bilim bazasiga yuklash",
    ru: "Загрузка базы знаний",
  },
  "Shared inbox": {
    uz: "Umumiy inbox",
    ru: "Общий inbox",
  },
  "Automation rules": {
    uz: "Avtomatlashtirish qoidalari",
    ru: "Правила автоматизации",
  },
  "Custom integrations": {
    uz: "Maxsus integratsiyalar",
    ru: "Кастомные интеграции",
  },
  "Start Launch": {
    uz: "Launchni boshlash",
    ru: "Начать Launch",
  },
  "Start Scale": {
    uz: "Scaleni boshlash",
    ru: "Начать Scale",
  },
  "Book custom demo": {
    uz: "Maxsus demo band qilish",
    ru: "Заказать кастомное демо",
  },
  "Launch a support desk customers feel on day one": {
    uz: "Mijozlar birinchi kundanoq sezadigan qo'llab-quvvatlash deskini ishga tushiring",
    ru: "Запустите службу поддержки, которую клиенты почувствуют с первого дня",
  },
  "Add the widget, load your best answers, and let Osonflow handle the first response while your team keeps control of the moments that need judgment.":
    {
      uz: "Vidjetni qo'shing, eng yaxshi javoblaringizni yuklang va Osonflow birinchi javobni berishiga ruxsat bering, jamoangiz esa baho talab qiladigan vaziyatlarni nazorat qiladi.",
      ru: "Добавьте виджет, загрузите лучшие ответы и позвольте Osonflow брать первый ответ на себя, пока команда контролирует ситуации, требующие суждения.",
    },
  "Start free": {
    uz: "Bepul boshlash",
    ru: "Начать бесплатно",
  },
  "View pricing": {
    uz: "Narxlarni ko'rish",
    ru: "Смотреть цены",
  },
  "Day 1": {
    uz: "1-kun",
    ru: "День 1",
  },
  "Week 1": {
    uz: "1-hafta",
    ru: "Неделя 1",
  },
  Always: {
    uz: "Doim",
    ru: "Всегда",
  },
  "Install the widget": {
    uz: "Vidjetni o'rnatish",
    ru: "Установить виджет",
  },
  "Drop the script into your site and match the launcher to your brand.": {
    uz: "Skriptni saytingizga joylang va launcherni brendingizga moslang.",
    ru: "Добавьте скрипт на сайт и настройте launcher под бренд.",
  },
  "Load the answers": {
    uz: "Javoblarni yuklash",
    ru: "Загрузить ответы",
  },
  "Add files, help articles, product pages, policies, and pricing details.": {
    uz: "Fayllar, yordam maqolalari, mahsulot sahifalari, siyosatlar va narx tafsilotlarini qo'shing.",
    ru: "Добавьте файлы, статьи справки, страницы продукта, правила и детали цен.",
  },
  "Set the handoff rules": {
    uz: "Uzatish qoidalarini sozlash",
    ru: "Настроить правила передачи",
  },
  "Choose when AI answers, when voice starts, and when humans step in.": {
    uz: "AI qachon javob berishini, ovoz qachon boshlanishini va inson qachon qo'shilishini tanlang.",
    ru: "Выберите, когда отвечает AI, когда запускается голос и когда подключается человек.",
  },
  "Ready for live handoff": {
    uz: "Jonli uzatishga tayyor",
    ru: "Готово к живой передаче",
  },
  "Chat, voice, memory, routing, and analytics are part of the same launch path.":
    {
      uz: "Chat, ovoz, xotira, marshrutlash va analitika bitta ishga tushirish yo'lining bir qismi.",
      ru: "Чат, голос, память, маршрутизация и аналитика входят в один путь запуска.",
    },
  Online: {
    uz: "Onlayn",
    ru: "Онлайн",
  },
  "AI support, human handoff, voice, analytics, and customer memory in one calm operating layer.":
    {
      uz: "AI yordam, mutaxassisga uzatish, ovoz, analitika va mijoz xotirasi bitta sokin ish qatlamida.",
      ru: "AI-поддержка, передача оператору, голос, аналитика и память клиента в одном спокойном рабочем слое.",
    },
  "Build my support widget": {
    uz: "Qo'llab-quvvatlash vidjetimni yaratish",
    ru: "Создать виджет поддержки",
  },
  "Compare plans": {
    uz: "Tariflarni solishtirish",
    ru: "Сравнить тарифы",
  },
  "Make support feel present before your team logs in": {
    uz: "Jamoangiz tizimga kirmasidan oldin ham qo'llab-quvvatlash mavjudligini his qildiring",
    ru: "Сделайте поддержку заметной еще до входа команды",
  },
  "Launch the widget, train your assistant, and keep the human inbox focused on the moments that matter.":
    {
      uz: "Vidjetni ishga tushiring, yordamchini o'rgating va inson inboxini muhim vaziyatlarga qaratib turing.",
      ru: "Запустите виджет, обучите помощника и держите inbox операторов сфокусированным на важных моментах.",
    },
  "Osonflow Assistant": {
    uz: "Osonflow yordamchisi",
    ru: "Помощник Osonflow",
  },
  "Online and ready": {
    uz: "Onlayn va tayyor",
    ru: "Онлайн и готов",
  },
  "Hi! I can help with plans, billing, product questions, or connect you to the right person.":
    {
      uz: "Salom! Tariflar, billing, mahsulot savollari bo'yicha yordam bera olaman yoki sizni kerakli mutaxassisga ulayman.",
      ru: "Здравствуйте! Я помогу с тарифами, биллингом, вопросами о продукте или соединю с нужным специалистом.",
    },
  "Talk to sales": {
    uz: "Sotuv bo'limi bilan gaplashish",
    ru: "Связаться с продажами",
  },
  "Get support": {
    uz: "Yordam olish",
    ru: "Получить поддержку",
  },

  "Customer Support": {
    uz: "Mijozlarni qo'llab-quvvatlash",
    ru: "Поддержка клиентов",
  },
  Conversations: {
    uz: "Suhbatlar",
    ru: "Диалоги",
  },
  "AI voicechats": {
    uz: "AI ovozli chatlar",
    ru: "AI-голосовые чаты",
  },
  "Knowledge base": {
    uz: "Bilim bazasi",
    ru: "База знаний",
  },
  Configuration: {
    uz: "Sozlamalar",
    ru: "Конфигурация",
  },
  "Widget customization": {
    uz: "Vidjetni sozlash",
    ru: "Настройка виджета",
  },
  Workflows: {
    uz: "Workflowni sozlash",
    ru: "Workflow",
  },
  "Vapi voice": {
    uz: "Vapi ovozi",
    ru: "Голос Vapi",
  },
  Billing: {
    uz: "Billing",
    ru: "Биллинг",
  },
  "Plans & Billing": {
    uz: "Tariflar va billing",
    ru: "Тарифы и биллинг",
  },
  Growth: {
    uz: "O'sish",
    ru: "Рост",
  },
  "Manage your plan, usage, and billing details as your support operation grows.":
    {
      uz: "Qo'llab-quvvatlash ishingiz o'sgani sari tarif, foydalanish va billing ma'lumotlarini boshqaring.",
      ru: "Управляйте тарифом, использованием и биллингом по мере роста поддержки.",
    },
  "Premium Feature": {
    uz: "Premium imkoniyat",
    ru: "Премиум-функция",
  },
  "Upgrade your plan to unlock this feature.": {
    uz: "Bu imkoniyatni ochish uchun tarifingizni yangilang.",
    ru: "Обновите тариф, чтобы открыть эту функцию.",
  },
  "Search conversations": {
    uz: "Suhbatlarni qidirish",
    ru: "Поиск диалогов",
  },
  "Search customers, intents, or notes": {
    uz: "Mijozlar, niyatlar yoki eslatmalarni qidiring",
    ru: "Ищите клиентов, намерения или заметки",
  },
  "Search AI voicechats": {
    uz: "AI ovozli chatlarni qidirish",
    ru: "Поиск AI-голосовых чатов",
  },
  "Search transcripts or visitors": {
    uz: "Transkriptlar yoki tashrif buyuruvchilarni qidiring",
    ru: "Ищите транскрипты или посетителей",
  },
  "Clear search": {
    uz: "Qidiruvni tozalash",
    ru: "Очистить поиск",
  },
  All: {
    uz: "Hammasi",
    ru: "Все",
  },
  Mine: {
    uz: "Meniki",
    ru: "Мои",
  },
  Unassigned: {
    uz: "Biriktirilmagan",
    ru: "Не назначено",
  },
  Live: {
    uz: "Jonli",
    ru: "Активно",
  },
  Ended: {
    uz: "Tugagan",
    ru: "Завершено",
  },
  Today: {
    uz: "Bugun",
    ru: "Сегодня",
  },
  Yesterday: {
    uz: "Kecha",
    ru: "Вчера",
  },
  "Unknown visitor": {
    uz: "Noma'lum tashrif buyuruvchi",
    ru: "Неизвестный посетитель",
  },
  Visitor: {
    uz: "Tashrif buyuruvchi",
    ru: "Посетитель",
  },
  "No messages yet": {
    uz: "Hali xabarlar yo'q",
    ru: "Сообщений пока нет",
  },
  "Chat has ended": {
    uz: "Chat tugadi",
    ru: "Чат завершен",
  },
  "Conversation ended.": {
    uz: "Suhbat tugadi.",
    ru: "Диалог завершен.",
  },
  "Back to AI voicechats": {
    uz: "AI ovozli chatlarga qaytish",
    ru: "Назад к AI-голосовым чатам",
  },
  "Contact details": {
    uz: "Kontakt ma'lumotlari",
    ru: "Данные контакта",
  },
  "First Seen": {
    uz: "Birinchi ko'rilgan",
    ru: "Первый визит",
  },
  Country: {
    uz: "Mamlakat",
    ru: "Страна",
  },
  Timezone: {
    uz: "Vaqt zonasi",
    ru: "Часовой пояс",
  },
  Device: {
    uz: "Qurilma",
    ru: "Устройство",
  },
  Browser: {
    uz: "Brauzer",
    ru: "Браузер",
  },
  Platform: {
    uz: "Platforma",
    ru: "Платформа",
  },
  Location: {
    uz: "Joylashuv",
    ru: "Местоположение",
  },
  Actions: {
    uz: "Amallar",
    ru: "Действия",
  },
  Save: {
    uz: "Saqlash",
    ru: "Сохранить",
  },
  Cancel: {
    uz: "Bekor qilish",
    ru: "Отмена",
  },
  Delete: {
    uz: "O'chirish",
    ru: "Удалить",
  },
  Copy: {
    uz: "Nusxalash",
    ru: "Копировать",
  },
  Open: {
    uz: "Ochish",
    ru: "Открыть",
  },
  Close: {
    uz: "Yopish",
    ru: "Закрыть",
  },
  Rename: {
    uz: "Nomini o'zgartirish",
    ru: "Переименовать",
  },
  Duplicate: {
    uz: "Nusxasini yaratish",
    ru: "Дублировать",
  },
  "Snippet copied to clipboard": {
    uz: "Snippet buferga nusxalandi",
    ru: "Сниппет скопирован в буфер",
  },
  "Failed to copy snippet": {
    uz: "Snippetni nusxalab bo'lmadi",
    ru: "Не удалось скопировать сниппет",
  },
  "Failed to copy link": {
    uz: "Havolani nusxalab bo'lmadi",
    ru: "Не удалось скопировать ссылку",
  },
  "Something went wrong": {
    uz: "Nimadir xato ketdi",
    ru: "Что-то пошло не так",
  },
  "Loading...": {
    uz: "Yuklanmoqda...",
    ru: "Загрузка...",
  },
  Search: {
    uz: "Qidirish",
    ru: "Поиск",
  },
  "Search...": {
    uz: "Qidirish...",
    ru: "Поиск...",
  },
  "List view": {
    uz: "Ro'yxat ko'rinishi",
    ru: "Список",
  },
  "Grid view": {
    uz: "Katak ko'rinishi",
    ru: "Сетка",
  },

  "Widget Configuration": {
    uz: "Vidjet konfiguratsiyasi",
    ru: "Конфигурация виджета",
  },
  "Live Preview": {
    uz: "Jonli ko'rinish",
    ru: "Живой предпросмотр",
  },
  Appearance: {
    uz: "Ko'rinish",
    ru: "Внешний вид",
  },
  Colors: {
    uz: "Ranglar",
    ru: "Цвета",
  },
  Identity: {
    uz: "Identitet",
    ru: "Идентичность",
  },
  "Assistant name and brand logo": {
    uz: "Yordamchi nomi va brend logosi",
    ru: "Имя помощника и логотип бренда",
  },
  "Assistant name": {
    uz: "Yordamchi nomi",
    ru: "Имя помощника",
  },
  "Brand logo": {
    uz: "Brend logosi",
    ru: "Логотип бренда",
  },
  "Logo preview": {
    uz: "Logo ko'rinishi",
    ru: "Предпросмотр логотипа",
  },
  "Launcher Image": {
    uz: "Launcher rasmi",
    ru: "Изображение launcher",
  },
  "Launcher image preview": {
    uz: "Launcher rasmi ko'rinishi",
    ru: "Предпросмотр изображения launcher",
  },
  "Home background": {
    uz: "Bosh sahifa foni",
    ru: "Фон главной",
  },
  "Background preview": {
    uz: "Fon ko'rinishi",
    ru: "Предпросмотр фона",
  },
  "Chat Bubble": {
    uz: "Chat pufagi",
    ru: "Чат-пузырь",
  },
  "Launcher Icon": {
    uz: "Launcher ikonkasi",
    ru: "Иконка launcher",
  },
  "Powered By Text": {
    uz: "Powered by matni",
    ru: "Текст Powered by",
  },
  "Welcome message shown when chat opens": {
    uz: "Chat ochilganda ko'rsatiladigan salomlashuv xabari",
    ru: "Приветствие, которое показывается при открытии чата",
  },
  "Set the assistant's default behavior and rules": {
    uz: "Yordamchining standart xatti-harakati va qoidalarini sozlang",
    ru: "Настройте поведение и правила помощника по умолчанию",
  },
  Prompt: {
    uz: "Prompt",
    ru: "Промпт",
  },
  "Home cards": {
    uz: "Bosh sahifa kartalari",
    ru: "Карточки главной",
  },
  "Help center": {
    uz: "Yordam markazi",
    ru: "Справочный центр",
  },
  "Topic Title": {
    uz: "Mavzu nomi",
    ru: "Название темы",
  },
  "Topic Preview": {
    uz: "Mavzu qisqa ko'rinishi",
    ru: "Превью темы",
  },
  "Article Body": {
    uz: "Maqola matni",
    ru: "Текст статьи",
  },
  "Write the full article here": {
    uz: "To'liq maqolani shu yerga yozing",
    ru: "Напишите полную статью здесь",
  },
  "Open chat preview": {
    uz: "Chat previewni ochish",
    ru: "Открыть предпросмотр чата",
  },
  "Close chat": {
    uz: "Chatni yopish",
    ru: "Закрыть чат",
  },
  "Reset chat": {
    uz: "Chatni qayta boshlash",
    ru: "Сбросить чат",
  },
  "Chat with us": {
    uz: "Biz bilan chat qiling",
    ru: "Напишите нам",
  },
  "Get help from AI": {
    uz: "AIdan yordam olish",
    ru: "Получить помощь AI",
  },
  "How do I get started?": {
    uz: "Qanday boshlayman?",
    ru: "Как начать?",
  },
  "What are your pricing plans?": {
    uz: "Tariflaringiz qanday?",
    ru: "Какие у вас тарифы?",
  },
  "I need help with my account": {
    uz: "Akkountim bo'yicha yordam kerak",
    ru: "Мне нужна помощь с аккаунтом",
  },
  "Can I change my plan?": {
    uz: "Tarifimni o'zgartira olamanmi?",
    ru: "Могу ли я сменить тариф?",
  },
  "How do I update billing?": {
    uz: "Billingni qanday yangilayman?",
    ru: "Как обновить биллинг?",
  },
  "How do I update my profile?": {
    uz: "Profilimni qanday yangilayman?",
    ru: "Как обновить профиль?",
  },
  "When should I set my date?": {
    uz: "Sanani qachon belgilashim kerak?",
    ru: "Когда нужно указать дату?",
  },
  "Where can I ask questions?": {
    uz: "Savollarni qayerda bersam bo'ladi?",
    ru: "Где я могу задать вопросы?",
  },

  "API Keys": {
    uz: "API kalitlari",
    ru: "API-ключи",
  },
  "Widget Setup": {
    uz: "Vidjet sozlamasi",
    ru: "Настройка виджета",
  },
  "Event Webhooks": {
    uz: "Hodisa webhooklari",
    ru: "Webhook событий",
  },
  "Public API key": {
    uz: "Ommaviy API kaliti",
    ru: "Публичный API-ключ",
  },
  "Private API key": {
    uz: "Maxfiy API kaliti",
    ru: "Приватный API-ключ",
  },
  "Your public API key": {
    uz: "Ommaviy API kalitingiz",
    ru: "Ваш публичный API-ключ",
  },
  "Your private API key": {
    uz: "Maxfiy API kalitingiz",
    ru: "Ваш приватный API-ключ",
  },
  "Generate a snippet first": {
    uz: "Avval snippet yarating",
    ru: "Сначала создайте сниппет",
  },
  "Bottom right": {
    uz: "Pastki o'ng",
    ru: "Снизу справа",
  },
  "Bottom left": {
    uz: "Pastki chap",
    ru: "Снизу слева",
  },
  "HTML5": {
    uz: "HTML5",
    ru: "HTML5",
  },
  React: {
    uz: "React",
    ru: "React",
  },
  "Next.js": {
    uz: "Next.js",
    ru: "Next.js",
  },
  Javascript: {
    uz: "Javascript",
    ru: "Javascript",
  },
  "Add a single script tag in plain HTML.": {
    uz: "Oddiy HTMLga bitta script tegini qo'shing.",
    ru: "Добавьте один тег script в обычный HTML.",
  },
  "Mount the widget in a reusable React component.": {
    uz: "Vidjetni qayta ishlatiladigan React komponentida ulang.",
    ru: "Смонтируйте виджет в переиспользуемом React-компоненте.",
  },
  "Use next/script for client-side loading.": {
    uz: "Client-side yuklash uchun next/scriptdan foydalaning.",
    ru: "Используйте next/script для клиентской загрузки.",
  },
  "Load the widget programmatically with vanilla JS.": {
    uz: "Vidjetni vanilla JS orqali dasturiy yuklang.",
    ru: "Загружайте виджет программно через vanilla JS.",
  },
  "Custom Webhook": {
    uz: "Maxsus webhook",
    ru: "Кастомный webhook",
  },
  "Send the full signed JSON event payload to any endpoint.": {
    uz: "To'liq imzolangan JSON hodisa payloadini istalgan endpointga yuboring.",
    ru: "Отправляйте полный подписанный JSON payload события на любой endpoint.",
  },
  Discord: {
    uz: "Discord",
    ru: "Discord",
  },
  "Post rich event messages into a Discord channel via webhook.": {
    uz: "Webhook orqali Discord kanaliga boy hodisa xabarlarini yuboring.",
    ru: "Публикуйте расширенные сообщения событий в канал Discord через webhook.",
  },
  Telegram: {
    uz: "Telegram",
    ru: "Telegram",
  },
  "Push event updates with your Telegram bot into a chat.": {
    uz: "Telegram botingiz orqali hodisa yangiliklarini chatga yuboring.",
    ru: "Отправляйте обновления событий в чат через Telegram-бота.",
  },
  WhatsApp: {
    uz: "WhatsApp",
    ru: "WhatsApp",
  },
  "Deliver event updates through WhatsApp Cloud API.": {
    uz: "Hodisa yangiliklarini WhatsApp Cloud API orqali yetkazing.",
    ru: "Доставляйте обновления событий через WhatsApp Cloud API.",
  },
  "Contact Session Created": {
    uz: "Kontakt sessiyasi yaratildi",
    ru: "Контактная сессия создана",
  },
  "Conversation Created": {
    uz: "Suhbat yaratildi",
    ru: "Диалог создан",
  },
  "Conversation Status Changed": {
    uz: "Suhbat holati o'zgardi",
    ru: "Статус диалога изменен",
  },
  "Message Received": {
    uz: "Xabar qabul qilindi",
    ru: "Сообщение получено",
  },
  "Message Sent": {
    uz: "Xabar yuborildi",
    ru: "Сообщение отправлено",
  },
  "Triggered when a visitor starts a new contact session.": {
    uz: "Tashrif buyuruvchi yangi kontakt sessiyasini boshlaganda ishga tushadi.",
    ru: "Срабатывает, когда посетитель начинает новую контактную сессию.",
  },
  "Triggered when a new conversation is opened.": {
    uz: "Yangi suhbat ochilganda ishga tushadi.",
    ru: "Срабатывает при открытии нового диалога.",
  },
  "Triggered when a conversation moves between unresolved, escalated, or resolved.":
    {
      uz: "Suhbat hal qilinmagan, eskalatsiya qilingan yoki hal qilingan holatlar orasida o'tganda ishga tushadi.",
      ru: "Срабатывает, когда диалог меняет статус между нерешенным, эскалированным или решенным.",
    },
  "Triggered when a visitor sends a message.": {
    uz: "Tashrif buyuruvchi xabar yuborganda ishga tushadi.",
    ru: "Срабатывает, когда посетитель отправляет сообщение.",
  },
  "Triggered when an operator sends a message.": {
    uz: "Operator xabar yuborganda ishga tushadi.",
    ru: "Срабатывает, когда оператор отправляет сообщение.",
  },

  "New workflow": {
    uz: "Yangi workflow",
    ru: "Новый workflow",
  },
  "Workflow canvas": {
    uz: "Workflow kanvasi",
    ru: "Холст workflow",
  },
  "Workflow settings": {
    uz: "Workflow sozlamalari",
    ru: "Настройки workflow",
  },
  "Workflow actions": {
    uz: "Workflow amallari",
    ru: "Действия workflow",
  },
  "Workflow collaborators": {
    uz: "Workflow hamkorlari",
    ru: "Участники workflow",
  },
  "No saved workflows yet.": {
    uz: "Hali saqlangan workflow yo'q.",
    ru: "Сохраненных workflow пока нет.",
  },
  Run: {
    uz: "Ishga tushirish",
    ru: "Запустить",
  },
  "Start workflow": {
    uz: "Workflowni boshlash",
    ru: "Запустить workflow",
  },
  "Start the workflow to preview the chat.": {
    uz: "Chat previewini ko'rish uchun workflowni boshlang.",
    ru: "Запустите workflow, чтобы просмотреть чат.",
  },
  "Encountered a missing node. Stopping run.": {
    uz: "Yo'q node uchradi. Ish to'xtatildi.",
    ru: "Обнаружен отсутствующий узел. Выполнение остановлено.",
  },
  "Message step.": {
    uz: "Xabar bosqichi.",
    ru: "Шаг сообщения.",
  },
  "Image step is missing a URL.": {
    uz: "Rasm bosqichida URL yetishmaydi.",
    ru: "В шаге изображения нет URL.",
  },
  Card: {
    uz: "Karta",
    ru: "Карточка",
  },
  Start: {
    uz: "Boshlash",
    ru: "Старт",
  },
  Message: {
    uz: "Xabar",
    ru: "Сообщение",
  },
  Image: {
    uz: "Rasm",
    ru: "Изображение",
  },
  Buttons: {
    uz: "Tugmalar",
    ru: "Кнопки",
  },
  Condition: {
    uz: "Shart",
    ru: "Условие",
  },
  "Set Variable": {
    uz: "O'zgaruvchini sozlash",
    ru: "Установить переменную",
  },
  "Add Message": {
    uz: "Xabar qo'shish",
    ru: "Добавить сообщение",
  },
  "Add Image": {
    uz: "Rasm qo'shish",
    ru: "Добавить изображение",
  },
  "Add Trigger": {
    uz: "Trigger qo'shish",
    ru: "Добавить триггер",
  },
  "Add action": {
    uz: "Amal qo'shish",
    ru: "Добавить действие",
  },
  "Add connected block": {
    uz: "Ulangan blok qo'shish",
    ru: "Добавить связанный блок",
  },
  "Step categories": {
    uz: "Bosqich kategoriyalari",
    ru: "Категории шагов",
  },
  Agent: {
    uz: "Agent",
    ru: "Агент",
  },
  Listen: {
    uz: "Tinglash",
    ru: "Слушать",
  },
  Logic: {
    uz: "Mantiq",
    ru: "Логика",
  },
  Dev: {
    uz: "Dasturchi",
    ru: "Разработка",
  },
  "Configure the selected step.": {
    uz: "Tanlangan bosqichni sozlang.",
    ru: "Настройте выбранный шаг.",
  },
  "Canvas navigation": {
    uz: "Kanvas navigatsiyasi",
    ru: "Навигация по холсту",
  },
  "Canvas tools": {
    uz: "Kanvas vositalari",
    ru: "Инструменты холста",
  },
  "Zoom In": {
    uz: "Kattalashtirish",
    ru: "Приблизить",
  },
  "Zoom Out": {
    uz: "Kichraytirish",
    ru: "Отдалить",
  },
  "Fit canvas": {
    uz: "Kanvasni sig'dirish",
    ru: "Уместить холст",
  },
  "Rename node": {
    uz: "Node nomini o'zgartirish",
    ru: "Переименовать узел",
  },
  "Delete connection": {
    uz: "Ulanishni o'chirish",
    ru: "Удалить связь",
  },
  "Message tools": {
    uz: "Xabar vositalari",
    ru: "Инструменты сообщения",
  },
  "Card settings": {
    uz: "Karta sozlamalari",
    ru: "Настройки карточки",
  },
  "Card title": {
    uz: "Karta sarlavhasi",
    ru: "Заголовок карточки",
  },
  "Card image source": {
    uz: "Karta rasmi manbasi",
    ru: "Источник изображения карточки",
  },
  "Button label": {
    uz: "Tugma yorlig'i",
    ru: "Текст кнопки",
  },
  "Add button": {
    uz: "Tugma qo'shish",
    ru: "Добавить кнопку",
  },
  "Remove button": {
    uz: "Tugmani olib tashlash",
    ru: "Удалить кнопку",
  },
  Operator: {
    uz: "Operator",
    ru: "Оператор",
  },
  Equals: {
    uz: "Teng",
    ru: "Равно",
  },
  "Not equals": {
    uz: "Teng emas",
    ru: "Не равно",
  },
  "Return to Start": {
    uz: "Boshlanishga qaytish",
    ru: "Вернуться к старту",
  },
  "Tell the agent when this workflow should run.": {
    uz: "Bu workflow qachon ishlashi kerakligini agentga ayting.",
    ru: "Сообщите агенту, когда должен запускаться этот workflow.",
  },
  "Product command center": {
    uz: "Mahsulot boshqaruv markazi",
    ru: "Командный центр продукта",
  },
  "A polished AI support widget, shared conversation inbox, customer memory, voice support, and analytics designed as one operating system.":
    {
      uz: "Silliq AI yordam vidjeti, umumiy suhbat inboxi, mijoz xotirasi, ovozli yordam va analitika bitta operatsion tizim sifatida yaratilgan.",
      ru: "Отточенный AI-виджет поддержки, общий inbox диалогов, память клиента, голосовая поддержка и аналитика, созданные как единая операционная система.",
    },
  "Everything support needs in one calm surface": {
    uz: "Qo'llab-quvvatlashga kerak hamma narsa bitta sokin yuzada",
    ru: "Все, что нужно поддержке, в одном спокойном интерфейсе",
  },
  "The product is intentionally quiet for agents and immediate for customers: answer, hand off, analyze, and improve from one place.":
    {
      uz: "Mahsulot agentlar uchun ataylab sokin, mijozlar uchun esa darhol ishlaydi: javob berish, uzatish, tahlil qilish va yaxshilash bir joyda.",
      ru: "Продукт намеренно спокоен для операторов и мгновенен для клиентов: отвечайте, передавайте, анализируйте и улучшайте из одного места.",
    },
  "A dashboard that makes support measurable": {
    uz: "Qo'llab-quvvatlashni o'lchab bo'ladigan qiladigan panel",
    ru: "Панель, которая делает поддержку измеримой",
  },
  "Your team can see what AI handled, what still needs a person, which answers were missing, and where customer friction is rising.":
    {
      uz: "Jamoangiz AI nima hal qilganini, qayerda hali odam kerakligini, qaysi javoblar yetishmaganini va qayerda mijoz qiynalayotganini ko'radi.",
      ru: "Команда видит, что обработал AI, где еще нужен человек, каких ответов не хватило и где растет трение для клиентов.",
    },
  "Built around the support loop": {
    uz: "Qo'llab-quvvatlash sikli atrofida qurilgan",
    ru: "Построено вокруг цикла поддержки",
  },
  "Osonflow keeps AI, agents, channels, and knowledge in the same loop, so every solved question makes the next one easier.":
    {
      uz: "Osonflow AI, agentlar, kanallar va bilimni bir siklda ushlab turadi, shuning uchun har bir hal qilingan savol keyingisini osonlashtiradi.",
      ru: "Osonflow держит AI, операторов, каналы и знания в одном цикле, поэтому каждый решенный вопрос упрощает следующий.",
    },
  "Answers from your knowledge base": {
    uz: "Bilim bazangizdan javoblar",
    ru: "Ответы из вашей базы знаний",
  },
  "Upload files and URLs, then let the assistant respond with grounded support instead of vague guesses.":
    {
      uz: "Fayllar va URLlarni yuklang, yordamchi esa noaniq taxminlar o'rniga asosli yordam bilan javob bersin.",
      ru: "Загрузите файлы и URL, и помощник будет отвечать обоснованно, а не расплывчатыми догадками.",
    },
  "One inbox for every conversation": {
    uz: "Har bir suhbat uchun bitta inbox",
    ru: "Один inbox для каждого диалога",
  },
  "Track unresolved chats, escalations, AI sessions, and customer context without switching tools.":
    {
      uz: "Hal qilinmagan chatlar, eskalatsiyalar, AI sessiyalari va mijoz kontekstini vosita almashtirmasdan kuzating.",
      ru: "Отслеживайте нерешенные чаты, эскалации, AI-сессии и контекст клиентов без переключения инструментов.",
    },
  "Voice when chat is not enough": {
    uz: "Chat yetarli bo'lmaganda ovoz",
    ru: "Голос, когда чата недостаточно",
  },
  "Connect realtime AI voice and phone support for customers who need a faster path to help.":
    {
      uz: "Yordamga tezroq yo'l kerak bo'lgan mijozlar uchun real vaqt AI ovozi va telefon yordamini ulang.",
      ru: "Подключайте AI-голос и телефонную поддержку в реальном времени для клиентов, которым нужен более быстрый путь к помощи.",
    },
  "Unified conversation timeline": {
    uz: "Birlashtirilgan suhbat vaqt chizig'i",
    ru: "Единая хронология диалога",
  },
  "Every chat, voice call, AI reply, handoff, file citation, and customer note lands in one readable thread.":
    {
      uz: "Har bir chat, ovozli qo'ng'iroq, AI javobi, uzatish, fayl iqtibosi va mijoz eslatmasi bitta o'qiladigan mavzuga tushadi.",
      ru: "Каждый чат, голосовой звонок, AI-ответ, передача, ссылка на файл и заметка о клиенте попадают в один читаемый поток.",
    },
  "Customer memory that compounds": {
    uz: "Vaqt o'tishi bilan kuchayadigan mijoz xotirasi",
    ru: "Память клиента, которая накапливается",
  },
  "Keep preferences, product context, prior issues, and support history ready before a teammate opens the inbox.":
    {
      uz: "Jamoa a'zosi inboxni ochishidan oldin afzalliklar, mahsulot konteksti, avvalgi muammolar va yordam tarixini tayyor tuting.",
      ru: "Держите предпочтения, контекст продукта, прошлые проблемы и историю поддержки готовыми еще до открытия inbox.",
    },
  "Analytics your team can act on": {
    uz: "Jamoangiz amal qila oladigan analitika",
    ru: "Аналитика, по которой команда может действовать",
  },
  "Spot unresolved intents, escalation causes, sentiment shifts, and the exact content your AI needs next.":
    {
      uz: "Hal qilinmagan niyatlar, eskalatsiya sabablari, kayfiyat o'zgarishlari va AIga keyin kerak bo'ladigan aniq kontentni ko'ring.",
      ru: "Находите нерешенные намерения, причины эскалаций, сдвиги настроения и точный контент, который дальше нужен AI.",
    },
  "Automation that knows when to pause": {
    uz: "Qachon pauza qilishni biladigan avtomatlashtirish",
    ru: "Автоматизация, которая знает, когда остановиться",
  },
  "Automate repetitive support without losing judgment. Osonflow routes by intent, confidence, urgency, and customer context.":
    {
      uz: "Bahoni yo'qotmasdan takroriy yordam ishlarini avtomatlashtiring. Osonflow niyat, ishonch, shoshilinchlik va mijoz konteksti bo'yicha yo'naltiradi.",
      ru: "Автоматизируйте повторяющуюся поддержку без потери суждения. Osonflow маршрутизирует по намерению, уверенности, срочности и контексту клиента.",
    },
  "Rules that protect the customer experience": {
    uz: "Mijoz tajribasini himoya qiladigan qoidalar",
    ru: "Правила, которые защищают клиентский опыт",
  },
  "The goal is not to hide humans. It is to let humans spend their time on work that needs taste, judgment, or trust.":
    {
      uz: "Maqsad odamlarni yashirish emas. Maqsad odamlar vaqtini did, baho yoki ishonch talab qiladigan ishlarga sarflashidir.",
      ru: "Цель не в том, чтобы спрятать людей. Цель в том, чтобы люди тратили время на работу, где нужны вкус, суждение или доверие.",
    },
  "From install to continuous learning": {
    uz: "O'rnatishdan uzluksiz o'rganishgacha",
    ru: "От установки до постоянного обучения",
  },
  "Start simple, then refine routing and escalation with real conversation data.":
    {
      uz: "Oddiy boshlang, keyin haqiqiy suhbat ma'lumotlari bilan marshrutlash va eskalatsiyani takomillashtiring.",
      ru: "Начните просто, затем улучшайте маршрутизацию и эскалацию на реальных данных диалогов.",
    },
  "Intent-aware routing": {
    uz: "Niyatni tushunadigan marshrutlash",
    ru: "Маршрутизация с учетом намерения",
  },
  "Send billing, onboarding, technical, and renewal questions to the right AI flow or human queue.":
    {
      uz: "Billing, onboarding, texnik va yangilanish savollarini to'g'ri AI oqimi yoki inson navbatiga yuboring.",
      ru: "Отправляйте вопросы по биллингу, онбордингу, технике и продлению в нужный AI-поток или очередь операторов.",
    },
  "Confidence controls": {
    uz: "Ishonch nazorati",
    ru: "Контроль уверенности",
  },
  "Let AI answer only when confidence is high, then create a crisp handoff when the answer needs a person.":
    {
      uz: "AI faqat ishonch yuqori bo'lganda javob bersin, javobga odam kerak bo'lsa esa aniq uzatish yarating.",
      ru: "Позволяйте AI отвечать только при высокой уверенности, а когда нужен человек, создавайте четкую передачу.",
    },
  "Follow-up moments": {
    uz: "Keyingi aloqa lahzalari",
    ru: "Моменты follow-up",
  },
  "Trigger reminders, nudges, and sales handoffs from conversation intent without making agents babysit queues.":
    {
      uz: "Agentlarni navbatlarga bog'lab qo'ymasdan, suhbat niyatidan eslatmalar, nudjlar va sotuvga uzatishlarni ishga tushiring.",
      ru: "Запускайте напоминания, подсказки и передачи в продажи по намерению диалога, не заставляя операторов вручную следить за очередями.",
    },
  "Integrations without tab chaos": {
    uz: "Tablar tartibsizligisiz integratsiyalar",
    ru: "Интеграции без хаоса вкладок",
  },
  "Bring website chat, WhatsApp, Telegram, ChatGPT, Gemini, Vapi, and future channels into one support layer.":
    {
      uz: "Sayt chati, WhatsApp, Telegram, ChatGPT, Gemini, Vapi va kelajak kanallarini bitta qo'llab-quvvatlash qatlamiga olib keling.",
      ru: "Объедините чат сайта, WhatsApp, Telegram, ChatGPT, Gemini, Vapi и будущие каналы в один слой поддержки.",
    },
  "The right channel, one operating view": {
    uz: "To'g'ri kanal, bitta ish ko'rinishi",
    ru: "Правильный канал, единый рабочий вид",
  },
  "Customers can arrive from any channel. Your agents still get one context-rich queue.":
    {
      uz: "Mijozlar istalgan kanaldan kelishi mumkin. Agentlaringiz baribir kontekstga boy bitta navbat oladi.",
      ru: "Клиенты могут приходить из любого канала. Операторы все равно получают одну очередь с богатым контекстом.",
    },
  "Channel analytics without the spreadsheet ritual": {
    uz: "Spreadsheet marosimisiz kanal analitikasi",
    ru: "Аналитика каналов без ритуала таблиц",
  },
  "Track which channels create the most demand, which deserve automation, and where voice is faster than typing.":
    {
      uz: "Qaysi kanallar eng ko'p talab yaratishini, qaysilar avtomatlashtirishga loyiq ekanini va qayerda ovoz yozishdan tezroq ekanini kuzating.",
      ru: "Отслеживайте, какие каналы создают больше спроса, какие стоит автоматизировать и где голос быстрее набора текста.",
    },
  "Chat channels": {
    uz: "Chat kanallari",
    ru: "Чат-каналы",
  },
  "Meet customers on website chat, WhatsApp, Telegram, and the channels they already trust.":
    {
      uz: "Mijozlarni sayt chati, WhatsApp, Telegram va ular allaqachon ishonadigan kanallarda kutib oling.",
      ru: "Встречайте клиентов в чате сайта, WhatsApp, Telegram и каналах, которым они уже доверяют.",
    },
  "Model providers": {
    uz: "Model provayderlari",
    ru: "Провайдеры моделей",
  },
  "Use best-fit AI across ChatGPT, Gemini, and realtime voice without exposing that complexity to customers.":
    {
      uz: "ChatGPT, Gemini va real vaqt ovozi bo'ylab eng mos AIni ishlating, lekin bu murakkablikni mijozlarga ko'rsatmang.",
      ru: "Используйте подходящий AI в ChatGPT, Gemini и голосе реального времени, не показывая эту сложность клиентам.",
    },
  "Voice stack": {
    uz: "Ovoz steki",
    ru: "Голосовой стек",
  },
  "Connect Vapi and voice assistants for high-urgency support where typing slows the customer down.":
    {
      uz: "Yozish mijozni sekinlashtiradigan shoshilinch yordam uchun Vapi va ovozli yordamchilarni ulang.",
      ru: "Подключайте Vapi и голосовых помощников для срочной поддержки, где набор текста замедляет клиента.",
    },
  "Pricing for calm support growth": {
    uz: "Sokin qo'llab-quvvatlash o'sishi uchun narxlar",
    ru: "Цены для спокойного роста поддержки",
  },
  "Choose the support layer that fits your current queue, then add automation, voice, and custom routing as the team grows.":
    {
      uz: "Hozirgi navbatingizga mos qo'llab-quvvatlash qatlamini tanlang, jamoa o'sgani sari avtomatlashtirish, ovoz va maxsus marshrutlashni qo'shing.",
      ru: "Выберите слой поддержки под текущую очередь, затем добавляйте автоматизацию, голос и кастомную маршрутизацию по мере роста команды.",
    },
  "Start focused, scale gracefully": {
    uz: "Diqqat bilan boshlang, silliq kengaying",
    ru: "Начните сфокусировано, масштабируйтесь спокойно",
  },
  "Every plan starts with a real support workflow: AI answers, a shared inbox, and the visibility needed to improve.":
    {
      uz: "Har bir tarif haqiqiy qo'llab-quvvatlash workflowidan boshlanadi: AI javoblari, umumiy inbox va yaxshilash uchun kerak ko'rinish.",
      ru: "Каждый тариф начинается с реального workflow поддержки: AI-ответов, общего inbox и видимости, нужной для улучшения.",
    },
  "Built for responsible AI handoff": {
    uz: "Mas'uliyatli AI uzatishi uchun qurilgan",
    ru: "Создано для ответственной передачи от AI",
  },
  "Security and routing controls are part of the product foundation, not an afterthought bolted onto a chat bubble.":
    {
      uz: "Xavfsizlik va marshrutlash nazorati chat pufagiga keyin qo'shilgan narsa emas, mahsulot asosining bir qismi.",
      ru: "Контроль безопасности и маршрутизации является частью основы продукта, а не поздней надстройкой к чат-пузырю.",
    },
  "Permissioned handoff": {
    uz: "Ruxsatli uzatish",
    ru: "Передача с правами доступа",
  },
  "Private knowledge sources": {
    uz: "Maxfiy bilim manbalari",
    ru: "Приватные источники знаний",
  },
  "Channel controls": {
    uz: "Kanal nazorati",
    ru: "Управление каналами",
  },
  "AI answers": {
    uz: "AI javoblari",
    ru: "AI-ответы",
  },
  "Grounded replies with citations": {
    uz: "Manbali asosli javoblar",
    ru: "Обоснованные ответы с цитатами",
  },
  "Priority, sentiment, and context": {
    uz: "Ustuvorlik, kayfiyat va kontekst",
    ru: "Приоритет, настроение и контекст",
  },
  "Learning loop": {
    uz: "O'rganish sikli",
    ru: "Цикл обучения",
  },
  "Unanswered questions become roadmap": {
    uz: "Javobsiz savollar roadmapga aylanadi",
    ru: "Вопросы без ответа становятся roadmap",
  },
  "Auto-routed to AI": {
    uz: "AIga avtomatik yo'naltirildi",
    ru: "Автоматически направлено к AI",
  },
  "24/7 support desk": {
    uz: "24/7 qo'llab-quvvatlash deski",
    ru: "Служба поддержки 24/7",
  },
  "Can I change my plan today?": {
    uz: "Bugun tarifimni o'zgartira olamanmi?",
    ru: "Могу ли я сегодня сменить тариф?",
  },
  "Payment failed on checkout": {
    uz: "Checkoutda to'lov amalga oshmadi",
    ru: "Платеж не прошел при оформлении",
  },
  "Where is my invoice?": {
    uz: "Hisob-fakturam qayerda?",
    ru: "Где мой счет?",
  },
  "Yes. Your billing cycle stays the same, and the difference is prorated automatically.":
    {
      uz: "Ha. Billing davringiz o'zgarmaydi, farq esa avtomatik ravishda proporsional hisoblanadi.",
      ru: "Да. Ваш платежный цикл останется прежним, а разница будет автоматически пересчитана пропорционально.",
    },
  "Offer a direct upgrade link, mention prorated billing, and flag the account for follow-up if payment fails.":
    {
      uz: "To'g'ridan-to'g'ri yangilash havolasini taklif qiling, proporsional billingni ayting va to'lov amalga oshmasa akkauntni follow-up uchun belgilang.",
      ru: "Предложите прямую ссылку на апгрейд, упомяните пропорциональный расчет и отметьте аккаунт для follow-up при сбое платежа.",
    },
  "Connect the channels already carrying your customer questions.": {
    uz: "Mijoz savollarini allaqachon olib kelayotgan kanallarni ulang.",
    ru: "Подключите каналы, где уже идут вопросы клиентов.",
  },
  "Chat, voice, knowledge, and inbox intelligence in one support layer.": {
    uz: "Chat, ovoz, bilim va inbox intellekti bitta qo'llab-quvvatlash qatlamida.",
    ru: "Чат, голос, знания и интеллект inbox в одном слое поддержки.",
  },
  "Automation canvas": {
    uz: "Avtomatlashtirish kanvasi",
    ru: "Холст автоматизации",
  },
  "Rules running now": {
    uz: "Hozir ishlayotgan qoidalar",
    ru: "Правила выполняются сейчас",
  },
  "AI drafts answer": {
    uz: "AI javob loyihasini tayyorlaydi",
    ru: "AI готовит черновик ответа",
  },
  "Vapi assistant": {
    uz: "Vapi yordamchisi",
    ru: "Помощник Vapi",
  },
  "More via API": {
    uz: "API orqali ko'proq",
    ru: "Больше через API",
  },
  "Global support map": {
    uz: "Global yordam xaritasi",
    ru: "Глобальная карта поддержки",
  },
  "Widget traffic by channel": {
    uz: "Kanal bo'yicha vidjet trafiki",
    ru: "Трафик виджета по каналам",
  },
}

export function normalizeTranslatableText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export function translateText(value: string, language: Language) {
  if (language === "en") {
    return value
  }

  const normalized = normalizeTranslatableText(value)
  const translated =
    translations[normalized]?.[language] ??
    supplementalTranslations[normalized]?.[language]

  return translated ?? value
}
