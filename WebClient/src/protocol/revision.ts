/**
 * SoloScape server protocol revision.
 *
 * The repository server config uses revision 240 while its RSProx setup labels
 * the matching client build 240.2. Protocol work in this web client should use
 * Client/protocol/osrs-240 and the existing desktop client as the source of truth.
 */
export const OSRS_PROTOCOL_REVISION = 240;
export const OSRS_CLIENT_TARGET = '240.2';

export type ClientPhase =
  | 'boot'
  | 'js5-handshake'
  | 'js5'
  | 'login-handshake'
  | 'login'
  | 'game';

/**
 * Intentionally contains no packet ids yet.
 *
 * Add packet definitions only after validating them against the revision 240
 * protocol module in this repository. Keeping this empty prevents accidental
 * mixing of packet ids from another revision.
 */
export const SERVER_PACKET_LENGTHS: Readonly<Record<number, number>> = {};
