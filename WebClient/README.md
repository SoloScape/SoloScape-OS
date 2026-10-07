# SoloScape Web Client

This directory contains the browser-native SoloScape client work targeting
Safari on iPhone/iPad and modern desktop browsers.

The current branch implements browser transport plus a validated, bounded JS5
cache client for OSRS protocol revision 240 / client 240.2.

## Current JS5 flow

A successful Connect now performs:

    WebSocket connect
      -> rev-240 JS5 handshake
      -> master index 255:255
      -> parse archive CRC/version metadata
      -> bounded/retried 255:<archive> reference-table queue
      -> decode type 0/type 2 cache containers
      -> parse reference-table structure
      -> validate reference-table CRC + version
      -> persist validated reference tables
      -> JS5 index ready

After bootstrap, client code can select an archive/group:

    reference tables
      -> select archive/group
      -> bounded JS5 request queue
      -> receive group container
      -> validate group CRC
      -> restore + validate group version trailer
      -> decode container
      -> persist validated group

The observed SoloScape cache has 25 master-index slots. Slots 16 and 23 are
empty, leaving 23 present archive reference tables.

## Request scheduler

Js5RequestScheduler owns post-master-index JS5 requests.

Defaults:

    max in flight: 8
    request timeout: 10 seconds
    retries: 2

The scheduler:

- bounds simultaneous requests;
- queues excess work;
- deduplicates callers requesting the same archive/group;
- accepts out-of-order responses;
- retries timed-out requests;
- cancels queued/in-flight work when the connection closes.

The same scheduler now handles reference-table bootstrap traffic and ordinary
asset groups.

## Reference-table CRC/version validation

Each master-index entry contains:

    crc      u32
    version  u32

For each returned 255:<archive> reference table the web client:

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

It does not include JS5's 512-byte transport framing or 0xff continuation bytes.

## Ordinary cache-group validation

Reference-table group entries supply the expected group checksum and version.

SoloScape's server deliberately strips the two-byte cache-sector version trailer
from ordinary groups before transmitting them over JS5. The browser therefore:

1. validates CRC-32 over the received reconstructed container;
2. restores the two-byte trailer from the low 16 bits of the reference-table
   group version;
3. validates that trailer;
4. decodes the container;
5. persists the validated wire container plus the restored on-disk cache form.

This matches the repository's OpenRS2-compatible cache code, which strips the
version trailer for JS5 delivery and restores it for disk-cache storage.

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

js5-groups records now include validation state, CRC, version, the reconstructed
wire container, and (for ordinary archive groups) cacheFile with the restored
two-byte version trailer.

js5-metadata contains:

    master-index
    reference-table:<archive>

## Debug API

The live client remains exposed as:

    window.soloscapeJs5

Get a parsed reference table:

    window.soloscapeJs5.getArchiveReferenceTable(2)

Inspect scheduler state:

    window.soloscapeJs5.getRequestQueueStatus()

Download, validate, decode, and persist an actual group:

    const group = await window.soloscapeJs5.downloadGroup(2, 9)
    group.crc
    group.version
    group.data

Group/file unpacking is not implemented yet, so group.data is the decoded group
payload rather than individual files.

## Expected live log

Reference bootstrap is now bounded:

    Queued JS5 archive reference tables: 23 present groups; skipped 2 empty slots; max-in-flight=8.
    TX JS5 scheduled request 255:0 attempt=1 priority=urgent in-flight=1/8.
    ...
    JS5 cache index bootstrap complete: master index + 23 present archive reference tables received, decoded, parsed and validated.

An ordinary group download adds:

    Queued JS5 cache group 2:9 expected-crc=0x........ version=...
    TX JS5 scheduled request 2:9 attempt=1 priority=urgent in-flight=1/8.
    Validated JS5 cache group 2:9: crc=0x........ version=... trailer=...
    Decoded and cached JS5 group 2:9: compression=2 ... -> ... bytes.

CRC/version failures are rejected and the invalid group is not persisted.

## Tests

From WebClient:

    npm run typecheck
    npm run test:protocol
    npm run build

Tests cover stream fragmentation/continuations, master-index parsing,
container decoding, reference-table parsing, CRC/version validation, version
trailer handling, scheduler concurrency/deduplication, timeout retries and
cancellation.

## M1 status

Complete so far:

- rev-240 JS5 handshake
- master-index parsing
- empty archive-slot handling
- bounded/retried archive reference-table downloads
- type 0/type 2 cache-container decoding
- archive reference-table parsing
- reference-table CRC/version validation
- bounded ordinary cache-group download scheduler
- per-group CRC/version-trailer validation
- validated group persistence in IndexedDB
- structured reference-table persistence in IndexedDB

Next:

- group/file unpacking
- typed startup definitions/assets

## Reference format

The reference-table parser follows the modern JS5 index field order used by the
cache implementation in this repository and OpenRS2-compatible tooling.

Do not import packet ids or transforms from unrelated OSRS revisions.
