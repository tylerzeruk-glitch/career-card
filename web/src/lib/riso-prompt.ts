/**
 * The portrait prompts, written for gpt-image-2.5, which keeps much closer to the photo than gpt-image-1 did:
 * each opens with the look and that an illustrator drew it, asks for likeness rather than every detail of the
 * face, and leaves the pose free. Three things in them serve the finishing in src/lib/riso.ts and stay whatever
 * else changes: a plain cream background (keyed out there; a model asked for transparency can paint a
 * checkerboard instead), one plain shirt colour (recoloured to each team or frame colour; a yellow or patterned
 * shirt would not take it) and the shirt running off the bottom and both sides (the card's art box).
 */

/** One head turn per take, so a deal of four shows four poses rather than one pose four times. */
const POSES = [
  'Their head is turned to one side and they gaze up and off into the distance.',
  'Their head is turned toward the other side and they look off past the viewer, chin raised a little.',
  'A three-quarter view, the head tilted slightly, looking off to one side with a confident expression.',
  'Their head is turned to one side, gazing off and slightly upward, as if watching a ball in flight.',
];

const LIKENESS = `LIKENESS
Keep them recognisable: face shape, hairline and hairstyle, hair colour, skin tone, apparent age, facial hair only if they have it, and the one or two features that make them look like themselves. Do not beautify or idealize them.
Simplify everything else the way an illustrator would: fewer and bolder shapes, no pores, no skin texture, no individual hairs, no photographic lighting or depth of field.
Add nothing that is not in the photo: no hat unless they wear one, no jewellery.`;

const POSE = (take: number) => `POSE
A head-and-shoulders bust in three-quarter view, never looking at the viewer. The pose does not need to match the photo. ${POSES[take % POSES.length]}
The bust is wide and fills the lower part of the frame: the shirt runs off the bottom edge and off both side edges, with no gap and no background showing beside the shoulders.
No hands, no props, no baseball equipment, no scenery, no card frame, no text, no logos.`;

/** With a style reference sent as the second image: George for the riso look, Kramer for the 90s look (assets/portrait-refs). */
const REFERENCE = (look: string, not: string) => `STYLE REFERENCE
The first image is the photo of the person to draw. The second image is the style to draw them in: ${look} Match its drawing style closely: the line work, the shading, the inks and colour, and how far the face is simplified. It shows a different man: draw the person from the photo, never him, and do not copy his ${not}.`;

const BACKGROUND = `BACKGROUND
A plain, flat warm cream background, one even colour edge to edge. No shapes, no drop shadow, no decoration.`;

/** The Vintage look: a risograph print of a 1950s–60s sports-card illustration. */
const vintage = (take: number, ref: boolean) => `Draw the person in the uploaded photo as a hand-drawn illustration for a vintage 1950s–60s baseball card, printed by risograph. An illustrator drew it with pen and brush, then it was printed in three inks. Use the photo only for who they are, not for how the picture looks: it must read at a glance as a drawing, never as a photo or a filtered photo.
${ref ? '\n' + REFERENCE('a riso-printed sports-card illustration of a man, in exactly the look this card needs: hand-inked line work, stippled halftone shading, flat inks on cream paper.', 'face, hair, glasses or expression') + '\n' : ''}
${LIKENESS}
No glasses unless they wear glasses in the photo.

${POSE(take)}

DRAWING
- bold black ink outlines drawn by hand, confident and a little imperfect
- the face built from a few flat shapes: three or four tones at most, no smooth gradients
- shadows as solid ink shapes and stippled halftone dots
- hair as bold massed shapes with a few ink strokes, not strands
- features drawn with simple lines, slightly stylised, with the charm of a mid-century sports illustration

INKS
Three flat inks on warm cream paper, as a risograph prints them: muted warm tan for the skin, muted slate blue for the shirt, charcoal black for the line work, hair and shadows. No other colours.

CLOTHING
Whatever they wear in the photo, they wear a plain muted slate blue collared button-down shirt: one colour, no pattern, no plaid, no logo, drawn with flat colour, a few bold folds and a little halftone.

PRINT
Light halftone dots and stippling in the shadows of the face, neck, hair and shirt folds, slight misregistration between the inks. Clean, not distressed or dirty.

${BACKGROUND}

If it could pass for a photograph, it is wrong. No painterly rendering, no 3D.`;

/** The Chrome look: early-90s trading-card art, wraparound shades. */
const nineties = (take: number, ref: boolean) => `Draw the person in the uploaded photo as hand-drawn early-1990s trading-card art: bold brush ink, coarse halftone dots, wraparound shades. A comic artist drew it with a brush and it was printed cheaply in flat bright colour. Use the photo only for who they are, not for how the picture looks: it must read at a glance as a drawing, never as a photo or a filtered photo.
${ref ? '\n' + REFERENCE('early-90s trading-card art of a man, in exactly the look this card needs: brush ink, halftone dots, flat loud colour and mirrored wraparound shades.', 'face, hair, expression or patterned shirt') + '\n' : ''}
${LIKENESS}

${POSE(take)}

DRAWING
- heavy black brush-ink outlines with varied weight, drawn fast and confident
- bold graphic facial planes with aggressive solid-black shadow shapes under the chin, around the hairline and in the creases
- coarse halftone dot shading on the cheeks, forehead, neck, hair and shirt
- crisp flat colours, no smooth gradients, a little colour misregistration like a cheap print
- slightly exaggerated sports-poster energy, a touch of caricature

SUNGLASSES
Oversized early-90s wraparound sport sunglasses: a black frame and a single shield lens, mirrored in flat graphic streaks of electric blue, magenta, hot pink and yellow. They replace any glasses from the photo and do not hide the shape of the face.

COLOUR
Flat and loud: warm skin with black halftone shadows, a bright blue shirt, black ink, cream; the lens carries the neon.

CLOTHING
Whatever they wear in the photo, they wear a plain bright blue denim button-down shirt with a collar and white buttons: one colour, no pattern, no logo, drawn graphic rather than realistic.

${BACKGROUND}

If it could pass for a photograph, it is wrong. No glossy 3D, no anime, no flat corporate vector art.`;

/** The two looks a portrait can be drawn in: the riso house style for the vintage stock, the 90s look for Chrome. */
export type PortraitStyle = 'riso' | '90s';
/** The prompt for one take: `take` picks its pose (0–3 in a deal); `ref` says a style reference goes with the photo. */
export const promptFor = (style: PortraitStyle, take = 0, ref = false) => (style === '90s' ? nineties(take, ref) : vintage(take, ref));

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
export const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
/** OpenAI's input_fidelity: 'high' holds the photo closely, which with gpt-image-2.5 pulls the drawing toward a photo. Unset sends none. */
export const IMAGE_FIDELITY = process.env.OPENAI_IMAGE_FIDELITY || '';
/** Takes a player may draw in a rolling 24 hours (a deal is four). Counted from the takes kept in their folder. */
export const TAKES_PER_DAY = 12;
/** Accounts with no limit: PORTRAIT_UNLIMITED, a comma-separated list of user ids (the owner, testers). */
export const unlimited = (userId: string) => (process.env.PORTRAIT_UNLIMITED || '').split(',').map((s) => s.trim()).filter(Boolean).includes(userId);
