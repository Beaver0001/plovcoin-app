export type ChannelId = 'announcements_en' | 'announcements_ru' | 'community' | 'telegram_folder' | 'x';
export interface OfficialChannel {
  readonly id: ChannelId;
  readonly href: string;
  readonly en: string;
  readonly ru: string;
}
export const official: {
  readonly version: string;
  readonly website: string;
  readonly claim: string;
  readonly claimStatus: 'CLOSED';
  readonly mint: string;
  readonly securityEmail: string;
  readonly channels: readonly OfficialChannel[];
  readonly hacken: {
    readonly status: 'COMPLETE_AWAITING_REPORT_LINK';
    readonly reportUrl: null;
    readonly badgeAsset: null;
    readonly scope: readonly string[];
    readonly excludes: readonly string[];
  };
};
export function isOfficialClaimOrigin(input: unknown): boolean;
export function claimCopy(locale?: string): {
  title: string; intro: string; rules: string; security: string;
  back: string; sources: string; membership: string;
};
