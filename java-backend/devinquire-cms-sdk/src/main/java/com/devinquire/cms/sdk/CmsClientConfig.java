package com.devinquire.cms.sdk;

import java.time.Duration;

public class CmsClientConfig {
    private final String baseUrl;
    private final String apiKey;
    private final Duration connectTimeout;
    private final Duration requestTimeout;

    public CmsClientConfig(String baseUrl, String apiKey, Duration connectTimeout, Duration requestTimeout) {
        this.baseUrl = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "http://localhost:8080";
        this.apiKey = apiKey;
        this.connectTimeout = connectTimeout != null ? connectTimeout : Duration.ofSeconds(5);
        this.requestTimeout = requestTimeout != null ? requestTimeout : Duration.ofSeconds(15);
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getApiKey() {
        return apiKey;
    }

    public Duration getConnectTimeout() {
        return connectTimeout;
    }

    public Duration getRequestTimeout() {
        return requestTimeout;
    }
}
