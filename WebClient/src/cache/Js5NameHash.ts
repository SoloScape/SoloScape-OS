/**
 * Cache group-name hash used by JS5 indices (OpenRS2 krHashCode).
 *
 * Map group names are ASCII (for example m50_50 / l50_50), so the CP1252
 * encoding is byte-identical to ASCII for all names used here.
 */
export function js5NameHash(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    const code = name.charCodeAt(index);
    if (code > 0x7f) {
      throw new RangeError(
        'JS5 name hashing currently accepts ASCII cache names only.',
      );
    }
    hash = (Math.imul(hash, 31) + code) | 0;
  }
  return hash;
}
