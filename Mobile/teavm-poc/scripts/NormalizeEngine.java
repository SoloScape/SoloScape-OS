import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
import org.objectweb.asm.*;
import org.objectweb.asm.tree.*;
import org.objectweb.asm.commons.ClassRemapper;
import org.objectweb.asm.commons.Remapper;

/** Local compiler adaptation, never a substitute for original game methods. */
public final class NormalizeEngine implements Opcodes {
    private static final String PREFIX = "$soloscape$condy$";
    private static final String INVOKE_DESC = "(Ljava/lang/invoke/MethodHandles$Lookup;Ljava/lang/String;Ljava/lang/Class;Ljava/lang/invoke/MethodHandle;[Ljava/lang/Object;)Ljava/lang/Object;";
    public int constants, loads, concats, classes, renamedFields;
    private final Map<String,String> fieldRenames = new HashMap<>();

    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Expected local input jar and local output jar");
        NormalizeEngine tool = new NormalizeEngine();
        Path destination = Paths.get(args[1]);
        Files.createDirectories(destination.toAbsolutePath().getParent());
        Path staging = Files.createTempFile(destination.toAbsolutePath().getParent(), "normalize-", ".jar");
        try {
            try (JarFile input = new JarFile(args[0]); JarOutputStream output = new JarOutputStream(Files.newOutputStream(staging))) {
                // The injected gamepack is valid JVM bytecode but can contain two
                // fields with one name and different descriptors (client.ls).
                // TeaVM emits the two fields under one JS property and corrupts
                // the original java.io.File startup state. Inventory the whole
                // archive before rewriting any cross-class field instructions.
                for (JarEntry entry : Collections.list(input.entries())) {
                    if (entry.getName().endsWith(".class"))
                        tool.inventoryFields(input.getInputStream(entry).readAllBytes());
                }
                for (JarEntry entry : Collections.list(input.entries())) {
                    byte[] bytes = input.getInputStream(entry).readAllBytes();
                    if (entry.getName().endsWith(".class")) {
                        bytes = tool.renameFields(bytes);
                        bytes = tool.transform(bytes);
                    }
                    // A transformed jar cannot retain signatures for its original bytes.
                    if (entry.getName().matches("META-INF/[^/]+\\.(SF|RSA|DSA|EC)")) continue;
                    JarEntry copy = new JarEntry(entry.getName()); copy.setTime(0);
                    output.putNextEntry(copy); output.write(bytes); output.closeEntry();
                }
            }
            Files.move(staging, destination, StandardCopyOption.REPLACE_EXISTING);
        } finally { Files.deleteIfExists(staging); }
        System.out.println("{\"classes\":" + tool.classes + ",\"constants\":" + tool.constants +
            ",\"loads\":" + tool.loads + ",\"concats\":" + tool.concats +
            ",\"renamedFields\":" + tool.renamedFields + "}");
    }

    private static String fieldKey(String owner, String name, String descriptor) {
        return owner + "\\u0000" + name + "\\u0000" + descriptor;
    }

    private void inventoryFields(byte[] bytes) {
        ClassNode owner = new ClassNode(ASM9);
        new ClassReader(bytes).accept(owner, ClassReader.SKIP_CODE | ClassReader.SKIP_DEBUG | ClassReader.SKIP_FRAMES);
        Set<String> used = new HashSet<>(), encountered = new HashSet<>();
        for (FieldNode field : owner.fields) used.add(field.name);
        int id = 0;
        for (FieldNode field : owner.fields) {
            if (encountered.add(field.name)) continue;
            String replacement;
            do { replacement = "$soloscape$unique$field$" + (id++); }
            while (!used.add(replacement));
            String previous = fieldRenames.putIfAbsent(fieldKey(owner.name, field.name, field.desc), replacement);
            if (previous != null) throw new IllegalArgumentException("Duplicate JVM field name+descriptor in " + owner.name);
            renamedFields++;
        }
    }

    private byte[] renameFields(byte[] bytes) {
        if (fieldRenames.isEmpty()) return bytes;
        ClassReader source = new ClassReader(bytes);
        ClassWriter output = new ClassWriter(0);
        source.accept(new ClassRemapper(output, new Remapper() {
            @Override public String mapFieldName(String owner, String name, String descriptor) {
                return fieldRenames.getOrDefault(fieldKey(owner, name, descriptor), name);
            }
        }), 0);
        return output.toByteArray();
    }

    public byte[] transform(byte[] bytes) {
        ClassNode owner = new ClassNode(ASM9);
        new ClassReader(bytes).accept(owner, 0);
        for (FieldNode f : owner.fields) if (f.name.startsWith(PREFIX)) throw new IllegalArgumentException("Generated field collision");
        for (MethodNode m : owner.methods) if (m.name.startsWith(PREFIX)) throw new IllegalArgumentException("Generated method collision");
        // ClassReader reuses the same object for one constant-pool entry. Identity
        // keeps distinct pool entries distinct even if their bootstrap data match.
        IdentityHashMap<ConstantDynamic, Integer> ids = new IdentityHashMap<>();
        List<ConstantDynamic> ordered = new ArrayList<>();
        List<MethodNode> added = new ArrayList<>();
        for (MethodNode method : owner.methods) {
            for (AbstractInsnNode instruction : method.instructions.toArray()) {
                if (instruction instanceof LdcInsnNode && ((LdcInsnNode) instruction).cst instanceof ConstantDynamic) {
                    ConstantDynamic c = (ConstantDynamic) ((LdcInsnNode) instruction).cst;
                    int id = register(c, ids, ordered);
                    method.instructions.set(instruction, call(owner.name, id, c.getDescriptor())); loads++;
                } else if (instruction instanceof InvokeDynamicInsnNode) {
                    InvokeDynamicInsnNode indy = (InvokeDynamicInsnNode) instruction;
                    boolean dynamic = Arrays.stream(indy.bsmArgs).anyMatch(a -> a instanceof ConstantDynamic);
                    if (!dynamic) continue;
                    if (!indy.bsm.getOwner().equals("java/lang/invoke/StringConcatFactory") ||
                        !indy.bsm.getName().equals("makeConcatWithConstants"))
                        throw new IllegalArgumentException("Unsupported dynamic bootstrap argument in " + owner.name + "." + method.name);
                    String name = PREFIX + "concat" + added.size();
                    added.add(concat(owner.name, name, indy, ids, ordered));
                    method.instructions.set(instruction, new MethodInsnNode(INVOKESTATIC, owner.name, name, indy.desc, false)); concats++;
                }
            }
        }
        if (ordered.isEmpty()) return bytes;
        if ((owner.access & ACC_INTERFACE) != 0) throw new IllegalArgumentException("Interface constants need a separate adaptation");
        for (int id = 0; id < ordered.size(); id++) {
            ConstantDynamic c = ordered.get(id);
            owner.fields.add(new FieldNode(ACC_PRIVATE | ACC_STATIC | ACC_SYNTHETIC, field(id,"value"), c.getDescriptor(), null, null));
            owner.fields.add(new FieldNode(ACC_PRIVATE | ACC_STATIC | ACC_SYNTHETIC, field(id,"ready"), "Z", null, null));
            owner.fields.add(new FieldNode(ACC_PRIVATE | ACC_STATIC | ACC_SYNTHETIC, field(id,"error"), "Ljava/lang/Error;", null, null));
            added.add(getter(owner.name, id, c));
        }
        owner.methods.addAll(added); constants += ordered.size(); classes++;
        // Preserve original stack-map frames. Only new straight-line concat and
        // explicitly framed getter methods are added; no hierarchy guessing.
        ClassWriter out = new ClassWriter(ClassWriter.COMPUTE_MAXS);
        owner.accept(out);
        return out.toByteArray();
    }

    private static int register(ConstantDynamic c, IdentityHashMap<ConstantDynamic,Integer> ids, List<ConstantDynamic> ordered) {
        Integer existing = ids.get(c); if (existing != null) return existing;
        Handle bootstrap = c.getBootstrapMethod();
        if (bootstrap.getTag() != H_INVOKESTATIC || !bootstrap.getOwner().equals("java/lang/invoke/ConstantBootstraps") ||
            !bootstrap.getName().equals("invoke") || !bootstrap.getDesc().equals(INVOKE_DESC) ||
            c.getBootstrapMethodArgumentCount() < 1 || !(c.getBootstrapMethodArgument(0) instanceof Handle))
            throw new IllegalArgumentException("Unsupported constant bootstrap: " + bootstrap);
        Handle target = (Handle) c.getBootstrapMethodArgument(0);
        Type[] parameters = Type.getArgumentTypes(target.getDesc());
        if (target.getTag() != H_INVOKESTATIC || target.isInterface() ||
            !Type.getReturnType(target.getDesc()).getDescriptor().equals(c.getDescriptor()) ||
            parameters.length != c.getBootstrapMethodArgumentCount() - 1)
            throw new IllegalArgumentException("Unsupported bootstrap target signature: " + target);
        for (int n=0;n<parameters.length;n++) {
            Object a = c.getBootstrapMethodArgument(n+1);
            boolean exact = parameters[n].equals(Type.LONG_TYPE) && a instanceof Long ||
                parameters[n].equals(Type.INT_TYPE) && a instanceof Integer ||
                parameters[n].equals(Type.FLOAT_TYPE) && a instanceof Float ||
                parameters[n].equals(Type.DOUBLE_TYPE) && a instanceof Double ||
                parameters[n].getDescriptor().equals("Ljava/lang/String;") && a instanceof String;
            if (!exact) throw new IllegalArgumentException("Unsupported bootstrap argument conversion");
        }
        int id = ordered.size(); ids.put(c,id); ordered.add(c); return id;
    }
    private static String field(int id,String suffix) { return PREFIX + id + "$" + suffix; }
    private static MethodInsnNode call(String owner,int id,String desc) {
        return new MethodInsnNode(INVOKESTATIC,owner,field(id,"get"),"()"+desc,false);
    }

    private static MethodNode getter(String owner,int id,ConstantDynamic c) {
        String desc = c.getDescriptor(); Type type = Type.getType(desc);
        MethodNode m = new MethodNode(ASM9, ACC_PRIVATE | ACC_STATIC | ACC_SYNCHRONIZED | ACC_SYNTHETIC,
            field(id,"get"), "()"+desc, null, null);
        Label resolve = new Label(), cached = new Label(), begin = new Label(), end = new Label(), caught = new Label(), wrap = new Label(), error = new Label();
        m.visitCode();
        m.visitFieldInsn(GETSTATIC,owner,field(id,"ready"),"Z"); m.visitJumpInsn(IFEQ,resolve);
        m.visitFieldInsn(GETSTATIC,owner,field(id,"error"),"Ljava/lang/Error;"); m.visitJumpInsn(IFNULL,cached);
        m.visitFieldInsn(GETSTATIC,owner,field(id,"error"),"Ljava/lang/Error;"); m.visitInsn(ATHROW);
        m.visitLabel(cached); m.visitFrame(F_SAME,0,null,0,null);
        m.visitFieldInsn(GETSTATIC,owner,field(id,"value"),desc); m.visitInsn(type.getOpcode(IRETURN));
        m.visitLabel(resolve); m.visitFrame(F_SAME,0,null,0,null);
        m.visitTryCatchBlock(begin,end,caught,"java/lang/Throwable"); m.visitLabel(begin);
        Handle target = (Handle)c.getBootstrapMethodArgument(0);
        for (int n=1;n<c.getBootstrapMethodArgumentCount();n++) m.visitLdcInsn(c.getBootstrapMethodArgument(n));
        m.visitMethodInsn(INVOKESTATIC,target.getOwner(),target.getName(),target.getDesc(),false);
        m.visitFieldInsn(PUTSTATIC,owner,field(id,"value"),desc);
        m.visitLabel(end);
        m.visitInsn(ICONST_1); m.visitFieldInsn(PUTSTATIC,owner,field(id,"ready"),"Z");
        m.visitFieldInsn(GETSTATIC,owner,field(id,"value"),desc); m.visitInsn(type.getOpcode(IRETURN));
        m.visitLabel(caught); m.visitFrame(F_SAME1,0,null,1,new Object[]{"java/lang/Throwable"});
        m.visitVarInsn(ASTORE,0); m.visitVarInsn(ALOAD,0); m.visitTypeInsn(INSTANCEOF,"java/lang/Error"); m.visitJumpInsn(IFEQ,wrap);
        // HotSpot retries non-linkage Errors (e.g. resource exhaustion), while
        // caching LinkageErrors. Match the reference JVM, verified by fixtures.
        m.visitVarInsn(ALOAD,0); m.visitTypeInsn(INSTANCEOF,"java/lang/LinkageError"); m.visitJumpInsn(IFNE,error);
        m.visitVarInsn(ALOAD,0); m.visitInsn(ATHROW);
        m.visitLabel(wrap); m.visitFrame(F_APPEND,1,new Object[]{"java/lang/Throwable"},0,null);
        m.visitTypeInsn(NEW,"java/lang/BootstrapMethodError"); m.visitInsn(DUP); m.visitVarInsn(ALOAD,0);
        m.visitMethodInsn(INVOKESPECIAL,"java/lang/BootstrapMethodError","<init>","(Ljava/lang/Throwable;)V",false); m.visitVarInsn(ASTORE,0);
        m.visitLabel(error); m.visitFrame(F_SAME,0,null,0,null);
        m.visitVarInsn(ALOAD,0); m.visitTypeInsn(CHECKCAST,"java/lang/Error");
        m.visitFieldInsn(PUTSTATIC,owner,field(id,"error"),"Ljava/lang/Error;");
        m.visitInsn(ICONST_1); m.visitFieldInsn(PUTSTATIC,owner,field(id,"ready"),"Z");
        m.visitFieldInsn(GETSTATIC,owner,field(id,"error"),"Ljava/lang/Error;"); m.visitInsn(ATHROW);
        m.visitMaxs(0,0); m.visitEnd(); return m;
    }

    private static MethodNode concat(String owner,String name,InvokeDynamicInsnNode indy,
            IdentityHashMap<ConstantDynamic,Integer> ids,List<ConstantDynamic> ordered) {
        if (!(indy.bsmArgs[0] instanceof String) || !Type.getReturnType(indy.desc).equals(Type.getType(String.class)))
            throw new IllegalArgumentException("Unsupported concat recipe");
        MethodNode m = new MethodNode(ASM9,ACC_PRIVATE|ACC_STATIC|ACC_SYNTHETIC,name,indy.desc,null,null);
        Type[] arguments = Type.getArgumentTypes(indy.desc);
        int[] offsets = new int[arguments.length]; int local = 0;
        for (int n=0;n<arguments.length;n++) { offsets[n]=local; local+=arguments[n].getSize(); }
        Type[] constants = new Type[indy.bsmArgs.length-1]; int[] constantOffsets = new int[constants.length];
        m.visitCode();
        // Resolve all bootstrap constants before converting runtime arguments,
        // matching linkage-before-concatenation ordering.
        for (int n=0;n<constants.length;n++) {
            Object a=indy.bsmArgs[n+1];
            if (a instanceof ConstantDynamic) {
                ConstantDynamic c=(ConstantDynamic)a; int id=register(c,ids,ordered);
                constants[n]=Type.getType(c.getDescriptor());
                m.visitMethodInsn(INVOKESTATIC,owner,field(id,"get"),"()"+c.getDescriptor(),false);
            } else {
                constants[n]=a instanceof String?Type.getType(String.class):a instanceof Integer?Type.INT_TYPE:
                    a instanceof Long?Type.LONG_TYPE:a instanceof Float?Type.FLOAT_TYPE:a instanceof Double?Type.DOUBLE_TYPE:null;
                if(constants[n]==null) throw new IllegalArgumentException("Unsupported concat constant");
                m.visitLdcInsn(a);
            }
            constantOffsets[n]=local; local+=constants[n].getSize(); m.visitVarInsn(constants[n].getOpcode(ISTORE),constantOffsets[n]);
        }
        m.visitTypeInsn(NEW,"java/lang/StringBuilder"); m.visitInsn(DUP);
        m.visitMethodInsn(INVOKESPECIAL,"java/lang/StringBuilder","<init>","()V",false);
        String recipe=(String)indy.bsmArgs[0]; int arg=0,constant=0,start=0;
        for(int n=0;n<=recipe.length();n++) {
            char ch=n==recipe.length()?0:recipe.charAt(n);
            if(n!=recipe.length()&&ch!='\u0001'&&ch!='\u0002')continue;
            if(n>start) {m.visitLdcInsn(recipe.substring(start,n)); append(m,Type.getType(String.class));}
            if(ch=='\u0001') {
                if(arg>=arguments.length)throw new IllegalArgumentException("Concat argument mismatch");
                m.visitVarInsn(arguments[arg].getOpcode(ILOAD),offsets[arg]); append(m,arguments[arg++]);
            } else if(ch=='\u0002') {
                if(constant>=constants.length)throw new IllegalArgumentException("Concat constant mismatch");
                m.visitVarInsn(constants[constant].getOpcode(ILOAD),constantOffsets[constant]); append(m,constants[constant++]);
            }
            start=n+1;
        }
        if(arg!=arguments.length||constant!=constants.length)throw new IllegalArgumentException("Concat recipe mismatch");
        m.visitMethodInsn(INVOKEVIRTUAL,"java/lang/StringBuilder","toString","()Ljava/lang/String;",false);
        m.visitInsn(ARETURN); m.visitMaxs(0,0); m.visitEnd(); return m;
    }
    private static void append(MethodVisitor m,Type type) {
        String desc=type.getDescriptor();
        if(type.getSort()==Type.ARRAY || type.getSort()==Type.OBJECT && !desc.equals("Ljava/lang/String;"))desc="Ljava/lang/Object;";
        if(desc.equals("B")||desc.equals("S"))desc="I";
        m.visitMethodInsn(INVOKEVIRTUAL,"java/lang/StringBuilder","append","("+desc+")Ljava/lang/StringBuilder;",false);
    }
}
