import java.io.*;import java.util.*;
import org.soloscape.teavm.platform.BrowserObjectInputStream;
import org.soloscape.teavm.platform.HeapMemory;
import org.soloscape.teavm.platform.fs.BrowserProperties;

public final class EngineServicesJvmTest {
    private static void check(boolean value,String name){if(!value)throw new AssertionError(name);}
    private static byte[] serialize(Object value)throws IOException{ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(ObjectOutputStream out=new ObjectOutputStream(bytes)){out.writeObject(value);}return bytes.toByteArray();}
    private static Object decode(Object value)throws Exception{return new BrowserObjectInputStream(new ByteArrayInputStream(serialize(value))).readObject();}
    private static byte[] malformedDescriptor(boolean cycle)throws IOException{
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(bytes);
        out.writeShort(0xaced);out.writeShort(5);out.writeByte(0x73);
        for(int i=0;i<(cycle?1:65);i++){
            out.writeByte(0x72);out.writeUTF("java.lang.Integer");out.writeLong(0);out.writeByte(2);out.writeShort(0);out.writeByte(0x78);
        }
        if(cycle){out.writeByte(0x71);out.writeInt(0x7e0000);}else out.writeByte(0x70);
        return bytes.toByteArray();
    }
    public static void main(String[] args)throws Exception{
        if(args.length!=0){String text="\u0000\ud83d\udc08";byte[] data=serialize(new Object[]{text,text,-17,Long.MIN_VALUE,new int[]{1,-2},true,null});for(byte value:data)System.out.printf("%02x",value&255);return;}
        for(Object value:new Object[]{null,"\u0000\ud83d\udc08",-17,Long.MIN_VALUE,(short)-6,(byte)127,1.5d,-2.25f,true,'\u00e9'}){
            Object copy=decode(value);check(Objects.equals(value,copy),"scalar serialization "+value);
            check(value==null||value.getClass()==copy.getClass(),"scalar type");
        }
        check(Arrays.equals((int[])decode(new int[]{1,-2,Integer.MAX_VALUE}),new int[]{1,-2,Integer.MAX_VALUE}),"primitive array");
        Object[] cycle=new Object[1];cycle[0]=cycle;Object[] decoded=(Object[])decode(cycle);check(decoded[0]==decoded,"array references");
        String longText=String.join("",Collections.nCopies(40000,"\u0000\ud83d\udc08"));check(longText.equals(decode(longText)),"long modified UTF");
        try{decode(new Date());throw new AssertionError("Arbitrary class accepted");}catch(InvalidClassException expected){}
        try{new BrowserObjectInputStream(new ByteArrayInputStream(new byte[]{0,0,0,0}));throw new AssertionError("Bad header accepted");}catch(StreamCorruptedException expected){}
        for(boolean cycleDescriptor:new boolean[]{false,true}){
            try{new BrowserObjectInputStream(new ByteArrayInputStream(malformedDescriptor(cycleDescriptor))).readObject();throw new AssertionError("Unbounded descriptor accepted");}
            catch(StreamCorruptedException expected){}
        }
        HeapMemory memory=new HeapMemory();long pointer=memory.allocateMemory(5);byte[] input={1,2,3,4,5},output=new byte[5];
        memory.copyMemory(input,0,null,pointer,5);memory.copyMemory(null,pointer,null,pointer+1,4);memory.copyMemory(null,pointer,output,0,5);
        check(Arrays.equals(output,new byte[]{1,1,2,3,4}),"overlapping memory copy");
        try{memory.copyMemory(null,pointer+4,output,0,2);throw new AssertionError("Memory overrun accepted");}catch(IndexOutOfBoundsException expected){}
        memory.freeMemory(pointer);try{memory.copyMemory(null,pointer,output,0,1);throw new AssertionError("Freed memory read accepted");}catch(IndexOutOfBoundsException expected){}
        Properties original=new Properties();original.setProperty(" a=:!#\\","  value\n\r\t\u00e9\ud83d\udc08");StringWriter text=new StringWriter();BrowserProperties.store(original,text,"header\nsecond");
        Properties loaded=new Properties();loaded.load(new StringReader(text.toString()));check(original.equals(loaded),"properties roundtrip");
        System.out.println("PASS: JVM serialization oracle, bounded heap memory and properties roundtrip");
    }
}
