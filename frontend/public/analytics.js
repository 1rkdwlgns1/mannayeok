// Collect analytics only on the production domains, excluding local and preview sites.
if (['mannayeok.kr', 'www.mannayeok.kr'].includes(window.location.hostname)) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-1YM7S16XS5');

  const googleTag = document.createElement('script');
  googleTag.async = true;
  googleTag.src = 'https://www.googletagmanager.com/gtag/js?id=G-1YM7S16XS5';
  document.head.appendChild(googleTag);
}
