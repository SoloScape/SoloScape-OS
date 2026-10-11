package org.soloscape.teavm.platform.net;
import java.net.*;import java.io.*;import java.util.*;import org.teavm.interop.*;import org.teavm.jso.*;
public final class HttpsURLConnection extends HttpURLConnection {
    private final Map<String,String> requestHeaders=new LinkedHashMap<>();
    private final ByteArrayOutputStream requestBody=new ByteArrayOutputStream();
    private byte[] responseBody;private Map<String,List<String>> responseHeaders=new LinkedHashMap<>();
    private boolean disconnected;
    public HttpsURLConnection(URL url){super(url);}
    public void setSSLSocketFactory(SSLSocketFactory factory){if(factory==null)throw new NullPointerException();}
    public void setRequestProperty(String name,String value){if(connected)throw new IllegalStateException("Connected");requestHeaders.put(name,value);}
    public OutputStream getOutputStream()throws IOException{if(!getDoOutput())throw new ProtocolException("Output disabled");return requestBody;}
    public void connect()throws IOException {
        if(disconnected)throw new IOException("HTTP connection disconnected");if(connected)return;
        JSObject headers=headers();for(Map.Entry<String,String> item:requestHeaders.entrySet())header(headers,item.getKey(),item.getValue());
        JSObject response=fetch(url.toString(),method,headers,requestBody.toByteArray(),Math.max(getConnectTimeout(),getReadTimeout()),getInstanceFollowRedirects());
        responseCode=status(response);responseMessage=statusText(response);
        JSObject data=data(response);responseBody=new byte[length(data)];for(int i=0;i<responseBody.length;i++)responseBody[i]=(byte)at(data,i);
        for(int i=0;i<headerCount(response);i++)responseHeaders.put(headerName(response,i),Collections.singletonList(headerValue(response,i)));
        connected=true;
    }
    public int getResponseCode()throws IOException{connect();return responseCode;}
    public String getResponseMessage()throws IOException{connect();return responseMessage;}
    public InputStream getInputStream()throws IOException{connect();if(responseCode>=400)throw new FileNotFoundException(url.toString());return new ByteArrayInputStream(responseBody);}
    public InputStream getErrorStream(){try{connect();return responseCode>=400?new ByteArrayInputStream(responseBody):null;}catch(IOException e){return null;}}
    public int getContentLength(){try{connect();return responseBody.length;}catch(IOException e){return -1;}}
    public Map<String,List<String>> getHeaderFields(){try{connect();return Collections.unmodifiableMap(responseHeaders);}catch(IOException e){return Collections.emptyMap();}}
    public void disconnect(){disconnected=true;}
    public boolean usingProxy(){return false;}
    @Async private static native JSObject fetch(String url,String method,JSObject headers,byte[] data,int timeout,boolean redirects)throws IOException;
    private static void fetch(String url,String method,JSObject headers,byte[] data,int timeout,boolean redirects,AsyncCallback<JSObject> callback){fetchNative(url,method,headers,data,timeout,redirects,(response,error)->{if(error==null)callback.complete(response);else callback.error(new IOException(error));});}
    @JSFunctor private interface Completion extends JSObject{void done(JSObject response,String error);}
    @JSBody(params={"url","method","headers","data","timeout","redirects","done"},script="const controller=new AbortController(),timer=timeout?setTimeout(()=>controller.abort(),timeout):null;fetch(url,{method,headers,body:method==='GET'||method==='HEAD'?undefined:new Uint8Array(data),redirect:redirects?'follow':'error',signal:controller.signal}).then(async response=>{const bytes=new Uint8Array(await response.arrayBuffer());clearTimeout(timer);done({status:response.status,text:response.statusText,headers:[...response.headers.entries()],bytes},null);}).catch(error=>{clearTimeout(timer);done(null,String(error));});")
    private static native void fetchNative(String url,String method,JSObject headers,@JSByRef byte[] data,int timeout,boolean redirects,Completion done);
    @JSBody(script="return {};")private static native JSObject headers();
    @JSBody(params={"headers","name","value"},script="headers[name]=value;")private static native void header(JSObject headers,String name,String value);
    @JSBody(params={"response"},script="return response.status;")private static native int status(JSObject response);
    @JSBody(params={"response"},script="return response.text;")private static native String statusText(JSObject response);
    @JSBody(params={"response"},script="return response.bytes;")private static native JSObject data(JSObject response);
    @JSBody(params={"data"},script="return data.length;")private static native int length(JSObject data);
    @JSBody(params={"data","i"},script="return data[i];")private static native int at(JSObject data,int i);
    @JSBody(params={"response"},script="return response.headers.length;")private static native int headerCount(JSObject response);
    @JSBody(params={"response","i"},script="return response.headers[i][0];")private static native String headerName(JSObject response,int i);
    @JSBody(params={"response","i"},script="return response.headers[i][1];")private static native String headerValue(JSObject response,int i);
}
