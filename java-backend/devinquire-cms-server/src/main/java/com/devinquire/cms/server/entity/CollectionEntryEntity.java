package com.devinquire.cms.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cms_collection_entries")
public class CollectionEntryEntity {
    @Id
    private String id;

    @Column(nullable = false)
    private String collectionId;

    private String status;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String dataJson;

    private Instant createdAt;
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCollectionId() { return collectionId; }
    public void setCollectionId(String collectionId) { this.collectionId = collectionId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDataJson() { return dataJson; }
    public void setDataJson(String dataJson) { this.dataJson = dataJson; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
