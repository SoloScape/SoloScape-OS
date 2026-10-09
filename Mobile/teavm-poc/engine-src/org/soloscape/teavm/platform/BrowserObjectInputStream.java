package org.soloscape.teavm.platform;
import java.io.*;import java.util.*;

/** Bounded Java wire decoder for reflection-check values; no arbitrary object construction. */
public final class BrowserObjectInputStream extends InputStream {
    private final DataInputStream input;
    private final List<Object> handles=new ArrayList<>();
    private int depth;
    private int descriptorDepth;
    public BrowserObjectInputStream(InputStream stream)throws IOException{
        input=new DataInputStream(stream);if(input.readUnsignedShort()!=0xaced||input.readUnsignedShort()!=5)throw new StreamCorruptedException("Serialization header");
    }
    public int read()throws IOException{return input.read();}
    public void close()throws IOException{input.close();}
    private int handle(Object value)throws IOException{if(handles.size()>=10000)throw new StreamCorruptedException("Too many references");handles.add(value);return handles.size()-1;}
    private Object reference()throws IOException{int id=input.readInt()-0x7e0000;if(id<0||id>=handles.size())throw new StreamCorruptedException("Invalid reference");return handles.get(id);}
    public Object readObject()throws IOException,ClassNotFoundException{
        if(++depth>64)throw new StreamCorruptedException("Object nesting limit");
        try{return value(input.readUnsignedByte());}finally{depth--;}
    }
    private Object value(int token)throws IOException,ClassNotFoundException{
        switch(token){
            case 0x70:return null;
            case 0x71:return reference();
            case 0x74:{String value=input.readUTF();handle(value);return value;}
            case 0x7c:{String value=longString();handle(value);return value;}
            case 0x79:handles.clear();return readObject();
            case 0x73:return object();
            case 0x75:return array();
            default:throw new StreamCorruptedException("Unsupported serialization token "+token);
        }
    }
    private static final class Descriptor {String name;int flags;Descriptor parent;String[] names;char[] types;}
    private Descriptor descriptor()throws IOException,ClassNotFoundException{
        if(++descriptorDepth>64){descriptorDepth--;throw new StreamCorruptedException("Descriptor nesting limit");}
        try{return readDescriptor();}finally{descriptorDepth--;}
    }
    private Descriptor readDescriptor()throws IOException,ClassNotFoundException{
        int token=input.readUnsignedByte();if(token==0x70)return null;if(token==0x71){Object value=reference();if(!(value instanceof Descriptor))throw new StreamCorruptedException("Descriptor reference");return (Descriptor)value;}
        if(token!=0x72)throw new StreamCorruptedException("Class descriptor");
        Descriptor descriptor=new Descriptor();descriptor.name=input.readUTF();input.readLong();handle(descriptor);
        descriptor.flags=input.readUnsignedByte();int count=input.readUnsignedShort();if(count>128)throw new InvalidClassException("Field limit");
        descriptor.names=new String[count];descriptor.types=new char[count];
        for(int i=0;i<count;i++){char type=(char)input.readUnsignedByte();descriptor.types[i]=type;descriptor.names[i]=input.readUTF();if(type=='L'||type=='[')readObject();}
        if(input.readUnsignedByte()!=0x78)throw new InvalidClassException("Class annotations are unsupported");descriptor.parent=descriptor();return descriptor;
    }
    private Object object()throws IOException,ClassNotFoundException{
        Descriptor descriptor=descriptor();if(descriptor==null)throw new StreamCorruptedException("Missing object descriptor");
        String name=descriptor.name;
        if(!Arrays.asList("java.lang.Integer","java.lang.Long","java.lang.Short","java.lang.Byte","java.lang.Double","java.lang.Float","java.lang.Boolean","java.lang.Character").contains(name))
            throw new InvalidClassException(name,"Only reflection-check scalar classes are supported");
        int id=handle(null);Map<String,Object> values=new HashMap<>();fields(descriptor,values,0);Object raw=values.get("value"),result;
        if(name.equals("java.lang.Integer"))result=((Number)raw).intValue();
        else if(name.equals("java.lang.Long"))result=((Number)raw).longValue();
        else if(name.equals("java.lang.Short"))result=((Number)raw).shortValue();
        else if(name.equals("java.lang.Byte"))result=((Number)raw).byteValue();
        else if(name.equals("java.lang.Double"))result=((Number)raw).doubleValue();
        else if(name.equals("java.lang.Float"))result=((Number)raw).floatValue();else result=raw;
        handles.set(id,result);return result;
    }
    private void fields(Descriptor descriptor,Map<String,Object> values,int nesting)throws IOException,ClassNotFoundException{
        if(nesting>=64)throw new StreamCorruptedException("Descriptor inheritance limit");
        if(descriptor.parent!=null)fields(descriptor.parent,values,nesting+1);
        if(descriptor.flags!=2)throw new InvalidClassException("Custom serialization is unsupported");
        for(int i=0;i<descriptor.names.length;i++)values.put(descriptor.names[i],primitive(descriptor.types[i]));
    }
    private Object primitive(char type)throws IOException,ClassNotFoundException{
        switch(type){case 'I':return input.readInt();case 'J':return input.readLong();case 'S':return input.readShort();case 'B':return input.readByte();case 'F':return input.readFloat();case 'D':return input.readDouble();case 'Z':return input.readBoolean();case 'C':return input.readChar();case '[':case 'L':return readObject();default:throw new StreamCorruptedException("Field type");}
    }
    private Object array()throws IOException,ClassNotFoundException{
        Descriptor descriptor=descriptor();if(descriptor==null)throw new StreamCorruptedException("Missing array descriptor");
        int length=input.readInt();if(length<0||length>1000000)throw new InvalidClassException("Array length limit");
        String name=descriptor.name;Object array;
        switch(name){
            case "[B":array=new byte[length];break;case "[I":array=new int[length];break;case "[J":array=new long[length];break;case "[S":array=new short[length];break;
            case "[C":array=new char[length];break;case "[Z":array=new boolean[length];break;case "[F":array=new float[length];break;case "[D":array=new double[length];break;
            case "[Ljava.lang.String;":array=new String[length];break;case "[Ljava.lang.Object;":array=new Object[length];break;
            default:throw new InvalidClassException(name,"Unsupported array class");
        }
        handle(array);for(int i=0;i<length;i++){
            if(array instanceof byte[])((byte[])array)[i]=input.readByte();else if(array instanceof int[])((int[])array)[i]=input.readInt();else if(array instanceof long[])((long[])array)[i]=input.readLong();
            else if(array instanceof short[])((short[])array)[i]=input.readShort();else if(array instanceof char[])((char[])array)[i]=input.readChar();else if(array instanceof boolean[])((boolean[])array)[i]=input.readBoolean();
            else if(array instanceof float[])((float[])array)[i]=input.readFloat();else if(array instanceof double[])((double[])array)[i]=input.readDouble();else ((Object[])array)[i]=readObject();
        }return array;
    }
    private String longString()throws IOException{
        long size=input.readLong();if(size<0||size>4*1024*1024)throw new StreamCorruptedException("String length limit");byte[] data=new byte[(int)size];input.readFully(data);
        StringBuilder out=new StringBuilder();for(int i=0;i<data.length;){int a=data[i++]&255;if(a<128)out.append((char)a);else if((a&224)==192){if(i>=data.length)throw new UTFDataFormatException();int b=data[i++]&255;if((b&192)!=128)throw new UTFDataFormatException();out.append((char)(((a&31)<<6)|(b&63)));}else if((a&240)==224){if(i+1>=data.length)throw new UTFDataFormatException();int b=data[i++]&255,c=data[i++]&255;if((b&192)!=128||(c&192)!=128)throw new UTFDataFormatException();out.append((char)(((a&15)<<12)|((b&63)<<6)|(c&63)));}else throw new UTFDataFormatException();}return out.toString();
    }
}
