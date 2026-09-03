export const metadata = { alternates: { canonical: "https://plovcoin.com/ru/privacy", languages: { en: "https://plovcoin.com/privacy", ru: "https://plovcoin.com/ru/privacy", "x-default": "https://plovcoin.com/privacy" } }, description: "Политика конфиденциальности PlovCoin: какие данные обрабатываются, аналитика, сторонние сервисы, ваши права.", openGraph: { description: "Политика конфиденциальности PlovCoin: какие данные обрабатываются, аналитика, сторонние сервисы, ваши права.", images: ["/og-image-v2.png"] }, title: "Политика конфиденциальности — PlovCoin" };
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-rice-soft">
      <p className="mb-6 text-xs"><a href="/ru" className="underline hover:text-rice">&larr; PlovCoin</a></p>
      <h1 className="mb-3 text-3xl font-bold text-rice">Политика конфиденциальности</h1>
      <p className="mb-8 text-xs opacity-70">Последнее обновление: 3 сентября 2026</p>
      <div className="space-y-5 text-sm leading-relaxed">
        <p>Сайт не требует аккаунтов и не собирает персональные данные сверх стандартных технических логов хостинг-провайдера (IP-адрес, user agent), используемых для безопасности и работы сайта.</p>
        <p>Мы не используем рекламные трекеры. Сайт устанавливает один функциональный cookie — plov_locale, который запоминает выбранный язык на один год и не используется для отслеживания. Для агрегированного подсчёта просмотров используется Vercel Web Analytics — без cookies и без идентификации отдельных посетителей.</p>
        <p>Если вы пишете нам (например, на security@plovcoin.com), мы обрабатываем ваше сообщение и адрес исключительно для ответа и обработки обращения. Переписка хранится не дольше, чем это необходимо для обработки обращения; вы можете запросить удаление своих данных, написав на тот же адрес. Мы не продаём и не передаём персональные данные третьим лицам, кроме случаев, требуемых законом.</p>
        <p>Сторонние сервисы, через которые вы взаимодействуете с PlovCoin (кошельки, Telegram, X, биржи), имеют собственные политики конфиденциальности; мы не отвечаем за их обработку.</p>
        <p>Мы можем обновлять настоящую Политику; актуальная версия размещена на этой странице.</p>
        <p>Вопросы: security@plovcoin.com.</p>
      </div>
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-80"><a href="/ru" className="underline hover:text-rice">Главная</a><a href="/ru/proof" className="underline hover:text-rice">Proof-hub</a><a href="/ru/whitepaper" className="underline hover:text-rice">Whitepaper</a><a href="/ru/faq" className="underline hover:text-rice">FAQ</a><a href="/ru/terms" className="underline hover:text-rice">Условия</a><a href="/ru/privacy" className="underline hover:text-rice">Конфиденциальность</a><a href="/ru/privacy?setLocale=en" className="underline hover:text-rice">English</a></nav>
    </main>
  );
}
