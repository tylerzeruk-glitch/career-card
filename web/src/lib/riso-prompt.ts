/**
 * The Vintage prompt (the riso house style). Written for gpt-image-2.5, which draws closer to the photo than
 * gpt-image-1 did, so it names the print style up front and spells it out. Three things in it serve the finishing in src/lib/riso.ts
 * and stay whatever else changes: a plain cream background (keyed out there; a model asked for transparency
 * can paint a checkerboard instead), one plain slate shirt (recoloured to each team colour) and the shirt
 * running off the bottom and both sides (the card's art box).
 */
export const HOUSE_PROMPT = `Redraw the person in the uploaded photo as a risograph screen-print portrait for a vintage mid-century baseball card. Draw it fresh, as ink printed on paper: do not filter, trace or paint over the photo, and keep nothing photographic.

IDENTITY — MUST PRESERVE
Preserve the person's recognizable identity and distinctive facial characteristics from the uploaded photo.
Keep their actual:
- face shape
- hairline and hairstyle
- nose
- mouth
- jawline
- ears
- facial hair, if present
- apparent age
- skin tone
- distinctive asymmetry and individual features

Do not beautify, idealize, age up, age down, or substantially alter the person's facial proportions.
Do not invent facial hair, glasses, hats, or accessories unless they are visible in the source image.

COMPOSITION
Create a centered bust portrait from approximately mid-chest upward.
The subject should face mostly forward with a very slight 3/4 turn, approximately 5–15 degrees.
The bust is wide and fills the lower part of the frame: the shirt runs off the bottom edge and off both side edges, with no gap and no background showing beside the shoulders.
No hands.
No props.
No baseball equipment.
No scenery.
No card frame.
No text.
No logos.

RISOGRAPH PRINT STYLE (1950s–1970s)
Render the portrait as a risograph screen print, like the illustration on a vintage baseball card.

Use:
- bold black ink line work with stippled halftone shading
- flat areas of ink with visible halftone dots, never smooth shading
- bold, clean dark ink contour lines
- simplified flat graphic shapes
- posterized facial shading
- 3–5 major tonal regions rather than realistic gradients
- subtle halftone and stipple texture
- restrained screen-print texture
- slightly imperfect vintage ink character
- strong silhouette readability
- hand-inked editorial sports illustration feeling

The image should feel printed rather than painted or photographed.

COLOR PALETTE
Three flat inks on warm cream paper, as a risograph prints them:
- muted warm tan for the skin
- muted slate blue for the shirt
- charcoal black for the line work, hair and shadows
No other colours.

Avoid neon colors.
Avoid glossy effects.
Avoid photorealistic skin rendering.

CLOTHING
Whatever they wear in the photo, they wear a plain muted slate blue collared button-down shirt: one colour, no pattern, no plaid, no logo.
Render clothing with flat color blocks, bold folds, and minimal halftone shading.

PRINT TREATMENT
Add light halftone dots and stippling in:
- shadowed facial areas
- neck
- hair
- shirt folds

Keep texture controlled and clean.
Do not make the portrait look heavily distressed, damaged, dirty, or artificially aged.

BACKGROUND
A plain, flat warm cream background, one even colour edge to edge.
No drop shadow.
No decorative background graphics.

FINAL LOOK
The finished avatar should feel like a clean, collectible baseball-card illustration produced sometime between the 1950s and 1970s:
graphic, charming, slightly imperfect, bold, simple, and immediately recognizable as the uploaded person.

Do not make it photorealistic.
Do not make it painterly.
Do not make it 3D.`;

/**
 * The Chrome prompt: early-90s trading-card art, wraparound shades with a mirrored lens. The same three
 * fixed points as the Vintage prompt: a plain cream background, one plain blue denim shirt (recoloured to
 * each frame's shirt colour; a yellow or patterned shirt would not take it) and the shirt off the edges.
 */
export const PROMPT_90S = `Redraw the person in the uploaded photo as early-1990s trading-card art: bold brush ink, coarse halftone dots, wraparound shades. Draw it fresh, as a cheap colour print: do not filter, trace or paint over the photo, and keep nothing photographic.

IDENTITY — MUST PRESERVE
Preserve the person's recognizable identity and distinctive facial characteristics from the uploaded photo.
Keep their actual:
- face shape
- hairline and hairstyle
- nose
- mouth
- jawline
- ears
- facial hair, if present
- apparent age
- skin tone
- distinctive asymmetry and individual features

Do not beautify, idealize, age up, age down, or substantially alter the person's facial proportions.

COMPOSITION
Create a centered bust portrait from approximately mid-chest upward.
The subject should face mostly forward with a slight confident 3/4 turn, approximately 5–15 degrees.
The bust is wide and fills the lower part of the frame: the shirt runs off the bottom edge and off both side edges, with no gap and no background showing beside the shoulders.
No hands.
No props.
No baseball equipment.
No scenery.
No card frame.
No text.
No logos.

1990s ART STYLE
Render the portrait like an energetic early-to-mid-1990s sports trading-card illustration.

Use:
- bold black brush-ink line work, heavy contour lines
- coarse halftone dot shading like a cheap print
- flat saturated colour with a little misregistration
- aggressive posterized shadows
- bold graphic facial planes
- chunky halftone dots
- screen-print / comic-print texture
- sharp high-contrast edges
- slightly exaggerated sports-poster energy
- crisp flat colors rather than realistic gradients

The portrait should still look like a printed illustration, not a photograph.

SUNGLASSES
Add oversized 1990s wraparound shield sunglasses.

The sunglasses should:
- span broadly across the face
- have a black or very dark frame
- feel sporty and period-specific
- use mirrored graphic lenses
- reflect streaks of electric blue, royal blue, magenta, hot pink, red, and yellow
- feel illustrated and flat, not photorealistically reflective

Do not let the sunglasses obscure the overall recognizable structure of the person's face.

COLOR PALETTE
Use a vivid 1990s sports palette:
- electric blue
- cyan
- royal blue
- hot pink
- magenta
- bright yellow
- red
- cream
- black

Keep skin rendering graphic and warm, with black halftone shadows.

CLOTHING
Whatever they wear in the photo, they wear a plain bright blue denim button-down shirt with a collar and white buttons: one colour, no pattern, no logo.
Keep the garment graphic rather than realistic.

PRINT TREATMENT
Use coarse but intentional halftone/stipple shading across:
- cheeks
- forehead
- neck
- hair
- clothing

Use strong solid-black shadow shapes under the chin, around the hairline, and in facial creases.

Keep the edges crisp and readable at small avatar size.

BACKGROUND
A plain, flat warm cream background, one even colour edge to edge.
No background shapes.
No trading-card frame.
No lightning bolts.
No decorative graphics.
No drop shadow.

FINAL LOOK
The finished avatar should feel like a loud, collectible 1990s baseball or extreme-sports trading-card portrait:
bold, graphic, colorful, slightly outrageous, confident, and highly recognizable as the uploaded person.

Think neon sports graphics, wraparound shades, halftone printing, and comic-book energy—but keep the avatar itself clean and isolated.

Do not make it photorealistic.
Do not make it glossy 3D CGI.
Do not turn it into anime or a modern vector-flat corporate illustration.`;

/** The two looks a portrait can be drawn in: the riso house style for the vintage stock, the 90s look for Chrome. */
export type PortraitStyle = 'riso' | '90s';
export const promptFor = (style: PortraitStyle) => (style === '90s' ? PROMPT_90S : HOUSE_PROMPT);

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
export const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
/** OpenAI's input_fidelity: 'high' holds the photo closely, which with gpt-image-2.5 pulls the drawing toward a photo. Unset sends none. */
export const IMAGE_FIDELITY = process.env.OPENAI_IMAGE_FIDELITY || '';
/** Takes a player may draw in a rolling 24 hours (a deal is four). Counted from the takes kept in their folder. */
export const TAKES_PER_DAY = 12;
/** Accounts with no limit: PORTRAIT_UNLIMITED, a comma-separated list of user ids (the owner, testers). */
export const unlimited = (userId: string) => (process.env.PORTRAIT_UNLIMITED || '').split(',').map((s) => s.trim()).filter(Boolean).includes(userId);
