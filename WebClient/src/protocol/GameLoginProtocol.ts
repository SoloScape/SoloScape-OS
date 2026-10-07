import { IsaacRandom } from './IsaacRandom';
import { rsaEncrypt } from './Rsa';
import { xteaEncrypt } from './Xtea';

export const INIT_GAME_CONNECTION = 14;
export const GAME_LOGIN = 16;
export const LOGIN_SUCCESS = 2;
export const LOGIN_SUCCESS_DECLARED_SIZE = 37;
export const LOGIN_SUCCESS_PAYLOAD_SIZE = 34;
export const LOGIN_CRC_COUNT = 23;
export const DESKTOP_LOGIN_CLIENT_TYPE = 1;
export const DEFAULT_LOGIN_PLATFORM_TYPE = 0;
export const PASSWORD_AUTHENTICATION = 0;
export const OTP_NONE = 2;

const CP1252_EXTENDED = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

class ByteWriter {
  private bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  p1(value: number): this {
    this.bytes.push(value & 0xff);
    return this;
  }

  p2(value: number): this {
    this.bytes.push((value >>> 8) & 0xff, value & 0xff);
    return this;
  }

  p3(value: number): this {
    this.bytes.push(
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    );
    return this;
  }

  p4(value: number): this {
    this.bytes.push(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    );
    return this;
  }

  p4Alt1(value: number): this {
    this.bytes.push(
      value & 0xff,
      (value >>> 8) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff,
    );
    return this;
  }

  p4Alt2(value: number): this {
    this.bytes.push(
      (value >>> 8) & 0xff,
      value & 0xff,
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
    );
    return this;
  }

  p4Alt3(value: number): this {
    this.bytes.push(
      (value >>> 16) & 0xff,
      (value >>> 24) & 0xff,
      value & 0xff,
      (value >>> 8) & 0xff,
    );
    return this;
  }

  p8(value: bigint): this {
    if (value < 0n || value > 0xffffffffffffffffn) {
      throw new RangeError('u64 value is outside the supported range.');
    }
    for (let shift = 56n; shift >= 0n; shift -= 8n) {
      this.bytes.push(Number((value >> shift) & 0xffn));
    }
    return this;
  }

  bytesOf(value: Uint8Array): this {
    for (const byte of value) {
      this.bytes.push(byte);
    }
    return this;
  }

  jstr(value: string): this {
    for (const byte of encodeCp1252(value)) {
      this.bytes.push(byte);
    }
    this.bytes.push(0);
    return this;
  }

  jstr2(value: string): this {
    this.bytes.push(0);
    return this.jstr(value);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

function encodeCp1252(value: string): Uint8Array {
  const bytes: number[] = [];
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if ((code >= 1 && code <= 127) || (code >= 160 && code <= 255)) {
      bytes.push(code);
      continue;
    }
    bytes.push(CP1252_EXTENDED.get(code) ?? 0x3f);
  }
  return Uint8Array.from(bytes);
}

function randomSeed(): Int32Array {
  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  return Int32Array.from(values, (value) => value | 0);
}

function randomUuid(): Uint8Array {
  const value = new Uint8Array(24);
  globalThis.crypto.getRandomValues(value);
  return value;
}

function encodeHostPlatformStats(): Uint8Array {
  const writer = new ByteWriter();
  writer
    .p1(9)
    .p1(4)
    .p1(1)
    .p2(0)
    .p1(4)
    .p1(0)
    .p1(0)
    .p1(0)
    .p1(1)
    .p2(0)
    .p1(Math.min(globalThis.navigator?.hardwareConcurrency ?? 0, 255))
    .p3(0)
    .p2(0)
    .jstr2('')
    .jstr2('WebGL')
    .jstr2('')
    .jstr2('Browser')
    .p1(0)
    .p2(0)
    .jstr2('Browser')
    .jstr2('JavaScript')
    .p1(0)
    .p1(0)
    .p4(0)
    .p4(0)
    .p4(0)
    .p4(0)
    .jstr2('SoloScape Web')
    .jstr2('Browser');
  return writer.toUint8Array();
}

/**
 * Encodes the 23 desktop CRC values using the exact rev-240 transform/order
 * consumed by DesktopLoginCrcDecoder in rsprot.
 */
export function encodeDesktopLoginCrcs(
  crc: readonly number[],
): Uint8Array {
  if (crc.length !== LOGIN_CRC_COUNT) {
    throw new RangeError(
      'rev-240 desktop login requires exactly ' + LOGIN_CRC_COUNT +
      ' cache CRC values; received ' + crc.length + '.',
    );
  }

  const writer = new ByteWriter();
  writer
    .p4Alt3(crc[20])
    .p4Alt2(crc[0])
    .p4Alt3(crc[8])
    .p4Alt1(crc[1])
    .p4Alt1(crc[13])
    .p4Alt3(crc[15])
    .p4Alt1(crc[17])
    .p4Alt3(crc[9])
    .p4Alt3(crc[18])
    .p4(crc[5])
    .p4Alt1(crc[7])
    .p4Alt1(crc[16])
    .p4(crc[19])
    .p4Alt1(crc[3])
    .p4Alt1(crc[12])
    .p4Alt1(crc[14])
    .p4Alt1(crc[6])
    .p4Alt3(crc[21])
    .p4Alt1(crc[2])
    .p4(crc[4])
    .p4Alt2(crc[22])
    .p4(crc[11])
    .p4Alt2(crc[10]);
  return writer.toUint8Array();
}

export interface GameLoginPacketOptions {
  revision: number;
  username: string;
  password: string;
  sessionId: bigint;
  rsaModulusHex: string;
  rsaExponentHex?: string;
  crcValues: readonly number[];
  subVersion?: number;
  serverVersion?: number;
  width?: number;
  height?: number;
  lowDetail?: boolean;
  resizable?: boolean;
  seed?: readonly number[];
  uuid?: Uint8Array;
}

export interface EncodedGameLoginPacket {
  packet: Uint8Array;
  seed: Int32Array;
}

export function encodeRsaLoginPlaintext(
  seed: readonly number[],
  sessionId: bigint,
  password: string,
): Uint8Array {
  if (seed.length !== 4) {
    throw new RangeError('Login seed must contain exactly four integers.');
  }
  if (password.length === 0) {
    throw new Error('Password cannot be empty.');
  }

  const writer = new ByteWriter();
  writer.p1(1);
  for (const value of seed) {
    writer.p4(value);
  }
  writer
    .p8(sessionId)
    .p1(OTP_NONE)
    .p4(0)
    .p1(PASSWORD_AUTHENTICATION)
    .jstr(password);
  return writer.toUint8Array();
}

export function encodeLoginXteaPlaintext(
  options: Pick<
    GameLoginPacketOptions,
    | 'username'
    | 'crcValues'
    | 'width'
    | 'height'
    | 'lowDetail'
    | 'resizable'
    | 'uuid'
  >,
): Uint8Array {
  if (options.username.length === 0) {
    throw new Error('Username cannot be empty.');
  }

  const uuid = options.uuid?.slice() ?? randomUuid();
  if (uuid.length !== 24) {
    throw new RangeError('Login UUID must contain exactly 24 bytes.');
  }

  const packedClientSettings =
    (options.lowDetail ? 1 : 0) |
    (options.resizable === false ? 0 : 2);

  const writer = new ByteWriter();
  writer
    .jstr(options.username)
    .p1(packedClientSettings)
    .p2(options.width ?? 765)
    .p2(options.height ?? 503)
    .bytesOf(uuid)
    .jstr('')
    .p4(0)
    .p1(0)
    .bytesOf(encodeHostPlatformStats())
    .p1(0)
    .p4(0)
    .bytesOf(encodeDesktopLoginCrcs(options.crcValues));

  return writer.toUint8Array();
}

export function encodeGameLoginPacket(
  options: GameLoginPacketOptions,
): EncodedGameLoginPacket {
  const seed = options.seed
    ? Int32Array.from(options.seed, (value) => value | 0)
    : randomSeed();
  if (seed.length !== 4) {
    throw new RangeError('Login seed must contain exactly four integers.');
  }

  const seedValues = Array.from(seed, (value) => value | 0);
  const rsaPlaintext = encodeRsaLoginPlaintext(
    seedValues,
    options.sessionId,
    options.password,
  );
  const rsaCiphertext = rsaEncrypt(
    rsaPlaintext,
    options.rsaModulusHex,
    options.rsaExponentHex,
  );
  const xteaPlaintext = encodeLoginXteaPlaintext(options);
  const xteaCiphertext = xteaEncrypt(xteaPlaintext, seedValues);

  const payload = new ByteWriter()
    .p4(options.revision)
    .p4(options.subVersion ?? 2)
    .p4(options.serverVersion ?? 0)
    .p1(DESKTOP_LOGIN_CLIENT_TYPE)
    .p1(DEFAULT_LOGIN_PLATFORM_TYPE)
    .p1(0)
    .p2(rsaCiphertext.length)
    .bytesOf(rsaCiphertext)
    .bytesOf(xteaCiphertext)
    .toUint8Array();

  if (payload.length > 0xffff) {
    throw new RangeError('Login payload exceeds the rev-240 VAR_SHORT limit.');
  }

  const packet = new ByteWriter()
    .p1(GAME_LOGIN)
    .p2(payload.length)
    .bytesOf(payload)
    .toUint8Array();

  return { packet, seed };
}

export interface LoginSuccess {
  authenticatorCode: number | null;
  staffModLevel: number;
  playerMod: boolean;
  localPlayerIndex: number;
  member: boolean;
  accountHash: bigint;
  userId: bigint;
  userHash: bigint;
}

class ByteReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  get remaining(): number {
    return this.bytes.length - this.offset;
  }

  g1(): number {
    this.require(1);
    return this.bytes[this.offset++];
  }

  g2(): number {
    return (this.g1() << 8) | this.g1();
  }

  g4(): number {
    return (
      ((this.g1() << 24) >>> 0) |
      (this.g1() << 16) |
      (this.g1() << 8) |
      this.g1()
    ) >>> 0;
  }

  g8(): bigint {
    let value = 0n;
    for (let i = 0; i < 8; i += 1) {
      value = (value << 8n) | BigInt(this.g1());
    }
    return value;
  }

  private require(length: number): void {
    if (this.remaining < length) {
      throw new RangeError('Login response payload is truncated.');
    }
  }
}

export function decodeLoginSuccess(
  payload: Uint8Array,
  serverIsaac: IsaacRandom,
): LoginSuccess {
  if (payload.length !== LOGIN_SUCCESS_PAYLOAD_SIZE) {
    throw new Error(
      'Invalid rev-240 login-success payload length ' + payload.length +
      '; expected ' + LOGIN_SUCCESS_PAYLOAD_SIZE + '.',
    );
  }

  const reader = new ByteReader(payload);
  const hasAuthenticatorCode = reader.g1() === 1;
  let authenticatorCode: number | null = null;

  if (hasAuthenticatorCode) {
    const b0 = (reader.g1() - serverIsaac.nextInt()) & 0xff;
    const b1 = (reader.g1() - serverIsaac.nextInt()) & 0xff;
    const b2 = (reader.g1() - serverIsaac.nextInt()) & 0xff;
    const b3 = (reader.g1() - serverIsaac.nextInt()) & 0xff;
    authenticatorCode = (
      ((b0 << 24) >>> 0) |
      (b1 << 16) |
      (b2 << 8) |
      b3
    ) >>> 0;
  } else {
    reader.g4();
  }

  const result: LoginSuccess = {
    authenticatorCode,
    staffModLevel: reader.g1(),
    playerMod: reader.g1() !== 0,
    localPlayerIndex: reader.g2(),
    member: reader.g1() !== 0,
    accountHash: reader.g8(),
    userId: reader.g8(),
    userHash: reader.g8(),
  };

  if (reader.remaining !== 0) {
    throw new Error('Login-success decoder did not consume the payload.');
  }
  return result;
}
