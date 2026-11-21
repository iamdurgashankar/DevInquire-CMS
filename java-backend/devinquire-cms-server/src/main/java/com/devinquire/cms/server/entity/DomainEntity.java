package com.devinquire.cms.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cms_domains")
public class DomainEntity {
    @Id
    private String id;

    @Column(nullable = false, unique = true)
    private String domain;

    private String hostingProvider;
    private String siteName;
    private String baseUrl;
    private boolean connected;
    private boolean dnsVerified;
    private String resolvedIpsJson;
    private boolean active;
    private Instant verifiedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public String getHostingProvider() { return hostingProvider; }
    public void setHostingProvider(String hostingProvider) { this.hostingProvider = hostingProvider; }

    public String getSiteName() { return siteName; }
    public void setSiteName(String siteName) { this.siteName = siteName; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public boolean isConnected() { return connected; }
    public void setConnected(boolean connected) { this.connected = connected; }

    public boolean isDnsVerified() { return dnsVerified; }
    public void setDnsVerified(boolean dnsVerified) { this.dnsVerified = dnsVerified; }

    public String getResolvedIpsJson() { return resolvedIpsJson; }
    public void setResolvedIpsJson(String resolvedIpsJson) { this.resolvedIpsJson = resolvedIpsJson; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }
}
