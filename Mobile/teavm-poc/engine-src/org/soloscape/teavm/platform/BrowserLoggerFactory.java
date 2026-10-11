package org.soloscape.teavm.platform;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.helpers.MarkerIgnoringBase;
import org.slf4j.helpers.MessageFormatter;
import org.slf4j.helpers.FormattingTuple;
import org.teavm.jso.JSBody;

/** SLF4J output goes directly to the browser console without desktop binding discovery. */
public final class BrowserLoggerFactory {
    private static final Map<String, Logger> LOGGERS = new HashMap<>();
    public static synchronized Logger getLogger(String name) {
        Logger logger = LOGGERS.get(name);
        if (logger == null) { logger = new ConsoleLogger(name); LOGGERS.put(name, logger); }
        return logger;
    }
    public static Logger getLogger(Class<?> type) { return getLogger(type.getName()); }
    @JSBody(params={"level","message"}, script="const sink=console[level]||console.log; sink.call(console,message);")
    private static native void output(String level, String message);
    private static final class ConsoleLogger extends MarkerIgnoringBase {
        ConsoleLogger(String loggerName) { name = loggerName; }
        private void log(String level, String message, Throwable error) {
            String details = "";
            if (error != null) {
                java.io.StringWriter writer = new java.io.StringWriter();
                error.printStackTrace(new java.io.PrintWriter(writer)); details = "\n" + writer;
            }
            output(level, "[" + name + "] " + message + details);
        }
        private void format(String level, String message, Object... arguments) {
            FormattingTuple result = MessageFormatter.arrayFormat(message, arguments);
            log(level, result.getMessage(), result.getThrowable());
        }
        public boolean isTraceEnabled() { return true; }
        public void trace(String message) { log("debug", message, null); }
        public void trace(String message, Throwable error) { log("debug", message, error); }
        public void trace(String message, Object a) { format("debug", message, a); }
        public void trace(String message, Object a, Object b) { format("debug", message, a, b); }
        public void trace(String message, Object... args) { format("debug", message, args); }
        public boolean isDebugEnabled() { return true; }
        public void debug(String message) { log("debug", message, null); }
        public void debug(String message, Throwable error) { log("debug", message, error); }
        public void debug(String message, Object a) { format("debug", message, a); }
        public void debug(String message, Object a, Object b) { format("debug", message, a, b); }
        public void debug(String message, Object... args) { format("debug", message, args); }
        public boolean isInfoEnabled() { return true; }
        public void info(String message) { log("info", message, null); }
        public void info(String message, Throwable error) { log("info", message, error); }
        public void info(String message, Object a) { format("info", message, a); }
        public void info(String message, Object a, Object b) { format("info", message, a, b); }
        public void info(String message, Object... args) { format("info", message, args); }
        public boolean isWarnEnabled() { return true; }
        public void warn(String message) { log("warn", message, null); }
        public void warn(String message, Throwable error) { log("warn", message, error); }
        public void warn(String message, Object a) { format("warn", message, a); }
        public void warn(String message, Object a, Object b) { format("warn", message, a, b); }
        public void warn(String message, Object... args) { format("warn", message, args); }
        public boolean isErrorEnabled() { return true; }
        public void error(String message) { log("error", message, null); }
        public void error(String message, Throwable error) { log("error", message, error); }
        public void error(String message, Object a) { format("error", message, a); }
        public void error(String message, Object a, Object b) { format("error", message, a, b); }
        public void error(String message, Object... args) { format("error", message, args); }
    }
}
