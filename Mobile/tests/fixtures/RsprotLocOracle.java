// Synthetic encrypted packet stream decoded with the installed revision-240 library.
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import java.util.Arrays;
import java.util.HexFormat;
import net.rsprot.crypto.cipher.IsaacRandom;
import net.rsprot.protocol.game.incoming.prot.GameClientProt;

class RsprotLocOracle {
    static final int ID=0x1234, X=0x123, Z=0x456;
    static void require(boolean value,String message){if(!value)throw new AssertionError(message);}
    static ByteBuf frame(ByteBuf wire,IsaacRandom cipher,GameClientProt prot){
        int opcode=(wire.readUnsignedByte()-cipher.nextInt())&255;
        require(opcode==prot.getOpcode(),"Expected "+prot+" opcode "+prot.getOpcode()+", received "+opcode);
        int size=prot.getSize();
        if(size==-1)size=wire.readUnsignedByte();
        if(size==-2)size=wire.readUnsignedShort();
        return wire.readSlice(size);
    }
    static Object decode(String type,ByteBuf buffer) throws Exception {
        var decoder=Class.forName("net.rsprot.protocol.game.incoming.codec.locs."+type).getConstructor().newInstance();
        var method=Arrays.stream(decoder.getClass().getMethods())
            .filter(m->m.getName().startsWith("decode-")&&!m.isBridge()).findFirst().orElseThrow();
        var result=method.invoke(decoder,buffer);
        require(!buffer.isReadable(),"Object decoder left trailing bytes");
        return result;
    }
    static int field(Object message,String getter) throws Exception {
        return ((Number)message.getClass().getMethod(getter).invoke(message)).intValue();
    }
    public static void main(String[] args) throws Exception {
        var wire=Unpooled.wrappedBuffer(HexFormat.of().parseHex(args[0]));
        var cipher=new IsaacRandom(new int[]{1,2,3,4});
        int actions=0;
        try{
            for(boolean ctrl:new boolean[]{false,true})for(int subop:new int[]{0,7,255})for(int op=1;op<=5;op++){
                var prot=GameClientProt.valueOf("OPLOC"+op+"_V2");
                require(prot.getSize()==8,"Revision-240 action size");
                var message=decode("OpLoc"+op+"V2Decoder",frame(wire,cipher,prot));
                require(field(message,"getId")==ID,"Object ID");
                require(field(message,"getX")==X&&field(message,"getZ")==Z,"Object coordinates");
                require(field(message,"getOp")==op&&field(message,"getSubop")==subop,"Action/suboption identity");
                require((Boolean)message.getClass().getMethod("getControlKey").invoke(message)==ctrl,"Control key");
                // A following encrypted heartbeat proves that the action consumed
                // exactly its frame and advanced ISAAC once, preserving the stream.
                frame(wire,cipher,GameClientProt.NO_TIMEOUT);
                actions++;
            }
            for(int id:new int[]{0,ID,65535}){
                var message=decode("OpLoc6Decoder",frame(wire,cipher,GameClientProt.OPLOC6));
                require(field(message,"getId")==id,"Examine ID");
                frame(wire,cipher,GameClientProt.NO_TIMEOUT);
            }
            require(!wire.isReadable(),"Encrypted stream has trailing bytes");
            System.out.println("LOC_ORACLE_PASS "+actions+" actions, 3 examines, 33 following heartbeats");
        }finally{wire.release();}
    }
}
