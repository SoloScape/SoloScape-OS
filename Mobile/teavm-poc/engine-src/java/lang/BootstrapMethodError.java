package java.lang;

/** TeaVM's missing standard error type; the host JVM uses its own implementation. */
public class BootstrapMethodError extends LinkageError {
    private static final long serialVersionUID = 292L;
    public BootstrapMethodError() { }
    public BootstrapMethodError(String message) { super(message); }
    public BootstrapMethodError(String message, Throwable cause) {
        super(message);
        initCause(cause);
    }
    public BootstrapMethodError(Throwable cause) {
        super(cause == null ? null : cause.toString());
        initCause(cause);
    }
}
