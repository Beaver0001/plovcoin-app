import { I18nProvider } from "@/components/I18nProvider";
import { getDictionary } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const dict = getDictionary("ru");

export const metadata = { alternates: { canonical: "https://plovcoin.com/ru/privacy", languages: { en: "https://plovcoin.com/privacy", ru: "https://plovcoin.com/ru/privacy", "x-default": "https://plovcoin.com/privacy" } }, description: "Политика конфиденциальности PlovCoin: какие данные обрабатываются, аналитика, сторонние сервисы, ваши права.", openGraph: { description: "Политика конфиденциальности PlovCoin: какие данные обрабатываются, аналитика, сторонние сервисы, ваши права.", images: ["/og-image-v2.png"] }, title: "Политика конфиденциальности — PlovCoin" };
export default function Page() {
  return (
    <I18nProvider locale="ru" dict={dict}>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-8 pt-32 text-rice-soft">
      <h1 className="mb-3 text-3xl font-bold text-rice">Политика конфиденциальности</h1>
      <p className="mb-8 text-xs opacity-70">Последнее обновление: 21 сентября 2026</p>
      <div className="space-y-5 text-sm leading-relaxed">
        <p>Сайт не требует аккаунтов и не собирает персональные данные сверх стандартных технических логов хостинг-провайдера (IP-адрес, user agent), используемых для безопасности и работы сайта.</p>
        <p>Мы не используем рекламные трекеры. Сайт устанавливает один функциональный cookie — plov_locale, который запоминает выбранный язык на один год и не используется для отслеживания. Для агрегированного подсчёта просмотров используется Vercel Web Analytics — без cookies и без идентификации отдельных посетителей.</p>
        <p>Если вы пишете нам (например, на security@plovcoin.com), мы обрабатываем ваше сообщение и адрес исключительно для ответа и обработки обращения. Переписка хранится не дольше, чем это необходимо для обработки обращения; вы можете запросить удаление своих данных, написав на тот же адрес. Мы не продаём персональные данные. Провайдеры хостинга и электронной почты могут обрабатывать данные для оказания этих услуг; мы также можем раскрывать данные в случаях, требуемых законом.</p>
        <p>Сторонние сервисы, через которые вы взаимодействуете с PlovCoin (кошельки, Telegram, X, биржи), имеют собственные политики конфиденциальности; мы не отвечаем за их обработку.</p>
        <section id="instagram" aria-labelledby="instagram-heading" className="space-y-5">
          <h2 id="instagram-heading" className="text-xl font-bold text-rice">Интеграция с Instagram — PlovCoin Community</h2>
          <p>Этот раздел относится к приложению PlovCoin Community и его интеграции с аккаунтами Instagram <a className="underline" href="https://www.instagram.com/plovcoinofficial/" target="_blank" rel="noopener noreferrer">@plovcoinofficial</a> и <a className="underline" href="https://www.instagram.com/plovcoin_ru/" target="_blank" rel="noopener noreferrer">@plovcoin_ru</a>. Приведённые выше положения, относящиеся только к сайту, не описывают данные, получаемые через эту интеграцию.</p>
          <p>При взаимодействии с этими аккаунтами наше приложение может получать идентификаторы Instagram, содержимое сообщений и комментариев, отметки времени и связанные сведения о событиях, которые Meta предоставляет в рамках выданных приложению разрешений. Мы обрабатываем эти сведения для взаимодействия с сообществом, обработки обращений, модерации комментариев, работы и диагностики интеграции.</p>
          <p>Полученные события webhook сохраняются на нашем сервере. Доступ ограничен уполномоченными сотрудниками и сервисами. Хостинг-провайдер обеспечивает работу инфраструктуры, используемой для хранения и обработки этих сведений. Meta обрабатывает информацию в соответствии со своими политиками конфиденциальности. Мы не продаём данные Instagram.</p>
          <p>Интеграция проходит тестирование. Автоматический срок удаления сохранённых событий пока не установлен: они хранятся до ручного удаления. Запросить удаление можно по инструкции ниже.</p>
          <h3 id="instagram-data-deletion" className="scroll-mt-28 text-lg font-semibold text-rice">Как запросить удаление данных Instagram</h3>
          <p>Напишите на <a className="underline" href="mailto:security@plovcoin.com?subject=Instagram%20data%20deletion">security@plovcoin.com</a> с темой «Instagram data deletion». Укажите своё имя пользователя Instagram и аккаунт PlovCoin, с которым вы взаимодействовали. Не отправляйте пароли, токены доступа или фразы восстановления кошельков.</p>
          <p>Перед обработкой запроса мы можем попросить подтвердить, что соответствующий аккаунт Instagram принадлежит вам. Мы сообщим результат или объясним, какие дополнительные сведения нужны. Удаление данных из нашего приложения не удаляет сообщения и другие записи, независимо хранящиеся у Instagram или других участников переписки.</p>
        </section>
        <p>Мы можем обновлять настоящую Политику; актуальная версия размещена на этой странице.</p>
        <p>Вопросы: security@plovcoin.com.</p>
      </div>
      </main>
      <Footer />
    </I18nProvider>
  );
}
