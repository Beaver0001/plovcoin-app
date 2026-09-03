export const metadata = { alternates: { canonical: "https://plovcoin.com/ru/terms", languages: { en: "https://plovcoin.com/terms", ru: "https://plovcoin.com/ru/terms", "x-default": "https://plovcoin.com/terms" } }, description: "Условия использования PlovCoin ($PLOV): токен не является инвестицией, риски, правила аирдропа, анти-фишинг.", openGraph: { description: "Условия использования PlovCoin ($PLOV): токен не является инвестицией, риски, правила аирдропа, анти-фишинг.", images: ["/og-image-v2.png"] }, title: "Условия использования — PlovCoin" };
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-rice-soft">
      <p className="mb-6 text-xs"><a href="/ru" className="underline hover:text-rice">&larr; PlovCoin</a></p>
      <h1 className="mb-3 text-3xl font-bold text-rice">Условия использования</h1>
      <p className="mb-8 text-xs opacity-70">Последнее обновление: 3 сентября 2026</p>
      <div className="space-y-5 text-sm leading-relaxed">
        <p>PlovCoin ($PLOV) — культурный мемкоин на Solana, созданный для сообщества и развлечения. Токен не предназначен и не позиционируется как инвестиционный продукт, ценная бумага или финансовый инструмент; он не даёт прав на прибыль, управление каким-либо юридическим лицом или требований к каким-либо лицам.</p>
        <p>Ничто на этом сайте не является финансовой, юридической или налоговой консультацией. Криптоактивы крайне волатильны; вы можете потерять всю потраченную сумму. Участвуйте только на средства, потерю которых можете себе позволить, и только там, где это законно. Ответственность за соблюдение местных законов лежит на вас.</p>
        <p>Используя сайт, вы подтверждаете, что вам исполнилось 18 лет или вы достигли возраста совершеннолетия в вашей юрисдикции. Токен и аирдропы не предлагаются лицам и организациям, находящимся под санкциями, а также резидентам юрисдикций, где приобретение или получение таких активов запрещено.</p>
        <p>Участие в аирдропах регулируется официальной Wave Policy каждой волны: критерии, анти-Sybil правила, региональные ограничения. Мы можем уточнять правила до открытия волны; изменения анонсируются в официальных каналах, указанных на сайте.</p>
        <p>Сайт предоставляется «как есть», без каких-либо гарантий. В максимально допустимой законом мере команда PlovCoin не несёт ответственности за убытки, связанные с использованием сайта, токена или сторонних сервисов (кошельки, биржи, RPC-провайдеры).</p>
        <p>Официальные каналы и адреса контрактов перечислены на странице <a href="/ru/proof" className="underline hover:text-rice">Proof-hub</a>. Всё остальное, выдающее себя за PlovCoin, — не мы. Мы никогда не пишем первыми и не спрашиваем seed-фразы.</p>
        <p>Мы можем обновлять настоящие Условия. Актуальная версия всегда размещена на этой странице; дата последнего обновления указана вверху.</p>
      </div>
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-80"><a href="/ru" className="underline hover:text-rice">Главная</a><a href="/ru/proof" className="underline hover:text-rice">Proof-hub</a><a href="/ru/whitepaper" className="underline hover:text-rice">Whitepaper</a><a href="/ru/faq" className="underline hover:text-rice">FAQ</a><a href="/ru/terms" className="underline hover:text-rice">Условия</a><a href="/ru/privacy" className="underline hover:text-rice">Конфиденциальность</a><a href="/terms" className="underline hover:text-rice">English</a></nav>
    </main>
  );
}
