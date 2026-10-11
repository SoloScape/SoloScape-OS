import java.lang.reflect.Method;
import java.lang.reflect.InvocationTargetException;
import java.util.*;
import org.objectweb.asm.*;

/** Synthetic JVM oracle: contains no gamepack code or assets. */
public final class EngineConstantsTest implements Opcodes {
    static int arrays, nulls, strings, failures, errors, linkages;
    public static String[] array() { arrays++; return new String[]{"one", "two"}; }
    public static String nothing() { nulls++; return null; }
    public static String text(long n) { strings++; return "constant-" + n; }
    public static long number(long n) { return n; }
    public static String fail() { failures++; throw new IllegalArgumentException("fixture failure"); }
    public static String error() { errors++; throw new AssertionError("fixture error"); }
    public static String linkage() { linkages++; throw new NoClassDefFoundError("fixture linkage"); }
    public static boolean[] booleans() { return new boolean[]{true,false}; }
    public static Properties[] properties() { Properties p=new Properties();p.setProperty("fixture","value");return new Properties[]{p}; }

    private static final Handle BOOTSTRAP = new Handle(H_INVOKESTATIC,"java/lang/invoke/ConstantBootstraps","invoke",
        "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;",false);
    private static ConstantDynamic constant(String name,String desc,String method,String signature,Object... args) {
        Object[] bootstrap = new Object[args.length+1];
        bootstrap[0] = new Handle(H_INVOKESTATIC,"EngineConstantsTest",method,signature,false);
        System.arraycopy(args,0,bootstrap,1,args.length);
        return new ConstantDynamic(name,desc,BOOTSTRAP,bootstrap);
    }
    private static void getter(ClassWriter out,String name,ConstantDynamic c) {
        MethodVisitor m=out.visitMethod(ACC_PUBLIC|ACC_STATIC,name,"()"+c.getDescriptor(),null,null);
        m.visitCode();m.visitLdcInsn(c);m.visitInsn(Type.getType(c.getDescriptor()).getOpcode(IRETURN));m.visitMaxs(0,0);m.visitEnd();
    }
    private static byte[] fixture() {
        ClassWriter out=new ClassWriter(ClassWriter.COMPUTE_MAXS);
        out.visit(V17,ACC_PUBLIC|ACC_SUPER,"GeneratedConstants",null,"java/lang/Object",null);
        ConstantDynamic array=constant("array","[Ljava/lang/String;","array","()[Ljava/lang/String;");
        getter(out,"array",array);getter(out,"arrayAgain",array);
        getter(out,"nothing",constant("null","Ljava/lang/String;","nothing","()Ljava/lang/String;"));
        getter(out,"number",constant("number","J","number","(J)J",Long.MIN_VALUE));
        getter(out,"fail",constant("fail","Ljava/lang/String;","fail","()Ljava/lang/String;"));
        getter(out,"error",constant("error","Ljava/lang/String;","error","()Ljava/lang/String;"));
        getter(out,"linkage",constant("linkage","Ljava/lang/String;","linkage","()Ljava/lang/String;"));
        getter(out,"booleans",constant("booleans","[Z","booleans","()[Z"));
        getter(out,"properties",constant("properties","[Ljava/util/Properties;","properties","()[Ljava/util/Properties;"));
        ConstantDynamic text=constant("text","Ljava/lang/String;","text","(J)Ljava/lang/String;",7L);
        getter(out,"text",text);
        String desc="(JDLjava/lang/Object;CZ[Ljava/lang/String;)Ljava/lang/String;";
        MethodVisitor m=out.visitMethod(ACC_PUBLIC|ACC_STATIC,"concat",desc,null,null);m.visitCode();
        m.visitVarInsn(LLOAD,0);m.visitVarInsn(DLOAD,2);m.visitVarInsn(ALOAD,4);m.visitVarInsn(ILOAD,5);m.visitVarInsn(ILOAD,6);m.visitVarInsn(ALOAD,7);
        Handle concat=new Handle(H_INVOKESTATIC,"java/lang/invoke/StringConcatFactory","makeConcatWithConstants",
            "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/invoke/MethodType;Ljava/lang/String;[Ljava/lang/Object;)Ljava/lang/invoke/CallSite;",false);
        m.visitInvokeDynamicInsn("makeConcatWithConstants",desc,concat,"prefix\u0002:\u0001|\u0001|\u0001|\u0001|\u0001|\u0001",text);
        m.visitInsn(ARETURN);m.visitMaxs(0,0);m.visitEnd();out.visitEnd();return out.toByteArray();
    }
    private static final class Loader extends ClassLoader {
        Loader() { super(EngineConstantsTest.class.getClassLoader()); }
        Class<?> define(byte[] bytes) { return defineClass("GeneratedConstants",bytes,0,bytes.length); }
    }
    private static Object invoke(Class<?> c,String name) throws Exception { return c.getMethod(name).invoke(null); }
    private static String trace(byte[] bytes) throws Exception {
        arrays=nulls=strings=failures=errors=linkages=0;
        Class<?> c=new Loader().define(bytes);StringBuilder result=new StringBuilder();
        result.append("lazy=").append(arrays+nulls+strings+failures+errors).append(';');
        Object a=invoke(c,"array"),b=invoke(c,"arrayAgain");
        ((String[])a)[0]="mutated";
        result.append("array=").append(a==b).append(':').append(((String[])b)[0]).append(':').append(arrays).append(';');
        result.append("null=").append(invoke(c,"nothing")).append(':').append(invoke(c,"nothing")).append(':').append(nulls).append(';');
        result.append("long=").append(invoke(c,"number")).append(';');
        Object bool=invoke(c,"booleans"),props=invoke(c,"properties");
        result.append("booleans=").append(bool==invoke(c,"booleans")).append(':').append(((boolean[])bool)[0]).append(';');
        result.append("properties=").append(props==invoke(c,"properties")).append(':').append(((Properties[])props)[0].getProperty("fixture")).append(';');
        for(String name:new String[]{"fail","error","linkage"}) for(int n=0;n<2;n++) {
            try { invoke(c,name);throw new AssertionError("Expected failure"); }
            catch(InvocationTargetException e) {
                Throwable error=e.getCause();result.append(name).append('=').append(error.getClass().getName());
                result.append(':').append(error.getCause()==null?"none":error.getCause().getClass().getName()).append(';');
            }
        }
        Method concat=c.getMethod("concat",long.class,double.class,Object.class,char.class,boolean.class,String[].class);
        result.append(concat.invoke(null,Long.MIN_VALUE,Double.POSITIVE_INFINITY,null,'\u03a9',true,null)).append(';');
        result.append(concat.invoke(null,3L,-0.0,"object",'x',false,null)).append(';');
        result.append("text=").append(invoke(c,"text")).append(':').append(strings).append(';');
        result.append("failures=").append(failures).append(':').append(errors).append(':').append(linkages);
        return result.toString();
    }
    public static void main(String[] args) throws Exception {
        byte[] original=fixture();NormalizeEngine tool=new NormalizeEngine();byte[] normalized=tool.transform(original);
        String baseline=trace(original),adapted=trace(normalized);
        if(!baseline.equals(adapted))throw new AssertionError("JVM traces differ\n"+baseline+"\n"+adapted);
        if(tool.constants!=9||tool.loads!=10||tool.concats!=1)throw new AssertionError("Unexpected adaptation counts");
        ClassWriter unsupported=new ClassWriter(ClassWriter.COMPUTE_MAXS);
        unsupported.visit(V17,ACC_PUBLIC|ACC_SUPER,"UnsupportedConstant",null,"java/lang/Object",null);
        getter(unsupported,"wrong",constant("wrong","J","number","(J)J",7)); // requires a conversion we do not implement
        try { new NormalizeEngine().transform(unsupported.toByteArray());throw new AssertionError("Unsupported signature accepted"); }
        catch(IllegalArgumentException expected) {
            if(!expected.getMessage().contains("Unsupported bootstrap argument conversion"))throw expected;
        }
        System.out.println("PASS: original and normalized JVM traces match (lazy arrays, identity, null, long, exceptions, errors and concat)");
    }
}
