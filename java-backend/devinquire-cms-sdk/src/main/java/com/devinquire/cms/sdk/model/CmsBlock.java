package com.devinquire.cms.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CmsBlock {
    private String id;
    private String type;
    private Map<String, Object> content;
    private Map<String, Object> styles;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Map<String, Object> getContent() { return content; }
    public void setContent(Map<String, Object> content) { this.content = content; }

    public Map<String, Object> getStyles() { return styles; }
    public void setStyles(Map<String, Object> styles) { this.styles = styles; }
}
