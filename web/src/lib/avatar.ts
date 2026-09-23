/**
 * The portrait for the art box. A built-in avatar (the example career's 'george') has one PNG per team
 * colour pair, with the shirt recoloured to the frame colour, under /avatars. The single-file preview
 * carries them inline as window.__AVATARS__. A stored portrait (a URL) is used as is for now.
 */
export function avatarSrc(avatar: string, pair: number): string {
  if (/^(https?:|data:|blob:)/.test(avatar)) return avatar;
  const key = avatar + '-' + pair;
  const inline = typeof window !== 'undefined' ? (window as unknown as { __AVATARS__?: Record<string, string> }).__AVATARS__ : undefined;
  return inline?.[key] || '/avatars/' + key + '.png';
}
