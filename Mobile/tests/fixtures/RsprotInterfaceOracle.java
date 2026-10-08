// Synthetic interoperability proof using the installed revision-240 library.
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import net.rsprot.protocol.game.outgoing.interfaces.*;
import net.rsprot.crypto.cipher.StreamCipher;

class RsprotInterfaceOracle {
    static final int UID=0x12345678;
    static void emit(String name,String type,Object message) throws Exception {
        var encoder=Class.forName("net.rsprot.protocol.game.outgoing.codec.interfaces."+type+"Encoder").getConstructor().newInstance();
        var method=Arrays.stream(encoder.getClass().getMethods()).filter(m->m.getName().startsWith("encode-")&&m.getParameterTypes()[2]==message.getClass()).findFirst().orElseThrow();
        var buffer=Unpooled.buffer();
        try {
            method.invoke(encoder,(StreamCipher)()->0,buffer,message);
            byte[] bytes=new byte[buffer.readableBytes()];buffer.readBytes(bytes);
            System.out.println(name+" "+HexFormat.of().formatHex(bytes));
        } finally {buffer.release();}
    }
    static Object decode(String type,String hex) throws Exception {
        var decoder=Class.forName("net.rsprot.protocol.game.incoming.codec."+type).getConstructor().newInstance();
        var method=Arrays.stream(decoder.getClass().getMethods()).filter(m->m.getName().startsWith("decode-")&&!m.isBridge()).findFirst().orElseThrow();
        var buffer=Unpooled.wrappedBuffer(HexFormat.of().parseHex(hex));
        try {var message=method.invoke(decoder,buffer);if(buffer.isReadable())throw new AssertionError("Button trailing bytes");return message;}
        finally {buffer.release();}
    }
    static void check(Object message,String getter,int expected) throws Exception {
        if(((Number)message.getClass().getMethod(getter).invoke(message)).intValue()!=expected)throw new AssertionError(getter);
    }
    public static void main(String[] args) throws Exception {
        emit("IF_OPENTOP","IfOpenTop",new IfOpenTop(0x1234));
        emit("IF_OPENSUB","IfOpenSub",new IfOpenSub(UID,0x1234,0));
        emit("IF_CLOSESUB","IfCloseSub",new IfCloseSub(UID));
        emit("IF_MOVESUB","IfMoveSub",new IfMoveSub(UID,0xabcdef12));
        emit("IF_SETTEXT","IfSetText",new IfSetText(UID,"Hi"));
        emit("IF_SETHIDE","IfSetHide",new IfSetHide(UID,true));
        emit("IF_SETCOLOUR","IfSetColour",new IfSetColour(UID,0x7c1f));
        emit("IF_SETSCROLLPOS","IfSetScrollPos",new IfSetScrollPos(UID,300));
        emit("IF_SETPOSITION","IfSetPosition",new IfSetPosition(UID,-300,700));
        emit("IF_SETEVENTS_V2","IfSetEventsV2",new IfSetEventsV2(UID,-1,-1,0x01020304,0x05060708));
        emit("IF_RESYNC_V2","IfResyncV2",new IfResyncV2(10,
            List.of(new IfResyncV2.SubInterfaceMessage(UID,11,0)),
            List.of(new IfResyncV2.InterfaceEventsMessage(UID,-1,-1,2,0))));
        var if3=decode("buttons.IfButtonXDecoder",args[0]);
        check(if3,"getCombinedId",UID);check(if3,"getSub",-1);check(if3,"getObj",-1);check(if3,"getOp",1);
        var if1=decode("buttons.If1ButtonDecoder",args[1]);check(if1,"getCombinedId",UID);
        var pause=decode("resumed.ResumePauseButtonDecoder",args[2]);check(pause,"getCombinedId",UID);check(pause,"getSub",-1);
        System.out.println("INTERFACE_ORACLE_PASS");
    }
}
