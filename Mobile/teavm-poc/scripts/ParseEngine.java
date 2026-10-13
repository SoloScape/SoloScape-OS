import java.util.*;
import java.util.jar.*;
import org.teavm.asm.ClassReader;
import org.teavm.asm.tree.ClassNode;
import org.teavm.asm.tree.MethodNode;
import org.teavm.model.ReferenceCache;
import org.teavm.parsing.Parser;

/** Parse every original method, including methods not reachable at startup. */
public final class ParseEngine {
    public static void main(String[] args) throws Exception {
        int classes=0,methods=0,failures=0;
        try(JarFile jar=new JarFile(args[0])) {
            for(JarEntry entry:Collections.list(jar.entries())) if(entry.getName().endsWith(".class")) {
                ClassNode node=new ClassNode();
                new ClassReader(jar.getInputStream(entry).readAllBytes()).accept(node,0); classes++;
                for(MethodNode method:node.methods) {
                    methods++;
                    try { new Parser(new ReferenceCache()).parseMethod(method,node.name); }
                    catch(RuntimeException|AssertionError error) {
                        failures++;
                        if(failures<=20)System.err.println(node.name+"."+method.name+method.desc+": "+error);
                    }
                }
            }
        }
        System.out.println("{\"classes\":"+classes+",\"methods\":"+methods+",\"failures\":"+failures+"}");
        if(failures!=0)System.exit(1);
    }
}
