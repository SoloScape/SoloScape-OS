package org.soloscape.teavm.platform;

import java.util.Objects;
import java.util.function.Function;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;

/** Functional replacement for the engine's pure stack-trace formatter. */
public final class BrowserRegex {
    private BrowserRegex() { }
    public static String replaceAll(Matcher matcher, Function<MatchResult, String> replacer) {
        Objects.requireNonNull(replacer);
        matcher.reset();
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            int start = matcher.start(), end = matcher.end();
            String replacement = replacer.apply(matcher);
            // Detect visible callback mutation. The pinned callback is pure;
            // TeaVM exposes no Matcher modification counter for stronger detection.
            try {
                if (matcher.start() != start || matcher.end() != end)
                    throw new java.util.ConcurrentModificationException();
            } catch (IllegalStateException error) { throw new java.util.ConcurrentModificationException(); }
            matcher.appendReplacement(result, replacement);
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
