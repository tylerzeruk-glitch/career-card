/**
 * Light and dark. Dark is built (see the variables in globals.css) but held
 * back until it has been reviewed: with the flag off, every page is light and
 * the toggle is shown disabled. Flip DARK_MODE to true to turn it on.
 */
export const DARK_MODE = false;

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'careercard.theme';

/**
 * Runs before first paint (inlined in the document head) so the page never
 * flashes the wrong theme. The attribute is data-cc-theme, not data-theme,
 * because hosts that embed the preview (claude.ai artifacts) set data-theme
 * on the root themselves to match their own appearance.
 */
export const THEME_BOOT = `(function(){var t='light';try{if(${DARK_MODE ? 'true' : 'false'}){var s=localStorage.getItem('${THEME_KEY}');t=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}}catch(e){}document.documentElement.setAttribute('data-cc-theme',t)})();`;
