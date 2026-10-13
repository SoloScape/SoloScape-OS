import java.nio.file.*;
import java.net.URLClassLoader;
import java.util.jar.*;
import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;

/** Synthetic collision fixture; no gamepack-derived classes or credentials. */
public final class EngineFieldCollisionTest implements Opcodes {
    static byte[] owner() {
        ClassWriter out = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        out.visit(V1_8, ACC_PUBLIC | ACC_SUPER, "FieldCollisionOwner", null, "java/lang/Object", null);
        out.visitField(ACC_PUBLIC, "ls", "Ljava/lang/String;", null, null).visitEnd();
        out.visitField(ACC_PUBLIC, "ls", "Ljava/lang/Integer;", null, null).visitEnd();
        MethodVisitor m = out.visitMethod(ACC_PUBLIC, "<init>", "()V", null, null);
        m.visitCode();
        m.visitVarInsn(ALOAD, 0);
        m.visitMethodInsn(INVOKESPECIAL, "java/lang/Object", "<init>", "()V", false);
        m.visitVarInsn(ALOAD, 0);
        m.visitLdcInsn("real-file");
        m.visitFieldInsn(PUTFIELD, "FieldCollisionOwner", "ls", "Ljava/lang/String;");
        m.visitVarInsn(ALOAD, 0);
        m.visitIntInsn(BIPUSH, 42);
        m.visitMethodInsn(INVOKESTATIC, "java/lang/Integer", "valueOf", "(I)Ljava/lang/Integer;", false);
        m.visitFieldInsn(PUTFIELD, "FieldCollisionOwner", "ls", "Ljava/lang/Integer;");
        m.visitInsn(RETURN); m.visitMaxs(0, 0); m.visitEnd();
        out.visitEnd(); return out.toByteArray();
    }
    static byte[] caller() {
        ClassWriter out = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        out.visit(V1_8, ACC_PUBLIC | ACC_SUPER, "FieldCollisionCaller", null, "java/lang/Object", null);
        MethodVisitor m = out.visitMethod(ACC_PUBLIC | ACC_STATIC, "run", "()Ljava/lang/String;", null, null);
        m.visitCode();
        m.visitTypeInsn(NEW, "FieldCollisionOwner"); m.visitInsn(DUP);
        m.visitMethodInsn(INVOKESPECIAL, "FieldCollisionOwner", "<init>", "()V", false);
        m.visitVarInsn(ASTORE, 0);
        m.visitTypeInsn(NEW, "java/lang/StringBuilder"); m.visitInsn(DUP);
        m.visitMethodInsn(INVOKESPECIAL, "java/lang/StringBuilder", "<init>", "()V", false);
        m.visitVarInsn(ALOAD, 0);
        m.visitFieldInsn(GETFIELD, "FieldCollisionOwner", "ls", "Ljava/lang/String;");
        m.visitMethodInsn(INVOKEVIRTUAL, "java/lang/StringBuilder", "append", "(Ljava/lang/String;)Ljava/lang/StringBuilder;", false);
        m.visitLdcInsn(":");
        m.visitMethodInsn(INVOKEVIRTUAL, "java/lang/StringBuilder", "append", "(Ljava/lang/String;)Ljava/lang/StringBuilder;", false);
        m.visitVarInsn(ALOAD, 0);
        m.visitFieldInsn(GETFIELD, "FieldCollisionOwner", "ls", "Ljava/lang/Integer;");
        m.visitMethodInsn(INVOKEVIRTUAL, "java/lang/StringBuilder", "append", "(Ljava/lang/Object;)Ljava/lang/StringBuilder;", false);
        m.visitMethodInsn(INVOKEVIRTUAL, "java/lang/StringBuilder", "toString", "()Ljava/lang/String;", false);
        m.visitInsn(ARETURN); m.visitMaxs(0, 0); m.visitEnd();
        out.visitEnd(); return out.toByteArray();
    }
    static void write(JarOutputStream jar, String name, byte[] data) throws Exception {
        jar.putNextEntry(new JarEntry(name + ".class")); jar.write(data); jar.closeEntry();
    }
    static String run(Path jarPath) throws Exception {
        try (URLClassLoader loader = new URLClassLoader(new java.net.URL[]{jarPath.toUri().toURL()}, EngineFieldCollisionTest.class.getClassLoader())) {
            return (String) Class.forName("FieldCollisionCaller", true, loader).getMethod("run").invoke(null);
        }
    }
    public static void main(String[] args) throws Exception {
        Path directory = Files.createTempDirectory("soloscape-field-fixture-");
        Path input = directory.resolve("original.jar"), normalized = directory.resolve("normalized.jar");
        try {
            try (JarOutputStream jar = new JarOutputStream(Files.newOutputStream(input))) {
                write(jar, "FieldCollisionOwner", owner());
                write(jar, "FieldCollisionCaller", caller());
            }
            String original = run(input);
            NormalizeEngine.main(new String[]{input.toString(), normalized.toString()});
            String adapted = run(normalized);
            if (!"real-file:42".equals(original) || !original.equals(adapted))
                throw new AssertionError("Collision field references changed: " + original + " / " + adapted);
            try (JarFile jar = new JarFile(normalized.toFile())) {
                ClassNode classNode = new ClassNode(ASM9);
                new ClassReader(jar.getInputStream(jar.getJarEntry("FieldCollisionOwner.class")).readAllBytes())
                    .accept(classNode, ClassReader.SKIP_CODE);
                if (classNode.fields.size() != 2 || classNode.fields.get(0).name.equals(classNode.fields.get(1).name))
                    throw new AssertionError("Descriptor-distinct fields still have same name");
            }
            System.out.println("PASS: duplicate JVM field names remapped across class boundaries; original and normalized values match.");
        } finally {
            Files.deleteIfExists(input); Files.deleteIfExists(normalized); Files.deleteIfExists(directory);
        }
    }
}
