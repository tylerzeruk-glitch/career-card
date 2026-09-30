/**
 * JSON for an inline <script type="application/ld+json">. JSON.stringify leaves "<" as is, so a value such as
 * "</script><script>..." typed into a profile would close the tag and run on the page; "<" is written as its
 * \u003c escape, which JSON readers decode back to the same text.
 */
export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
