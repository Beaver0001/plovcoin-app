import { formatAtoms, upfrontRequired, type SwapReviewData } from "@/lib/trading/review";

// Deliberately unmounted: no route, wallet request or trading CTA is enabled.
export function SwapReview({ review, locale = "en" }: { review: SwapReviewData; locale?: "en" | "ru" }) {
  const ru = locale === "ru";
  const input = review.side === "BUY" ? "SOL" : "PLOV";
  const output = review.side === "BUY" ? "PLOV" : "SOL";
  const required = upfrontRequired(review);
  const rows = [
    [ru ? "Вы отдаёте" : "You pay", `${formatAtoms(review.amountIn)} ${input}`],
    [ru ? "По котировке" : "Quoted output", `${formatAtoms(review.quotedOut)} ${output}`],
    [ru ? "Получите не меньше" : "Minimum received", `${formatAtoms(review.minimumOut)} ${output}`],
    [ru ? "Комиссия сети, включая priority" : "Network fee, including priority", `${formatAtoms(review.messageFee)} SOL`],
    [ru ? "Временный rent, возвращается при успехе" : "Temporary rent, returned on success", `${formatAtoms(review.temporaryRent)} SOL`],
    [ru ? "Rent нового счёта PLOV" : "New PLOV account rent", `${formatAtoms(review.newAtaRent)} SOL`],
    [ru ? "Дополнительный запас" : "Additional reserve", `${formatAtoms(review.extraReserve)} SOL`],
    [ru ? "Нужно SOL до обмена" : "SOL required before swap", `${formatAtoms(required)} SOL`],
    [ru ? "Кошелёк" : "Wallet", review.wallet],
    [ru ? "Сеть" : "Network", review.network],
    [ru ? "Mint токена" : "Token mint", review.mint],
    ...review.poolAddresses.map((address, i) => [`${ru ? "Пул" : "Pool"} ${i + 1}`, address]),
  ];
  return (
    <section aria-label={ru ? "Проверка условий обмена" : "Swap review"} className="rounded-2xl border border-fire/20 bg-bg p-5 text-rice sm:p-8">
      <h2 className="font-display text-2xl text-fire">{ru ? "Проверка обмена" : "Review swap"}</h2>
      <p role="status" className="mt-3 text-sm text-rice-soft">{ru ? "Торговля ещё не открыта. Подпись и отправка недоступны." : "Trading is not open. Signing and submission are unavailable."}</p>
      <dl className="mt-6 divide-y divide-fire/10">
        {rows.map(([label, value]) => {
          const amount = /^(\d+(?:\.\d+)?) (SOL|PLOV)$/.exec(value);
          return (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-5">
            <dt className="text-sm text-rice-soft">{label}</dt>
            <dd className="break-all font-mono text-sm">
              {amount ? <><span>{amount[1]}</span>{" "}<span className="inline-block whitespace-nowrap">{amount[2]}</span></> : value}
            </dd>
          </div>
          );
        })}
      </dl>
      <p className="mt-5 text-sm text-rice-soft">{ru ? "При отказе обмен откатывается, но сетевая комиссия может быть удержана. Цена и маршрут могут измениться до исполнения." : "A failed swap rolls back, but the network fee may still be charged. Price and route can change before execution."}</p>
    </section>
  );
}
