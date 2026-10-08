# Phone access on your local network

Keep the Kotlin server running on port 43594. From `Mobile`, run:

```powershell
npm run dev:lan -- 192.168.0.129
```

Replace the address with your PC's current private IPv4 address. The launcher
binds HTTPS to that address on **3443** and the native WSS gateway on **43596**.
Cache, title, interfaces, diagnostics and account login use the configured WSS
endpoint. Existing desktop HTTP/WS listeners can continue running separately.
Only the exact HTTPS page origin is allowed through the gateway; its game TCP
destination stays on loopback. No router port forwarding is needed.

The launcher requires OpenSSL (Git for Windows includes it); set `OPENSSL_BIN`
if installed elsewhere. It creates a local CA and a server certificate with the
LAN IP in its subject alternative names. Certificates and private keys stay in
the ignored `Mobile/.lan` directory. Re-running reuses the CA and reissues the
server certificate when the address changes or expiration approaches.
Use `--setup-only` to generate certificates without starting listeners.

Transfer **only** `Mobile/.lan/soloscape-lan-ca.crt` to your phone through a
trusted local transfer. Do not transfer `.key` files. Compare the CA's SHA-256
fingerprint with the launcher's output before trusting it.

- iPhone/iPad: install the downloaded certificate profile in Settings, then
  enable full trust for **SoloScape LAN Local CA** under General → About →
  Certificate Trust Settings.
- Android: install it as a **CA certificate** in the device's security settings
  (the menu name varies by manufacturer), then use Chrome.

Device instructions: [Apple certificate trust](https://support.apple.com/en-gb/102390)
and [Google certificate installation](https://support.google.com/pixelphone/answer/2844832).
Certificate generation follows [OpenSSL's certificate request documentation](https://docs.openssl.org/3.4/man1/openssl-req/).

On the same home network, open **https://192.168.0.129:3443/** (substitute your
address). The browser should report a trusted connection before you log in.
If the page is unreachable, allow inbound TCP ports 3443 and 43596 in Windows
Firewall, scoped to your local subnet. In an administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName 'SoloScape LAN HTTPS and WSS' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3443,43596 -RemoteAddress LocalSubnet -Profile Any
```

Stop the launcher with Ctrl+C. To remove phone trust later, remove the CA/profile
in your phone's settings. This setup is for your trusted LAN; internet hosting
requires a publicly trusted certificate and deployment configuration.

For manually managed certificates, both servers accept `SOLOSCAPE_TLS_CERT_FILE`
and `SOLOSCAPE_TLS_KEY_FILE`. The preview also accepts `SOLOSCAPE_PREVIEW_HOST`,
`SOLOSCAPE_PREVIEW_PORT` and `SOLOSCAPE_NATIVE_GATEWAY_URL`. A non-loopback preview
refuses to start without TLS; HTTPS requires a WSS gateway URL. The standalone
gateway retains its existing opt-in LAN/reverse-proxy configuration.
