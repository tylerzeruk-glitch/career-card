/** The house prompt from the CareerCards Avatars canvas, plus a line to hold the likeness. */
export const HOUSE_PROMPT = 'Portrait illustration of the person in the photo, head and shoulders, three-quarter view, gaze slightly up and off to one side. Keep their likeness exactly as in the photo: face shape, hairstyle and hair colour, skin, expression, and facial hair only if they have it. Add nothing that is not in the photo: no glasses unless they are wearing glasses, no hat unless they are wearing one, no jewellery. Risograph screen-print style: bold black ink line work with stippled halftone shading, a flat limited palette of three inks (warm tan skin, slate blue shirt, black) on a plain warm cream background. The shirt is a plain slate blue collared shirt, whatever they wear in the photo: no pattern, no plaid, no logo. No gradients, no photorealism, no text. The bust is wide and fills the lower part of the frame: the shirt runs off the bottom edge and off both side edges, so the whole bottom of the picture is shirt, with no arc, no gap and no background showing beside the shoulders.';

/**
 * The Chrome prompt: the same likeness rules, drawn as early-90s trading-card art like the 90s George
 * (bold brush ink, coarse halftone dots, a denim shirt, wraparound shades with a mirrored lens).
 */
export const PROMPT_90S = 'Portrait illustration of the person in the photo, head and shoulders, three-quarter view, chin up a little, gaze off to one side. Keep their likeness exactly as in the photo: face shape, hairstyle and hair colour, skin, expression, and facial hair only if they have it. Add nothing else that is not in the photo: no hat unless they are wearing one, no jewellery. Early-1990s trading-card art: bold black brush-ink line work, coarse halftone dot shading like a cheap print, flat saturated colour with a little misregistration. A flat limited palette: warm tan skin, bright blue denim shirt, black ink, on a plain warm cream background. They wear wraparound early-90s sport sunglasses, a single straight-edged visor lens, mirrored and iridescent in magenta, blue and yellow; these replace any glasses they wear in the photo. The shirt is a plain blue denim button-down with a collar and white buttons, whatever they wear in the photo: no pattern, no logo. No gradients except on the lens, no photorealism, no text. The bust is wide and fills the lower part of the frame: the shirt runs off the bottom edge and off both side edges, so the whole bottom of the picture is shirt, with no arc, no gap and no background showing beside the shoulders.';

/** The two looks a portrait can be drawn in: the riso house style for the vintage stock, the 90s look for Chrome. */
export type PortraitStyle = 'riso' | '90s';
export const promptFor = (style: PortraitStyle) => (style === '90s' ? PROMPT_90S : HOUSE_PROMPT);

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
export const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
/** Takes a player may draw in a rolling 24 hours (a deal is four). Counted from the takes kept in their folder. */
export const TAKES_PER_DAY = 12;
/** Accounts with no limit: PORTRAIT_UNLIMITED, a comma-separated list of user ids (the owner, testers). */
export const unlimited = (userId: string) => (process.env.PORTRAIT_UNLIMITED || '').split(',').map((s) => s.trim()).filter(Boolean).includes(userId);
