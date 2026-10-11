import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import org.objectweb.asm.*;

/**
 * Locally isolates the genuine rev-240 Rasterizer2D method bytecode.
 * Never writes original gamepack classes or binaries to tracked source paths.
 */
public class ExtractRasterizer {
    private static final Set<String> METHODS = new HashSet<>(Arrays.asList("dn(IIII)V","fn(IIIII)V"));
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Need local input gamepack and generated output jar");
        byte[] original;
        try (JarFile input = new JarFile(args[0])) {
            original = input.getInputStream(input.getJarEntry("yw.class")).readAllBytes();
        }
        final Set<String> kept = new HashSet<>();
        ClassWriter output = new ClassWriter(0);
        ClassReader reader = new ClassReader(original);
        reader.accept(new ClassVisitor(Opcodes.ASM9,output){
            @Override public void visit(int version,int access,String name,String sig,String parent,String[] interfaces){
                if (!"yw".equals(name)) throw new IllegalStateException("Wrong class");
                super.visit(version,Opcodes.ACC_PUBLIC|Opcodes.ACC_SUPER,name,null,"java/lang/Object",null);
            }
            @Override public AnnotationVisitor visitAnnotation(String desc,boolean visible){return null;}
            @Override public FieldVisitor visitField(int access,String name,String desc,String sig,Object value){
                // Original static buffers, dimensions and clipping fields unchanged.
                return (access & Opcodes.ACC_STATIC)!=0 ? super.visitField(Opcodes.ACC_PUBLIC|Opcodes.ACC_STATIC,name,desc,null,value) : null;
            }
            @Override public MethodVisitor visitMethod(int access,String name,String desc,String sig,String[] exceptions){
                if(!METHODS.contains(name+desc))return null;
                kept.add(name+desc);
                // ASM copies code and control flow from the original gamepack verbatim.
                return super.visitMethod(Opcodes.ACC_PUBLIC|Opcodes.ACC_STATIC,name,desc,null,null);
            }
        },0);
        if (!kept.equals(METHODS)) throw new IllegalStateException("Pinned Rasterizer2D methods missing: "+kept);
        Path dest=Paths.get(args[1]);Files.createDirectories(dest.getParent());
        try(JarOutputStream jar=new JarOutputStream(Files.newOutputStream(dest))){
            jar.putNextEntry(new JarEntry("yw.class"));
            jar.write(output.toByteArray());
            jar.closeEntry();
        }
        System.out.println("[teavm] Isolated 2 original Rasterizer2D bytecode methods from pinned gamepack (local only).");
    }
}
