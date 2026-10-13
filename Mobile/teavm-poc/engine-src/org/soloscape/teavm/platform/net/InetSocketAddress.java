package org.soloscape.teavm.platform.net;
public final class InetSocketAddress extends SocketAddress {public final String host;public final int port;public InetSocketAddress(String host,int port){if(port<1||port>65535)throw new IllegalArgumentException("Port");this.host=host;this.port=port;}}
