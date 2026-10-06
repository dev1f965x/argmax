/**
 * Messenger and social apps that open links in their own browser, whose
 * storage is separate from the phone's browser (FR23). Each token is the one
 * the app puts in its user agent: KakaoTalk ("KAKAOTALK"), LINE ("Line/"),
 * Instagram, Facebook and Messenger ("FBAN", "FBAV", "FB_IAB"), the NAVER app
 * ("NAVER(inapp"), Daum ("DaumApps"), BAND ("BAND/"), WeChat
 * ("MicroMessenger"), and Telegram ("Telegram"). The check only decides
 * whether a notice is shown; nothing else depends on it, so a spoofed or
 * missed user agent costs at most one notice.
 */
const inAppBrowser =
  /KAKAOTALK|\bLine\/|Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|DaumApps|\bBAND\/|MicroMessenger|Telegram/;

export function isInAppBrowser(userAgent: string): boolean {
  return inAppBrowser.test(userAgent);
}
