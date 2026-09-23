/** The house prompt from the CareerCards Avatars canvas, plus a line to hold the likeness. */
export const HOUSE_PROMPT = 'Portrait illustration of the person in the photo, head and shoulders, three-quarter view, gaze slightly up and off to one side. Keep their likeness exactly as in the photo: face shape, hairstyle and hair colour, skin, expression, and facial hair only if they have it. Add nothing that is not in the photo: no glasses unless they are wearing glasses, no hat unless they are wearing one, no jewellery. Risograph screen-print style: bold black ink line work with stippled halftone shading, a flat limited palette of three inks (warm tan skin, slate blue shirt, black) on a plain warm cream background. The shirt is a plain slate blue collared shirt, whatever they wear in the photo: no pattern, no plaid, no logo. No gradients, no photorealism, no text. The bust is wide: the shoulders run off both sides of the frame, and the bottom is cropped by a shallow arc.';

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
export const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
/** Takes a player may draw in a rolling 24 hours (a deal is four). Counted from the takes kept in their folder. */
export const TAKES_PER_DAY = 12;
