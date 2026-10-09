import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;

public final class EnginePlatformTransformTest implements Opcodes {
    private static final String P="org/soloscape/teavm/platform/";
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    public static void main(String[] args)throws Exception{
        Path directory=Files.createTempDirectory("engine-platform-");
        Path input=directory.resolve("in.jar"),output=directory.resolve("out.jar");
        try{
            ClassWriter writer=new ClassWriter(0);
            writer.visit(V1_8,ACC_PUBLIC,"client",null,"java/awt/Panel",null);
            writer.visitField(ACC_PUBLIC,"future","Ljava/util/concurrent/Future;",null,null).visitEnd();
            MethodVisitor tx=writer.visitMethod(ACC_PUBLIC|ACC_STATIC,"tx","()Ljava/lang/ClassLoader;",null,null);
            tx.visitCode();tx.visitInsn(ACONST_NULL);tx.visitInsn(ARETURN);tx.visitMaxs(1,0);tx.visitEnd();
            MethodVisitor logger=writer.visitMethod(ACC_PUBLIC|ACC_STATIC,"logger","()Lorg/slf4j/Logger;",null,null);
            logger.visitCode();logger.visitLdcInsn("fixture");logger.visitMethodInsn(INVOKESTATIC,"org/slf4j/LoggerFactory","getLogger","(Ljava/lang/String;)Lorg/slf4j/Logger;",false);
            logger.visitInsn(ARETURN);logger.visitMaxs(1,0);logger.visitEnd();
            MethodVisitor resource=writer.visitMethod(ACC_PUBLIC|ACC_STATIC,"resource","(Ljava/lang/ClassLoader;Ljava/lang/String;)Ljava/io/InputStream;",null,null);
            resource.visitCode();resource.visitVarInsn(ALOAD,0);resource.visitVarInsn(ALOAD,1);
            resource.visitMethodInsn(INVOKEVIRTUAL,"java/lang/ClassLoader","getResourceAsStream","(Ljava/lang/String;)Ljava/io/InputStream;",false);
            resource.visitInsn(ARETURN);resource.visitMaxs(2,2);resource.visitEnd();writer.visitEnd();
            try(JarOutputStream jar=new JarOutputStream(Files.newOutputStream(input))){
                jar.putNextEntry(new JarEntry("client.class"));jar.write(writer.toByteArray());jar.closeEntry();
                jar.putNextEntry(new JarEntry("fixture-resource"));jar.write(new byte[]{1,2,3});jar.closeEntry();
            }
            AdaptEnginePlatform.main(new String[]{input.toString(),output.toString()});
            try(JarFile jar=new JarFile(output.toFile())){
                ClassNode node=new ClassNode();new ClassReader(jar.getInputStream(jar.getJarEntry("client.class")).readAllBytes()).accept(node,0);
                check(node.superName.equals(P+"awt/Panel"),"AWT superclass");
                check(node.fields.get(0).desc.equals("L"+P+"Future;"),"future descriptor");
                check(node.methods.size()==3,"method retention");
                Map<String,MethodInsnNode> calls=new HashMap<>();
                for(MethodNode method:node.methods)for(AbstractInsnNode instruction:method.instructions)
                    if(instruction instanceof MethodInsnNode)calls.put(method.name,(MethodInsnNode)instruction);
                check(calls.get("tx").owner.equals(P+"BrowserClasses"),"optional loader boundary");
                check(calls.get("logger").owner.equals(P+"BrowserLoggerFactory"),"logging boundary");
                MethodInsnNode stream=calls.get("resource");
                check(stream.getOpcode()==INVOKESTATIC&&stream.owner.equals(P+"BrowserResources")&&stream.desc.equals("(Ljava/lang/Object;Ljava/lang/String;)Ljava/io/InputStream;"),"resource receiver preservation");
                check(Arrays.equals(jar.getInputStream(jar.getJarEntry("fixture-resource")).readAllBytes(),new byte[]{1,2,3}),"resource preservation");
            }
            System.out.println("PASS: platform type/call rewriting retains engine methods and archive resources");
        }finally{Files.deleteIfExists(input);Files.deleteIfExists(output);Files.deleteIfExists(directory);}
    }
}
