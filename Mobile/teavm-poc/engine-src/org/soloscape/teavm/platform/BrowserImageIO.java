package org.soloscape.teavm.platform;
import java.io.*;import org.soloscape.teavm.platform.awt.image.BufferedImage;import org.teavm.interop.*;import org.teavm.jso.*;
public final class BrowserImageIO {
    public static void setUseCache(boolean cache){} // Browser decoders own their internal cache.
    public static BufferedImage read(InputStream stream)throws IOException {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int count;while((count=stream.read(buffer))!=-1)bytes.write(buffer,0,count);
        byte[] data=bytes.toByteArray();
        boolean supported=data.length>=2&&((data[0]&255)==255&&(data[1]&255)==216||data[0]=='B'&&data[1]=='M') ||
            data.length>=8&&(data[0]&255)==137&&data[1]=='P'&&data[2]=='N'&&data[3]=='G' ||
            data.length>=6&&data[0]=='G'&&data[1]=='I'&&data[2]=='F';
        return supported?decode(data):null;
    }
    @Async private static native BufferedImage decode(byte[] bytes)throws IOException;
    private static void decode(byte[] bytes,AsyncCallback<BufferedImage> callback){
        decodeNative(bytes,(result,error)->{
            if(error!=null){callback.error(new IOException(error));return;}
            int width=width(result),height=height(result);BufferedImage image=new BufferedImage(width,height,BufferedImage.TYPE_INT_ARGB);
            int[] pixels=new int[Math.multiplyExact(width,height)];for(int i=0;i<pixels.length;i++)pixels[i]=pixel(result,i);
            image.setRGB(0,0,width,height,pixels,0,width);callback.complete(image);
        });
    }
    @JSFunctor private interface Completion extends JSObject{void done(JSObject result,String error);}
    @JSBody(params={"bytes","done"},script="createImageBitmap(new Blob([new Uint8Array(bytes)])).then(bitmap=>{try{const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;done({width:canvas.width,height:canvas.height,pixels},null);}catch(error){done(null,String(error));}finally{bitmap.close();}},error=>done(null,String(error)));")
    private static native void decodeNative(@JSByRef byte[] bytes,Completion done);
    @JSBody(params={"image"},script="return image.width;")private static native int width(JSObject image);
    @JSBody(params={"image"},script="return image.height;")private static native int height(JSObject image);
    @JSBody(params={"image","i"},script="const p=image.pixels,j=i*4;return (p[j+3]<<24)|(p[j]<<16)|(p[j+1]<<8)|p[j+2];")private static native int pixel(JSObject image,int i);
}
