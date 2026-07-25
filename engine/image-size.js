/**
 * 이미지 파일 헤더에서 크기만 읽는다.
 *
 * 의존성을 하나 더 붙이지 않으려고 직접 구현했다. 필요한 건 width/height 뿐이고,
 * 이 저장소에 있는 포맷은 PNG/JPEG 정도다. 파일 전체가 아니라 앞부분만 읽는다.
 */

import { openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';

const HEADER_BYTES = 65_536;

/** @type {Map<string, {width: number, height: number} | null>} */
const cache = new Map();

/** 파일 앞부분만 버퍼로 읽는다. */
function readHead(absolutePath) {
  let fd;
  try {
    fd = openSync(absolutePath, 'r');
  } catch {
    return null;
  }
  try {
    const buffer = Buffer.alloc(HEADER_BYTES);
    const bytesRead = readSync(fd, buffer, 0, HEADER_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

function parsePng(buf) {
  // 8바이트 시그니처 + IHDR 청크. width/height 는 오프셋 16, 20에 빅엔디안 32비트.
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1; // 패딩/정렬 바이트 건너뛰기
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0..SOF15 중 DHT(c4)/JPG(c8)/DAC(cc) 를 제외한 것이 크기를 담고 있다.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

function parseGif(buf) {
  if (buf.length < 10 || buf.toString('ascii', 0, 3) !== 'GIF') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function parseWebp(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;

  const format = buf.toString('ascii', 12, 16);
  if (format === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (format === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === 'VP8X') {
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  return null;
}

/**
 * 사이트 루트 기준 절대 경로(`/assets/images/...`)의 이미지 크기를 구한다.
 *
 * @param {string} rootDir 저장소 루트
 * @param {string} sitePath `/` 로 시작하는 사이트 내 경로
 * @returns {{width: number, height: number} | null} 못 읽으면 null
 */
export function imageSize(rootDir, sitePath) {
  if (cache.has(sitePath)) return cache.get(sitePath);

  // 쿼리스트링/해시를 떼고, percent-encoding 을 푼다 (한글 파일명이 있다).
  const clean = sitePath.split(/[?#]/u)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    decoded = clean;
  }

  const buf = readHead(join(rootDir, decoded.replace(/^\//u, '')));
  const size = buf
    ? (parsePng(buf) ?? parseJpeg(buf) ?? parseGif(buf) ?? parseWebp(buf))
    : null;

  cache.set(sitePath, size);
  return size;
}
