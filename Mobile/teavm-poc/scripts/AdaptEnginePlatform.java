import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import java.io.*;
import org.objectweb.asm.*;
import org.objectweb.asm.commons.*;

/** Rewrite platform boundaries in both the client and its public API. */
public final class AdaptEnginePlatform implements Opcodes {
    private static final String PLATFORM = "org/soloscape/teavm/platform/";
    public static void main(String[] args) throws Exception {
        if (args.length != 2 && args.length != 3) throw new IllegalArgumentException("Expected input/output jar and optional reflection type manifest");
        Set<String> reflectionTypes=new TreeSet<>();
        Remapper remapper = new Remapper() {
            @Override public String map(String name) {
                if (name.equals("sun/misc/Unsafe")) return PLATFORM + "HeapMemory";
                if (name.equals("java/io/ObjectInputStream")) return PLATFORM + "BrowserObjectInputStream";
                if (name.equals("java/security/MessageDigest")) return PLATFORM + "BrowserDigest";
                if (name.equals("javax/imageio/ImageIO")) return PLATFORM + "BrowserImageIO";
                if (name.startsWith("javax/sound/sampled/")) return PLATFORM + "audio/" + name.substring(20);
                if (name.equals("java/lang/ProcessHandle") || name.equals("java/lang/ProcessHandle$Info")) return PLATFORM + "BrowserDiagnostics$" + name.substring(10);
                if (name.startsWith("java/lang/management/")) return PLATFORM + "BrowserDiagnostics$" + name.substring(21);
                if (name.startsWith("java/io/") && Arrays.asList("File","RandomAccessFile","FileDescriptor","FileInputStream").contains(name.substring(8))) return PLATFORM + "fs/" + name.substring(8);
                if (name.startsWith("java/nio/file/") && Arrays.asList("Files","Paths","Path").contains(name.substring(14))) return PLATFORM + "fs/" + name.substring(14);
                if (name.startsWith("java/net/") && Arrays.asList("Socket","SocketAddress","InetSocketAddress","InetAddress").contains(name.substring(9))) return PLATFORM + "net/" + name.substring(9);
                if (name.startsWith("javax/net/ssl/") && Arrays.asList("HttpsURLConnection","SSLSocketFactory").contains(name.substring(14))) return PLATFORM + "net/" + name.substring(14);
                if (name.equals("org/slf4j/LoggerFactory")) return PLATFORM + "BrowserLoggerFactory";
                if (name.equals("java/util/concurrent/Executors")) return PLATFORM + "BrowserExecutors";
                if (name.equals("java/util/concurrent/locks/ReentrantLock")) return PLATFORM + "ReentrantLock";
                if (name.equals("java/lang/ThreadGroup")) return PLATFORM + "BrowserThreadGroup";
                if (name.startsWith("java/util/concurrent/") && Arrays.asList("ExecutorService", "Future", "TimeoutException", "ThreadFactory", "ScheduledExecutorService", "ScheduledFuture", "ThreadPoolExecutor", "LinkedBlockingQueue", "Semaphore").contains(name.substring(name.lastIndexOf('/') + 1)))
                    return PLATFORM + name.substring(name.lastIndexOf('/') + 1);
                if (name.startsWith("java/awt/"))
                    return PLATFORM + "awt/" + name.substring(9);
                return name;
            }
        };
        try (JarFile input = new JarFile(args[0]); JarOutputStream output = new JarOutputStream(Files.newOutputStream(Paths.get(args[1])))) {
            for (JarEntry entry : Collections.list(input.entries())) {
                if (entry.getName().matches("META-INF/[^/]+\\.(SF|RSA|DSA|EC)")) continue;
                byte[] bytes = input.getInputStream(entry).readAllBytes();
                if (entry.getName().endsWith(".class")) {
                    reflectionTypes.add(new ClassReader(bytes).getClassName().replace('/','.'));
                    ClassWriter writer = new ClassWriter(ClassWriter.COMPUTE_MAXS);
                    ClassVisitor visitor = new ClassRemapper(writer, remapper) {
                        private String owner;
                        @Override public void visit(int version, int access, String name, String signature, String parent, String[] interfaces) {
                            owner = name;
                            super.visit(version, access, name, signature, "java/lang/Thread".equals(parent) ? PLATFORM + "BrowserThread" : parent, interfaces);
                        }
                        @Override public FieldVisitor visitField(int access, String name, String descriptor, String signature, Object value) {
                            // Only the pinned client's public RSA constants are overridable.
                            // This is needed for the local SoloScape modulus; do not change
                            // the encrypted login algorithm or any other gamepack fields.
                            if (owner.equals("bq") && descriptor.equals("Ljava/math/BigInteger;") &&
                                (name.equals("az") || name.equals("af"))) access &= ~ACC_FINAL;
                            return super.visitField(access, name, descriptor, signature, value);
                        }
                        @Override public MethodVisitor visitMethod(int access, String name, String descriptor, String signature, String[] exceptions) {
                            if(owner.equals("client")&&name.equals("initRLICN")&&(access&ACC_NATIVE)!=0){
                                MethodVisitor body=super.visitMethod(access&~ACC_NATIVE,name,descriptor,signature,exceptions);
                                body.visitCode();body.visitTypeInsn(NEW,"java/lang/UnsatisfiedLinkError");body.visitInsn(DUP);
                                body.visitLdcInsn("RLICN JNI input is unavailable; browser canvas input supplies events");
                                body.visitMethodInsn(INVOKESPECIAL,"java/lang/UnsatisfiedLinkError","<init>","(Ljava/lang/String;)V",false);
                                body.visitInsn(ATHROW);body.visitMaxs(3,1);body.visitEnd();return null;
                            }
                            MethodVisitor next = super.visitMethod(access, name, descriptor, signature, exceptions);
                            if (owner.equals("zw") && name.equals("ux") && descriptor.equals("()Lsun/misc/Unsafe;")) {
                                next.visitCode();next.visitFieldInsn(GETSTATIC,PLATFORM+"HeapMemory","theUnsafe","L"+PLATFORM+"HeapMemory;");next.visitInsn(ARETURN);next.visitMaxs(1,0);next.visitEnd();return null;
                            }
                            // This pinned method only selects the optional reflectcheck JAR loader.
                            if (owner.equals("client") && name.equals("tx") && descriptor.equals("()Ljava/lang/ClassLoader;")) {
                                next.visitCode(); next.visitMethodInsn(INVOKESTATIC, PLATFORM + "BrowserClasses", "engineLoader", descriptor, false);
                                next.visitInsn(ARETURN); next.visitMaxs(1, 0); next.visitEnd(); return null;
                            }
                            return new MethodVisitor(ASM9, next) {
                                @Override public void visitInsn(int opcode) {
                                    // Browser-only rev-240 cache compatibility:
                                    // some untyped opcode-7 location definitions
                                    // return with their original om.ck model IDs
                                    // unset, even though raw cache bytes have them.
                                    // Restore only that missing array at the exit
                                    // of the ORIGINAL constructor. Never modify
                                    // typed models, scene insertion or renderer.
                                    if (opcode == RETURN && owner.equals("om") &&
                                        name.equals("<init>") &&
                                        descriptor.equals("(Lxy;IZ)V")) {
                                        super.visitVarInsn(ALOAD, 0);
                                        super.visitVarInsn(ALOAD, 1);
                                        super.visitFieldInsn(GETFIELD,"xy","aj","[B");
                                        super.visitVarInsn(ALOAD, 0);
                                        super.visitFieldInsn(GETFIELD,"om","ck","[I");
                                        super.visitMethodInsn(INVOKESTATIC,
                                            "BrowserOriginalLocationModels",
                                            "restoreMissingUntypedModels",
                                            "([B[I)[I",false);
                                        super.visitFieldInsn(PUTFIELD,"om","ck","[I");
                                    }
                                    super.visitInsn(opcode);
                                }
                                @Override public void visitTypeInsn(int opcode, String type) {
                                    super.visitTypeInsn(opcode, opcode == NEW && type.equals("java/lang/Thread") ? PLATFORM + "BrowserThread" : type);
                                }
                                @Override public void visitFieldInsn(int opcode, String type, String field, String desc) {
                                    // Only the rev-240 actor hitsplat overlay (au.as) may treat
                                    // missing *optional* sprite segments as zero-sized. Sprite
                                    // pixels and actual drawing stay in the original ym class.
                                    if (owner.equals("au") && name.equals("as") &&
                                        descriptor.equals("(Ldz;Ldh;IIIIIIB)V") &&
                                        opcode == GETFIELD && type.equals("ym") &&
                                        desc.equals("I") &&
                                        (field.equals("aa") || field.equals("ax") || field.equals("ac"))) {
                                        String accessor = field.equals("aa") ? "offsetX" :
                                            field.equals("ax") ? "width" : "height";
                                        super.visitMethodInsn(INVOKESTATIC, "NullSafeHitsplatSprites",
                                            accessor, "(Lym;)I", false);
                                    } else super.visitFieldInsn(opcode, type, field, desc);
                                }
                                @Override public void visitMethodInsn(int opcode, String type, String method, String desc, boolean itf) {
                                    // Combat-only original software sprite draws: an absent
                                    // optional hitsplat graphic must not kill the Java game loop.
                                    // Present sprites invoke the unchanged ym drawing routine.
                                    if (owner.equals("au") && name.equals("as") &&
                                        descriptor.equals("(Ldz;Ldh;IIIIIIB)V") &&
                                        opcode == INVOKEVIRTUAL && type.equals("ym") &&
                                        (method.equals("av") && desc.equals("(II)V") ||
                                         method.equals("am") && desc.equals("(III)V"))) {
                                        String target = method.equals("av") ? "draw" : "drawAlpha";
                                        super.visitMethodInsn(INVOKESTATIC, "NullSafeHitsplatSprites",
                                            target, "(Lym;" + desc.substring(1), false);
                                    } else
                                    // The pinned original engine's NPC menu reads optional
                                    // action slots from the game cache. The first slot may
                                    // be null; on TeaVM, String.equalsIgnoreCase then throws
                                    // a raw JS null-property error and stops the game loop.
                                    // Rewrite only these comparisons in af.fk, not the
                                    // renderer, packets, or general Java string semantics.
                                    if (owner.equals("af") && name.equals("fk") &&
                                        descriptor.equals("(ILpl;IZLdn;Ljava/lang/String;IIIIB)V") &&
                                        opcode == INVOKEVIRTUAL && type.equals("java/lang/String") &&
                                        method.equals("equalsIgnoreCase") &&
                                        desc.equals("(Ljava/lang/String;)Z")) {
                                        super.visitMethodInsn(INVOKESTATIC, PLATFORM+"NullSafeStrings",
                                            "equalsIgnoreCase",
                                            "(Ljava/lang/String;Ljava/lang/String;)Z", false);
                                    } else if (owner.equals("tq") && name.equals("run") &&
                                        opcode == INVOKEVIRTUAL && type.equals("mh") &&
                                        method.equals("ip") && desc.equals("(II)I")) {
                                        // Observe the original cycle clock result and timing,
                                        // without altering how often it runs or its decisions.
                                        super.visitMethodInsn(INVOKESTATIC,"EngineClockProbe",
                                            "sample","(Lmh;II)I",false);
                                    } else if (type.equals("java/lang/System") && Arrays.asList("getenv","load","exit").contains(method)) {
                                        super.visitMethodInsn(INVOKESTATIC,PLATFORM+"BrowserDiagnostics",method,desc,false);
                                    } else if (type.equals("java/lang/Runtime") && method.equals("maxMemory")) {
                                        super.visitMethodInsn(INVOKESTATIC,PLATFORM+"BrowserDiagnostics",method,"(Ljava/lang/Object;)J",false);
                                    } else if (type.equals("java/lang/Class") && method.equals("getSigners")) {
                                        super.visitMethodInsn(INVOKESTATIC,PLATFORM+"BrowserDiagnostics","signers","(Ljava/lang/Class;)[Ljava/lang/Object;",false);
                                    } else if (type.equals("java/lang/reflect/Field") && (method.equals("getInt") || method.equals("setInt"))) {
                                        super.visitMethodInsn(INVOKESTATIC,PLATFORM+"BrowserDiagnostics",method,"(Ljava/lang/reflect/Field;"+desc.substring(1),false);
                                    } else if (type.equals("java/util/Properties") && method.equals("store") && desc.equals("(Ljava/io/Writer;Ljava/lang/String;)V")) {
                                        super.visitMethodInsn(INVOKESTATIC,PLATFORM+"fs/BrowserProperties","store","(Ljava/util/Properties;Ljava/io/Writer;Ljava/lang/String;)V",false);
                                    } else if (type.equals("java/net/URL") && (method.equals("openConnection") || method.equals("openStream"))) {
                                        super.visitMethodInsn(INVOKESTATIC,PLATFORM+"net/BrowserHttp",method.equals("openStream")?"stream":"open","(Ljava/net/URL;)"+Type.getReturnType(desc).getDescriptor(),false);
                                    } else if (type.equals("ql") && method.equals("az") && desc.equals("(I)Lql;")) {
                                        super.visitInsn(POP);super.visitMethodInsn(INVOKESTATIC,PLATFORM+"net/BrowserHttp","sslFactory","()L"+PLATFORM+"net/SSLSocketFactory;",false);
                                    } else if ((type.equals("java/lang/ClassLoader") || type.equals("java/lang/Class")) &&
                                        Arrays.asList("getResourceAsStream", "getResource", "getResources", "getSystemResourceAsStream", "getSystemResource", "getSystemResources").contains(method)) {
                                        String result=Type.getReturnType(desc).getDescriptor();
                                        String adapted=method.equals("getResourceAsStream")?"stream":method.equals("getResource")?"resource":method.equals("getResources")?"resources":method.equals("getSystemResourceAsStream")?"systemStream":method.equals("getSystemResource")?"systemResource":"systemResources";
                                        String receiver=opcode==INVOKESTATIC?"":type.equals("java/lang/Class")?"Ljava/lang/Class;":"Ljava/lang/Object;";
                                        if(type.equals("java/lang/Class"))adapted=method.equals("getResourceAsStream")?"classStream":"classResource";
                                        super.visitMethodInsn(INVOKESTATIC, PLATFORM+"BrowserResources",adapted,"("+receiver+"Ljava/lang/String;)"+result,false);
                                    } else if (type.equals("java/lang/Thread") && method.equals("<init>")) {
                                        super.visitMethodInsn(opcode, PLATFORM + "BrowserThread", method, desc, false);
                                    } else if ((type.equals("java/lang/Thread") || type.equals("java/lang/SecurityManager")) && method.equals("getThreadGroup")) {
                                        super.visitMethodInsn(INVOKESTATIC, PLATFORM + "BrowserThreads", "group", "(Ljava/lang/Object;)L" + PLATFORM + "BrowserThreadGroup;", false);
                                    } else if (type.equals("java/util/regex/Matcher") && method.equals("replaceAll") && desc.equals("(Ljava/util/function/Function;)Ljava/lang/String;")) {
                                        super.visitMethodInsn(INVOKESTATIC, PLATFORM + "BrowserRegex", "replaceAll", "(Ljava/util/regex/Matcher;Ljava/util/function/Function;)Ljava/lang/String;", false);
                                    } else super.visitMethodInsn(opcode, type, method, desc, itf);
                                }
                            };
                        }
                    };
                    new ClassReader(bytes).accept(visitor, 0); bytes = writer.toByteArray();
                }
                JarEntry copy = new JarEntry(entry.getName()); copy.setTime(0); output.putNextEntry(copy); output.write(bytes); output.closeEntry();
            }
        }
        if(args.length==3)Files.write(Paths.get(args[2]),reflectionTypes);
    }
}
