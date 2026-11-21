package com.devinquire.cms.sdk;

import com.devinquire.cms.sdk.model.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Fluent Java Delivery SDK for DevInquire-CMS (AEM / Bloomreach style).
 */
public class DevInquireCmsClient {
    private final CmsClientConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private DevInquireCmsClient(CmsClientConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(config.getConnectTimeout())
                .build();
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    public static Builder builder() {
        return new Builder();
    }

    public List<CmsPage> getPages() throws IOException, InterruptedException {
        JsonNode data = get("/api/v1/content/pages");
        if (data == null || data.isNull()) return Collections.emptyList();
        return objectMapper.convertValue(data, new TypeReference<>() {});
    }

    public CmsPage getPageBySlug(String slug) throws IOException, InterruptedException {
        String encoded = URLEncoder.encode(slug, StandardCharsets.UTF_8);
        JsonNode data = get("/api/v1/content/pages/" + encoded);
        if (data == null || data.isNull()) return null;
        return objectMapper.treeToValue(data, CmsPage.class);
    }

    public CmsSiteConfig getSiteConfig() throws IOException, InterruptedException {
        JsonNode data = get("/api/v1/content/config");
        if (data == null || data.isNull()) return null;
        return objectMapper.treeToValue(data, CmsSiteConfig.class);
    }

    public List<CmsCollection> getCollections() throws IOException, InterruptedException {
        JsonNode data = get("/api/v1/content/collections");
        if (data == null || data.isNull()) return Collections.emptyList();
        return objectMapper.convertValue(data, new TypeReference<>() {});
    }

    public List<CmsCollectionEntry> getCollectionItems(String collectionSlug) throws IOException, InterruptedException {
        String encoded = URLEncoder.encode(collectionSlug, StandardCharsets.UTF_8);
        JsonNode data = get("/api/v1/content/collections/" + encoded + "/items");
        if (data == null || data.isNull()) return Collections.emptyList();
        return objectMapper.convertValue(data, new TypeReference<>() {});
    }

    public CmsCollectionEntry getEntryById(String entryId) throws IOException, InterruptedException {
        String encoded = URLEncoder.encode(entryId, StandardCharsets.UTF_8);
        JsonNode data = get("/api/v1/content/entries/" + encoded);
        if (data == null || data.isNull()) return null;
        return objectMapper.treeToValue(data, CmsCollectionEntry.class);
    }

    private JsonNode get(String path) throws IOException, InterruptedException {
        HttpRequest.Builder req = HttpRequest.newBuilder()
                .uri(URI.create(config.getBaseUrl() + path))
                .timeout(config.getRequestTimeout())
                .header("Accept", "application/json")
                .GET();

        if (config.getApiKey() != null && !config.getApiKey().isBlank()) {
            req.header("Authorization", "Bearer " + config.getApiKey());
        }

        HttpResponse<String> response = httpClient.send(req.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 404) {
            return null;
        }
        if (response.statusCode() >= 400) {
            throw new IOException("DevInquire CMS API error (" + response.statusCode() + "): " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        return root.has("data") ? root.get("data") : root;
    }

    public static class Builder {
        private String baseUrl = "http://localhost:8080";
        private String apiKey;
        private Duration connectTimeout = Duration.ofSeconds(5);
        private Duration requestTimeout = Duration.ofSeconds(15);

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder connectTimeout(Duration connectTimeout) {
            this.connectTimeout = connectTimeout;
            return this;
        }

        public Builder requestTimeout(Duration requestTimeout) {
            this.requestTimeout = requestTimeout;
            return this;
        }

        public DevInquireCmsClient build() {
            return new DevInquireCmsClient(new CmsClientConfig(baseUrl, apiKey, connectTimeout, requestTimeout));
        }
    }
}
