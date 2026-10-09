package org.soloscape.teavm.platform.net;
public final class InetAddress {public final String host;private InetAddress(String host){this.host=host;}public static InetAddress getByName(String host){return new InetAddress(java.util.Objects.requireNonNull(host));}}
