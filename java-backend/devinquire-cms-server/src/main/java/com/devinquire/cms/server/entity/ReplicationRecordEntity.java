package com.devinquire.cms.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cms_replication_records")
public class ReplicationRecordEntity {
    @Id
    private String id;

    @Column(nullable = false)
    private String targetDomain;

    @Column(nullable = false, length = 32)
    private String contentType; // ALL, PAGE, COLLECTION, CONFIG

    private String contentPath;

    @Column(nullable = false, length = 24)
    private String status; // SUCCESS, PENDING, FAILED

    private boolean cacheCleared;
    private long revision;
    private long durationMs;
    private String actor;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private Instant createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTargetDomain() { return targetDomain; }
    public void setTargetDomain(String targetDomain) { this.targetDomain = targetDomain; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public String getContentPath() { return contentPath; }
    public void setContentPath(String contentPath) { this.contentPath = contentPath; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isCacheCleared() { return cacheCleared; }
    public void setCacheCleared(boolean cacheCleared) { this.cacheCleared = cacheCleared; }

    public long getRevision() { return revision; }
    public void setRevision(long revision) { this.revision = revision; }

    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
