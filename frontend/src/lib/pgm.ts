/**
 * Minimal parser for P5 (binary) Portable GrayMap (.pgm) files.
 * Used to convert ROS nav2 saved maps into a Canvas ImageData for in-browser editing,
 * and encode the edited pixels back to a PGM for saving.
 */

// NavHub Map Edit values (ROS convention)
// 0: Obstacle, 254: Free, 205: Unknown.
export const PGM_COLORS = {
  OCCUPIED: 0,
  FREE: 254,
  UNKNOWN: 205,
};

export function parsePgm(buffer: ArrayBuffer): ImageData {
  const bytes = new Uint8Array(buffer);

  // Read header: usually looks like "P5\n# CREATOR: ...\n[width] [height]\n[maxval]\n"
  let offset = 0;

  function readLine() {
    let line = '';
    while (offset < bytes.length) {
      const char = String.fromCharCode(bytes[offset++]);
      if (char === '\n') break;
      line += char;
    }
    return line.trim();
  }

  // 1. Magic sequence
  if (readLine() !== 'P5') {
    throw new Error('Not a valid binary PGM (P5) file');
  }

  // 2. Comments (can be multiple)
  let next = readLine();
  while (next.startsWith('#')) {
    next = readLine();
  }

  // 3. Width Height
  const [widthStr, heightStr] = next.split(/\s+/);
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  // 4. Maxval
  const maxval = parseInt(readLine(), 10);
  if (maxval !== 255) {
    throw new Error('Unsupported PGM maxval (expected 255)');
  }

  // 5. Pixel data mapping -> ImageData
  // We represent it in RGBA where R=G=B=grayvalue, A=255.
  const imgData = new ImageData(width, height);
  let destOffset = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gray = bytes[offset++];
      imgData.data[destOffset++] = gray;
      imgData.data[destOffset++] = gray;
      imgData.data[destOffset++] = gray;
      imgData.data[destOffset++] = 255;
    }
  }

  return imgData;
}

export function encodePgm(img: ImageData, comment = 'CREATOR: NavHub Map Editor'): Uint8Array {
  // Build header string
  const header = `P5\n# ${comment}\n${img.width} ${img.height}\n255\n`;
  const headerBytes = new TextEncoder().encode(header);

  // Allocate total space (Header + W*H bytes of data)
  const totalLength = headerBytes.length + (img.width * img.height);
  const result = new Uint8Array(totalLength);

  // Write header
  result.set(headerBytes, 0);

  // Write grayscale pixel data
  let destOffset = headerBytes.length;
  let srcOffset = 0;

  for (let i = 0; i < img.width * img.height; i++) {
    // Just grab red channel (assuming it was drawn as shades of gray)
    result[destOffset++] = img.data[srcOffset];
    srcOffset += 4;
  }

  return result;
}
