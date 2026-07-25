/**
 * AdSense 슬롯.
 *
 * 기존 Jekyll 사이트의 설정(client, slot ID)을 그대로 옮긴 것이다.
 * 값을 바꾸면 광고가 안 나가고 수익이 끊기므로 site.config.js 밖에서 손대지 않는다.
 */

import { html, raw, when } from '../../engine/html.js';

/**
 * @param {{site: any, slot: string}} input slot 은 site.config.adsense.slots 의 키
 */
export function adSlot({ site, slot }) {
  const ads = site.config.adsense;
  const slotId = ads?.slots?.[slot];

  return when(
    ads?.enabled && ads.client && slotId,
    () => html`<div class="ad-slot" data-ad-slot="${slot}">
  <ins class="adsbygoogle" style="display:block"
       data-ad-client="${ads.client}"
       data-ad-slot="${slotId}"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>${raw('(adsbygoogle = window.adsbygoogle || []).push({});')}</script>
</div>`
  );
}
