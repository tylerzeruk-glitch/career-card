'use client';
import { Flag, heroState } from '@/components/Landing';
import { FreeCard, RoleCard } from '@/components/Cards';

/**
 * The 1200 x 630 picture behind a shared link. Not linked from anywhere; a
 * screenshot of it is committed as public/og.png (see web/README.md).
 */
export default function ShareCard() {
  const S = heroState();
  const hand = [S.roles[0], S.roles[2]];
  return (
    <div className="landing share">
      <div className="copy">
        <span className="wordmark"><Flag size={30} /><span>CareerCards</span></span>
        <h1>Every role you&apos;ve played, on its own card.</h1>
        <p>Your career as a pack of trading cards. Team and position on the front, seasons and highlights on the back, and a timeline for the job hunt.</p>
        <div className="url"><Flag size={14} />careercards.app · free to try</div>
      </div>
      <div className="hand">
        {hand.map((r, i) => <RoleCard key={r.id} S={S} r={r} idx={S.roles.indexOf(r)} total={S.roles.length} className={'h' + i} />)}
        <FreeCard S={S} share className="h2" />
      </div>
    </div>
  );
}
