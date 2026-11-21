package com.devinquire.cms.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CmsSection {
    private String id;
    private String name;
    private Map<String, Object> styles;
    private List<CmsBlock> blocks;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Map<String, Object> getStyles() { return styles; }
    public void setStyles(Map<String, Object> styles) { this.styles = styles; }

    public List<CmsBlock> getBlocks() { return blocks; }
    public void setBlocks(List<CmsBlock> blocks) { this.blocks = blocks; }
}
