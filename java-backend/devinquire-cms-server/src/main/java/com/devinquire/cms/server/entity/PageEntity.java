package com.devinquire.cms.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cms_pages")
public class PageEntity {
    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String slug;

    private String status;
    private String domainId;
    private String domain;
    private String author;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String seoJson;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String layoutJson;

    private boolean customSite;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String customHtml;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String customCss;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String customJs;

    private Instant createdAt;
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDomainId() { return domainId; }
    public void setDomainId(String domainId) { this.domainId = domainId; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getSeoJson() { return seoJson; }
    public void setSeoJson(String seoJson) { this.seoJson = seoJson; }

    public String getLayoutJson() { return layoutJson; }
    public void setLayoutJson(String layoutJson) { this.layoutJson = layoutJson; }

    public boolean isCustomSite() { return customSite; }
    public void setCustomSite(boolean customSite) { this.customSite = customSite; }

    public String getCustomHtml() { return customHtml; }
    public void setCustomHtml(String customHtml) { this.customHtml = customHtml; }

    public String getCustomCss() { return customCss; }
    public void setCustomCss(String customCss) { this.customCss = customCss; }

    public String getCustomJs() { return customJs; }
    public void setCustomJs(String customJs) { this.customJs = customJs; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
