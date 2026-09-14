// Integration candidate, 2026-09-12. No deployment or transaction authority.
// Both website builds must import this SAME versioned module.
function freeze(value) {
  Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); });
  return Object.freeze(value);
}
export const official = freeze({
  version: '2026-09-12-owner-confirmed',
  website: 'https://plovcoin.com',
  claim: 'https://claim.plovcoin.com',
  claimStatus: 'CLOSED',
  mint: 'B4LhtMwbKh8D1nfj7dE6FefKpg7U2qkbYC371DBcJq9x',
  securityEmail: 'security@plovcoin.com',
  channels: [
    { id: 'announcements_en', href: 'https://t.me/PlovCoinAnnouncements', en: 'Announcements · English', ru: 'Анонсы · English' },
    { id: 'announcements_ru', href: 'https://t.me/PlovCoinRU', en: 'Announcements · Русский', ru: 'Анонсы · Русский' },
    { id: 'community', href: 'https://t.me/PlovCoinKitchen', en: 'PlovCoin Kitchen', ru: 'PlovCoin Kitchen' },
    { id: 'telegram_folder', href: 'https://t.me/addlist/7D9l7QTHcY9mMjdh', en: 'Official Telegram folder', ru: 'Официальная папка Telegram' },
    { id: 'x', href: 'https://x.com/PlovTeam', en: 'PlovCoin on X', ru: 'PlovCoin в X' }
  ],
  hacken: {
    status: 'COMPLETE_AWAITING_REPORT_LINK',
    reportUrl: null,
    badgeAsset: null,
    scope: ['VPS infrastructure', 'custody architecture', 'frontend source code'],
    excludes: ['future wallet-connect', 'future registration', 'future claim functionality']
  }
});

// Predicate for exact-origin checks, NOT an authorisation or trust decision.
// It must never be used to enable wallet, claim or transaction actions.
export function isOfficialClaimOrigin(input) {
  if (typeof input !== 'string' || input !== input.trim() || /[\s\\\u0000-\u001f\u007f]/u.test(input)) return false;
  if (!/^https:\/\//i.test(input)) return false;
  const authority = input.slice(input.indexOf('//') + 2).split(/[/?#]/, 1)[0];
  if (authority.toLowerCase() !== 'claim.plovcoin.com') return false;
  try {
    const u = new URL(input);
    return u.protocol === 'https:' && u.hostname === 'claim.plovcoin.com' && !u.username && !u.password && !u.port;
  } catch { return false; }
}

export function claimCopy(locale = 'en') {
  return locale === 'ru' ? {
    title: 'Клейм не открыт',
    intro: 'Публичная дата клейма пока не объявлена. Это официальный зарезервированный домен PlovCoin для клейма.',
    rules: 'Доступ и условия участия будут опубликованы после необходимых проверок готовности и одобрения распределения.',
    security: 'Используйте HTTPS и точное имя хоста claim.plovcoin.com. Мы никогда не просим seed-фразу, приватный ключ или перевод средств для проверки права на участие. Мы не рассылаем claim-ссылки в личных сообщениях.',
    back: 'Вернуться на plovcoin.com',
    sources: 'Официальные каналы',
    membership: 'Вступление в сообщество не гарантирует право на аирдроп или награды.'
  } : {
    title: 'Claim is not open',
    intro: 'No public claim date has been announced. This is the reserved official PlovCoin claim domain.',
    rules: 'Availability and eligibility will be published after the applicable readiness and distribution approvals.',
    security: 'Use HTTPS and the exact hostname claim.plovcoin.com. We never ask for a seed phrase, private key or a transfer of funds to verify eligibility. We never DM claim links.',
    back: 'Back to plovcoin.com',
    sources: 'Official channels',
    membership: 'Joining the community does not guarantee airdrop eligibility or rewards.'
  };
}
