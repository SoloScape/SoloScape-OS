package org.soloscape.teavm.platform;

/** Browser classes are linked ahead of time, never loaded from downloaded JARs. */
public final class BrowserClasses {
    private BrowserClasses() { }
    public static ClassLoader engineLoader() {
        String jar = System.getProperty("runelite.reflectcheck.jar");
        if (jar != null && !jar.isEmpty())
            throw new UnsupportedOperationException("External reflectcheck JARs must be compiled into the browser module");
        return BrowserClasses.class.getClassLoader();
    }
}
