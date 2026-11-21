package com.devinquire.cms.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CmsPage {
    private String id;
    private String title;
    private String slug;
    private String status;
    private String domainId;
    private String domain;
    private String author;
    private Map<String, Object> seo;
    private LayoutPayload layoutJSON;
    private String createdAt;
    private String updatedAt;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LayoutPayload {
        private List<CmsSection> sections;
        private String layoutVersion;

        public List<CmsSection> getSections() { return sections; }
        public void setSections(List<CmsSection> sections) { this.sections = sections; }

        public String getLayoutVersion() { return layoutVersion; }
        public void setLayoutVersion(String layoutVersion) { this.layoutVersion = layoutVersion; }
    }

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

    public Map<String, Object> getSeo() { return seo; }
    public void setSeo(Map<String, Object> seo) { this.seo = seo; }

    public LayoutPayload getLayoutJSON() { return layoutJSON; }
    public void setLayoutJSON(LayoutPayload layoutJSON) { this.layoutJSON = layoutJSON; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
