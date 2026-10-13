// Test-only interoperability oracle for the installed rsprot 1.0.0-ALPHA-20260912 jars.
// Kotlin inline-value method names contain hyphens, so reflection calls their JVM methods.
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import net.rsprot.protocol.common.client.OldSchoolClientType;
import net.rsprot.protocol.common.loginprot.incoming.codec.GameLoginDecoder;
import net.rsprot.protocol.common.loginprot.incoming.codec.shared.LoginBlockDecoder;
import net.rsprot.protocol.internal.client.ClientTypeMap;
import net.rsprot.protocol.internal.login.LoginCrcDecoder;
import net.rsprot.protocol.loginprot.incoming.codec.DesktopLoginCrcDecoder;
import net.rsprot.protocol.loginprot.incoming.util.LoginBlock;
import net.rsprot.protocol.loginprot.incoming.util.AuthenticationType;
import net.rsprot.protocol.game.outgoing.prot.GameServerProt;

class RsprotLoginOracle {
    static Method method(Class<?> type,String prefix) {
        return Arrays.stream(type.getDeclaredMethods()).filter(m->m.getName().startsWith(prefix)).findFirst().orElseThrow();
    }
    static void require(boolean condition,String message){if(!condition)throw new AssertionError(message);}
    public static void main(String[] args) throws Exception {
        var key=(RSAPrivateKey)KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(Files.readAllBytes(Path.of(args[1]))));
        var decoders=new LoginCrcDecoder[OldSchoolClientType.COUNT];
        decoders[OldSchoolClientType.DESKTOP.getId()]=DesktopLoginCrcDecoder.INSTANCE;
        var decoder=new GameLoginDecoder(List.of(OldSchoolClientType.DESKTOP),key.getPrivateExponent(),key.getModulus(),new ClientTypeMap<>(decoders));
        var frame=Unpooled.wrappedBuffer(Files.readAllBytes(Path.of(args[0])));
        require(frame.readUnsignedByte()==16,"Login opcode");
        require(frame.readUnsignedShort()==frame.readableBytes(),"Login length");
        var header=(LoginBlock.Header)method(LoginBlockDecoder.class,"decodeHeader-").invoke(decoder,frame,List.of(OldSchoolClientType.DESKTOP));
        var decode=method(LoginBlockDecoder.class,"decodeLoginBlock-");decode.setAccessible(true);
        var block=(LoginBlock<?>)decode.invoke(decoder,header,frame,false);
        require(block.getVersion()==240,"Revision");require(block.getClientType().getId()==1,"Client type");
        require(block.getUsername().equals("native-test"),"Username");require(block.getResizable()&&!block.getLowDetail(),"Client settings");
        require(block.getSessionId()==0x123456789abcdef0L,"Server session ID");
        require(Arrays.equals(block.getSeed(),new int[]{1,2,3,4}),"Cipher seed");
        require(block.getWidth()==800&&block.getHeight()==600,"Viewport dimensions");
        var auth=(AuthenticationType.PasswordAuthentication)block.getAuthentication();
        require(auth.getPassword().asString().equals("fixture-only"),"Password authentication");
        require(auth.getOtpAuthentication().getClass().getSimpleName().equals(args[2].equals("otp")?"UntrustedAuthentication":"NoMultiFactorAuthentication"),"OTP type");
        var expected=new int[23];for(int i=0;i<23;i++)expected[i]=0x12340000+i*0x01010101;
        require(Arrays.equals(block.getCrc().toIntArray(),expected),"All 23 mixed-endian cache CRCs");
        require(block.getHostPlatformStats()!=null&&block.getUuid().length==24,"Platform stats and UUID");
        auth.clear();Arrays.fill(block.getSeed(),0);Arrays.fill(block.getUuid(),(byte)0);
        System.out.println("LOGIN_ORACLE_PASS");
        for(var prot:GameServerProt.values())if(prot.getOpcode()>=0)
            System.out.println(prot.getOpcode()+" "+prot.getSize()+" "+prot.name());
    }
}
