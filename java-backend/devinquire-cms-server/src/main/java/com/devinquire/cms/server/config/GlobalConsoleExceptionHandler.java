package com.devinquire.cms.server.config;

import com.devinquire.cms.server.entity.ConsoleEventEntity;
import com.devinquire.cms.server.repository.ConsoleEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalConsoleExceptionHandler {

    private final ConsoleEventRepository consoleEventRepository;

    public GlobalConsoleExceptionHandler(ConsoleEventRepository consoleEventRepository) {
        this.consoleEventRepository = consoleEventRepository;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnhandledException(Exception ex, HttpServletRequest request) {
        String eventId = "evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        try {
            StringWriter sw = new StringWriter();
            ex.printStackTrace(new PrintWriter(sw));

            ConsoleEventEntity event = new ConsoleEventEntity();
            event.setId(eventId);
            event.setLevel("ERROR");
            event.setSource("BACKEND");
            event.setCategory("EXCEPTION");
            event.setMessage(ex.getClass().getSimpleName() + ": " + (ex.getMessage() != null ? ex.getMessage() : "Unhandled server exception"));
            event.setStackTrace(sw.toString());
            event.setPath(request.getRequestURI());
            event.setMethod(request.getMethod());
            event.setHttpStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            event.setActor(request.getHeader("X-DevInquire-Actor") != null ? request.getHeader("X-DevInquire-Actor") : "system");
            event.setNodePath("/system/exceptions/" + eventId);
            event.setStatus("OPEN");
            event.setCreatedAt(Instant.now());
            consoleEventRepository.save(event);
        } catch (Exception ignored) {
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", ex.getMessage() != null ? ex.getMessage() : "Internal server error",
                "eventId", eventId
        ));
    }
}
