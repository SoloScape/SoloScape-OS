# SoloScape Web Client

This directory contains the browser-native SoloScape client work targeting
Safari on iPhone/iPad and modern desktop browsers.

The current branch implements browser transport plus the JS5 cache metadata
bootstrap for OSRS protocol revision 240 / client 240.2.

## Current JS5 bootstrap

A successful Connect now performs:

    WebSocket connect
      -> rev-240 JS5 handshake
      -> master index 255:255
      -> parse archive CRC/version metadata
      -> request every present 255:<archive> reference table
      -> decode type 0/type 2 cache containers
      -> parse reference-table structure
      -> persist raw containers + structured metadata in IndexedDB
      -> JS5 index ready

The observed SoloScape cache has 25 master-index slots. Slots 16 and 23 are
empty, leaving 23 present archive reference tables.

## Archive reference-table parser

Implemented protocols:

- protocol 5: original format using unsigned 16-bit counts/deltas
- protocol 6: versioned format using unsigned 16-bit counts/deltas
- protocol 7: smart format using unsigned 2-or-4-byte counts/deltas

Supported flags:

- 0x01: group/file name hashes
- 0x02: 64-byte Whirlpool group digests
- 0x04: compressed and uncompressed group lengths
- 0x08: uncompressed group checksums

For each archive the parser now exposes:

- reference-table protocol and version
- group IDs
- optional group name hashes
- group CRC/checksum
- optional uncompressed checksum
- optional Whirlpool digest
- optional compressed/uncompressed lengths
- group version
- file IDs
- optional file name hashes

Group and file IDs are delta encoded in the reference table and are expanded to
their absolute IDs by the parser.

The parser is strict: unsupported protocol/flag bits, truncated fields, invalid
counts/IDs and trailing bytes fail the bootstrap instead of producing partial
metadata.

## Cache container decoder

Implemented:

- compression 0: stored/uncompressed
- compression 2: gzip through DecompressionStream('gzip')

Compression 1 (bzip2) is still explicitly unsupported.

The decoder validates exact container lengths and declared decompressed lengths.

## IndexedDB

Database:

    soloscape-web-cache

Stores:

    js5-groups
    js5-metadata

js5-groups contains reconstructed raw JS5 cache containers.

js5-metadata contains:

    master-index
    reference-table:<archive>

Reference-table metadata is stored as structured objects including group/file
metadata and optional digest bytes.

## Debug API

The live client remains exposed as:

    window.soloscapeJs5

Get the decoded raw reference-table payload:

    window.soloscapeJs5.getArchiveIndexPayload(2)

Get a defensive copy of the parsed reference table:

    window.soloscapeJs5.getArchiveReferenceTable(2)

For example, in Safari's remote inspector or a desktop browser console:

    const table = window.soloscapeJs5.getArchiveReferenceTable(2)
    table.protocol
    table.groups.length
    table.groups[0]

## Expected live log

After pulling this milestone, successful archives should add entries such as:

    Parsed reference table 2: protocol=7 version=... flags=0x.. groups=... files=...
    Decoded reference table 2: compression=2 1765 -> ... bytes (.../23 parsed).

Once all are parsed:

    JS5 cache index bootstrap complete: master index + 23 present archive reference tables received, decoded and parsed.

## Tests

From WebClient:

    npm run typecheck
    npm run test:protocol
    npm run build

The reference-table tests cover:

- protocol 5 16-bit delta IDs
- protocol 7 2-or-4-byte smart IDs
- IDs above 32767
- names
- Whirlpool digests
- lengths
- uncompressed checksums
- file IDs/name hashes
- unsupported protocols/flags
- trailing-byte rejection

## M1 status

Complete so far:

- rev-240 JS5 handshake
- master-index parsing
- empty archive-slot handling
- archive reference-table downloads
- type 0/type 2 cache-container decoding
- archive reference-table parsing
- structured reference-table persistence in IndexedDB

Next:

- CRC/version validation
- actual cache group download scheduler
- group/file unpacking
- startup definitions/assets

## Reference format

The parser follows the modern JS5 index field order used by OpenRS2's
Js5Index reader, including protocols 5/6/7 and all current flag bits.

Do not import packet ids or transforms from unrelated OSRS revisions.
