package com.devinquire.cms.server.config;

import com.devinquire.cms.server.entity.ConsoleEventEntity;
import com.devinquire.cms.server.repository.ConsoleEventRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Component
public class ConsoleTelemetryFilter extends OncePerRequestFilter {

    private final ConsoleEventRepository consoleEventRepository;

    public ConsoleTelemetryFilter(ConsoleEventRepository consoleEventRepository) {
        this.consoleEventRepository = consoleEventRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String uri = request.getRequestURI();
        // Avoid self-logging console polling reads so the console log stays clean
        if (!uri.startsWith("/api/") || (uri.startsWith("/api/v1/console") && "GET".equalsIgnoreCase(request.getMethod()))) {
            filterChain.doFilter(request, response);
            return;
        }

        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - start;
            int status = response.getStatus();

            // Persist all errors/warnings and non-GET mutations or slow requests
            boolean isIssue = status >= 400;
            boolean isMutation = !"GET".equalsIgnoreCase(request.getMethod()) && !"OPTIONS".equalsIgnoreCase(request.getMethod());
            if (isIssue || isMutation || durationMs > 1000) {
                try {
                    ConsoleEventEntity event = new ConsoleEventEntity();
                    event.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
                    event.setLevel(status >= 500 ? "ERROR" : (status >= 400 ? "WARN" : "INFO"));
                    event.setSource("API");
                    event.setCategory(isIssue ? "HTTP_ERROR" : "HTTP_MUTATION");
                    event.setMessage(request.getMethod() + " " + uri + " responded with HTTP " + status + " (" + durationMs + "ms)");
                    event.setPath(uri);
                    event.setMethod(request.getMethod());
                    event.setHttpStatus(status);
                    event.setDurationMs(durationMs);
                    event.setActor(request.getHeader("X-DevInquire-Actor") != null ? request.getHeader("X-DevInquire-Actor") : "api-client");
                    event.setNodePath(uri.startsWith("/api/v1/content") ? "/content" + uri.substring("/api/v1/content".length()) : "/system/api");
                    event.setStatus(isIssue ? "OPEN" : "RESOLVED");
                    event.setCreatedAt(Instant.now());
                    if (!isIssue) {
                        event.setResolvedAt(Instant.now());
                    }
                    consoleEventRepository.save(event);
                } catch (Exception ignored) {
                    // Never break main request flow due to telemetry persistence
                }
            }
        }
    }
}
