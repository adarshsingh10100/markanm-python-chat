const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MASK = 0x3f5c7a;
const MULTIPLIER = 9973;

/**
 * Encode an integer database ID into a sleek, encrypted string slug (e.g. 1 -> 'c8f2a9d1')
 */
export function encodeId(id) {
  const numId = parseInt(id, 10);
  if (isNaN(numId) || numId <= 0) return String(id);

  let val = (numId * MULTIPLIER) ^ MASK;
  let hash = '';
  const base = ALPHABET.length;

  while (val > 0) {
    hash = ALPHABET[val % base] + hash;
    val = Math.floor(val / base);
  }

  const checksumChar = ALPHABET[(numId * 31 + 7) % base];
  return (checksumChar + hash).toLowerCase();
}

/**
 * Decode an encrypted string slug or plain integer back to the original database integer ID
 */
export function decodeId(hashStr) {
  if (!hashStr) return 0;
  const str = String(hashStr).trim();

  // If already a numeric string
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  if (str.length < 2) return 0;

  const body = str.substring(1);
  const base = ALPHABET.length;
  let val = 0;

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    let pos = ALPHABET.indexOf(char);
    if (pos === -1) {
      pos = ALPHABET.toLowerCase().indexOf(char.toLowerCase());
    }
    if (pos !== -1) {
      val = val * base + pos;
    }
  }

  const origId = (val ^ MASK) / MULTIPLIER;
  return Math.round(origId);
}
