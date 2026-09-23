/** The house prompt from the CareerCards Avatars canvas, plus a line to hold the likeness. */
export const HOUSE_PROMPT = 'Portrait illustration of the person in the photo, head and shoulders, three-quarter view, gaze slightly up and off to one side. Keep their likeness exactly as in the photo: face shape, hairstyle and hair colour, skin, expression, and facial hair only if they have it. Add nothing that is not in the photo: no glasses unless they are wearing glasses, no hat unless they are wearing one, no jewellery. Risograph screen-print style: bold black ink line work with stippled halftone shading, a flat limited palette of three inks (warm tan skin, slate blue shirt, black) on a plain warm cream background. No gradients, no photorealism, no text. Bust cropped by a shallow arc at the bottom.';

export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
export const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
/** Takes a player may draw per day (a deal is four). */
export const TAKES_PER_DAY = 12;
