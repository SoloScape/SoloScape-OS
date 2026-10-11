package org.soloscape.teavm.platform.net;
import java.net.*;import java.io.*;
public final class BrowserHttp {
    public static URLConnection open(URL url)throws IOException {
        if(!url.getProtocol().equals("https")&&!url.getProtocol().equals("http"))return url.openConnection();
        return new HttpsURLConnection(url);
    }
    public static InputStream stream(URL url)throws IOException{return open(url).getInputStream();}
    public static SSLSocketFactory sslFactory(){return new SSLSocketFactory();}
}
