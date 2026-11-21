package com.devinquire.cms.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CmsSiteConfig {
    private Map<String, Object> styles;
    private Map<String, Object> config;

    public Map<String, Object> getStyles() { return styles; }
    public void setStyles(Map<String, Object> styles) { this.styles = styles; }

    public Map<String, Object> getConfig() { return config; }
    public void setConfig(Map<String, Object> config) { this.config = config; }
}
