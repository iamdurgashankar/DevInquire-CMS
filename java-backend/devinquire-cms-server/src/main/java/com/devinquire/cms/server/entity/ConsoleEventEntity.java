package com.devinquire.cms.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cms_console_events")
public class ConsoleEventEntity {
    @Id
    private String id;

    @Column(nullable = false, length = 16)
    private String level; // ERROR, WARN, INFO, DEBUG

    @Column(nullable = false, length = 32)
    private String source; // BACKEND, FRONTEND, SDK, API, SECURITY, SYSTEM

    @Column(length = 64)
    private String category; // EXCEPTION, HTTP_REQUEST, REPOSITORY, AUTH, HEALTH, CLIENT_ERROR

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String stackTrace;

    private String path;
    private String method;
    private Integer httpStatus;
    private Long durationMs;
    private String actor;
    private String nodePath;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String metadataJson;

    @Column(nullable = false, length = 24)
    private String status; // OPEN, ACKNOWLEDGED, RESOLVED

    @Column(nullable = false)
    private Instant createdAt;

    private Instant resolvedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStackTrace() { return stackTrace; }
    public void setStackTrace(String stackTrace) { this.stackTrace = stackTrace; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public Integer getHttpStatus() { return httpStatus; }
    public void setHttpStatus(Integer httpStatus) { this.httpStatus = httpStatus; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getNodePath() { return nodePath; }
    public void setNodePath(String nodePath) { this.nodePath = nodePath; }

    public String getMetadataJson() { return metadataJson; }
    public void setMetadataJson(String metadataJson) { this.metadataJson = metadataJson; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}
