package org.soloscape.teavm.platform;
import java.util.*;
import java.io.*;
import org.teavm.classlib.*;
import org.teavm.model.*;

/** Retain reflection-check targets whose arguments fit the browser wire decoder. */
public final class EngineReflection implements ReflectionSupplier {
    private Set<String> types;
    private boolean engine(ReflectionContext context,String name){
        if(types==null){
            types=new HashSet<>();
            for(String resource:new String[]{"soloscape-engine-reflection-types.txt","soloscape-engine-proof-reflection-types.txt"}){
                try(InputStream stream=context.getClassLoader().getResourceAsStream(resource)){
                    if(stream==null)continue;BufferedReader reader=new BufferedReader(new InputStreamReader(stream,"UTF-8"));String line;
                    while((line=reader.readLine())!=null)if(!line.trim().isEmpty()&&!line.contains("."))types.add(line.trim());
                }catch(IOException error){throw new IllegalStateException("Reflection manifest unavailable",error);}
            }
        }return types.contains(name);
    }
    public boolean isClassFoundByName(ReflectionContext context,String name){return engine(context,name);}
    public Collection<String> getAccessibleFields(ReflectionContext context,String name){
        List<String> result=new ArrayList<>();if(!engine(context,name))return result;
        ClassReader type=context.getClassSource().get(name);if(type!=null)for(FieldReader field:type.getFields())
            if(field.hasModifier(ElementModifier.STATIC)&&field.getType() instanceof ValueType.Primitive)result.add(field.getName());
        return result;
    }
    public Collection<MethodDescriptor> getAccessibleMethods(ReflectionContext context,String name){
        List<MethodDescriptor> result=new ArrayList<>();if(!engine(context,name))return result;
        ClassReader type=context.getClassSource().get(name);if(type==null)return result;
        for(MethodReader method:type.getMethods()){
            if(!method.hasModifier(ElementModifier.STATIC)||method.getName().startsWith("<"))continue;
            boolean supported=true;for(ValueType parameter:method.getParameterTypes())
                if(!(parameter instanceof ValueType.Primitive)&&!parameter.isObject("java.lang.String"))supported=false;
            if(supported)result.add(method.getDescriptor());
        }return result;
    }
}
