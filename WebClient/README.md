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
      -> validate reference-table CRC + version
      -> persist only validated reference tables
      -> JS5 index ready

The observed SoloScape cache has 25 master-index slots. Slots 16 and 23 are
empty, leaving 23 present archive reference tables.

## Reference-table CRC/version validation

Each master-index entry contains:

    crc      u32
    version  u32

For each returned 255:<archive> reference table the web client now:

1. reconstructs the raw cache container from JS5 framing;
2. decodes and parses the reference table;
3. computes IEEE CRC-32 over the complete reconstructed cache container;
4. compares the result with the master-index CRC;
5. compares the parsed reference-table version with the master-index version;
6. only then stores the raw container and structured metadata in IndexedDB.

The CRC covers:

    compression byte
    compressed-size field
    uncompressed-size field when present
    compressed/stored payload

It does not include JS5's 512-byte transport framing or 0xff continuation bytes,
because those have already been removed by the stream decoder.

A CRC or version mismatch is fatal to the current bootstrap and the bad reference
table is not persisted.

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

For each archive the parser exposes group IDs, CRCs, versions, file IDs and all
optional metadata indicated by those flags.

## Cache container decoder

Implemented:

- compression 0: stored/uncompressed
- compression 2: gzip through DecompressionStream('gzip')

Compression 1 (bzip2) is still explicitly unsupported.

## IndexedDB

Database:

    soloscape-web-cache

Stores:

    js5-groups
    js5-metadata

js5-groups contains reconstructed cache containers. Archive reference tables are
written only after their master-index CRC and version validate.

js5-metadata contains:

    master-index
    reference-table:<archive>

## Debug API

The live client remains exposed as:

    window.soloscapeJs5

Get a parsed reference table:

    window.soloscapeJs5.getArchiveReferenceTable(2)

## Expected live log

A valid archive should now produce:

    Reference table 2 received (...) expected-crc=0x........ version=...
    Validated reference table 2: crc=0x........ version=...
    Parsed reference table 2: protocol=7 version=... flags=0x.. groups=... files=...
    Decoded reference table 2: compression=2 ... -> ... bytes (.../23 validated).

Once all 23 pass:

    JS5 cache index bootstrap complete: master index + 23 present archive reference tables received, decoded, parsed and validated.

Any mismatch produces a fatal message such as:

    JS5 reference table 2 CRC mismatch: expected 0x........, got 0x.........

or:

    JS5 reference table 2 version mismatch: expected ..., got ....

## Tests

From WebClient:

    npm run typecheck
    npm run test:protocol
    npm run build

Validation tests cover:

- the standard CRC-32 known vector ("123456789" -> 0xcbf43926)
- matching reference-table CRC/version
- CRC mismatch rejection
- version mismatch rejection
- wrong-archive metadata rejection

## M1 status

Complete so far:

- rev-240 JS5 handshake
- master-index parsing
- empty archive-slot handling
- archive reference-table downloads
- type 0/type 2 cache-container decoding
- archive reference-table parsing
- reference-table CRC/version validation
- structured reference-table persistence in IndexedDB

Next:

- actual cache group download scheduler
- per-group CRC/version validation
- group/file unpacking
- startup definitions/assets

## Reference format

The reference-table parser follows the modern JS5 index field order used by the
cache implementation in this repository and OpenRS2-compatible tooling.

Do not import packet ids or transforms from unrelated OSRS revisions.
