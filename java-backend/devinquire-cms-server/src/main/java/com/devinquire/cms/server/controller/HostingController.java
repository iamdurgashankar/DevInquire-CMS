package com.devinquire.cms.server.controller;

import com.devinquire.cms.server.entity.DomainEntity;
import com.devinquire.cms.server.repository.DomainRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.InetAddress;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/hosting")
public class HostingController {

    private final DomainRepository domainRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public HostingController(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        List<Map<String, Object>> domains = domainRepository.findAll().stream().map(this::toDto).toList();
        Map<String, Object> active = domains.stream()
                .filter(d -> Boolean.TRUE.equals(d.get("active")))
                .findFirst()
                .orElse(domains.isEmpty() ? null : domains.get(0));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("domains", domains);
        data.put("activeDomainId", active != null ? active.get("id") : "");
        data.put("activeDomain", active);
        return Map.of("success", true, "data", data);
    }

    @PostMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect(@RequestBody Map<String, Object> body) {
        String rawDomain = String.valueOf(body.getOrDefault("domain", ""))
                .trim()
                .replaceAll("(?i)^https?://", "")
                .replaceAll("/.*$", "")
                .toLowerCase();

        if (!rawDomain.equals("localhost") && !rawDomain.startsWith("localhost:") && !rawDomain.matches("^[a-z0-9.-]+\\.[a-z]{2,}$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Please enter a valid domain name (e.g., devinquire.com or localhost)."
            ));
        }

        String provider = String.valueOf(body.getOrDefault("hostingProvider", "Hostinger")).trim();
        String siteName = String.valueOf(body.getOrDefault("siteName", rawDomain)).trim();

        List<String> resolvedIps = new ArrayList<>();
        boolean dnsVerified = false;
        try {
            for (InetAddress addr : InetAddress.getAllByName(rawDomain)) {
                resolvedIps.add(addr.getHostAddress());
            }
            dnsVerified = !resolvedIps.isEmpty();
        } catch (Exception ignored) {
            dnsVerified = false;
        }

        // Deactivate previous active domains
        List<DomainEntity> all = domainRepository.findAll();
        for (DomainEntity existing : all) {
            existing.setActive(false);
        }
        domainRepository.saveAll(all);

        DomainEntity entity = domainRepository.findByDomain(rawDomain).orElseGet(DomainEntity::new);
        if (entity.getId() == null) {
            entity.setId("dom_" + Long.toString(System.currentTimeMillis(), 36));
        }
        entity.setDomain(rawDomain);
        entity.setHostingProvider(provider);
        entity.setSiteName(siteName);
        entity.setBaseUrl("https://" + rawDomain);
        entity.setConnected(true);
        entity.setDnsVerified(dnsVerified);
        entity.setActive(true);
        entity.setVerifiedAt(Instant.now());
        try {
            entity.setResolvedIpsJson(objectMapper.writeValueAsString(resolvedIps));
        } catch (Exception e) {
            entity.setResolvedIpsJson("[]");
        }
        domainRepository.save(entity);

        return ResponseEntity.ok(status());
    }

    @PostMapping("/select")
    public ResponseEntity<Map<String, Object>> select(@RequestBody Map<String, Object> body) {
        String domainId = String.valueOf(body.getOrDefault("domainId", ""));
        List<DomainEntity> all = domainRepository.findAll();
        boolean found = false;
        for (DomainEntity d : all) {
            boolean match = d.getId().equals(domainId);
            d.setActive(match);
            if (match) found = true;
        }
        if (!found) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Domain not found."));
        }
        domainRepository.saveAll(all);
        return ResponseEntity.ok(status());
    }

    @PostMapping("/delete")
    public Map<String, Object> delete(@RequestBody Map<String, Object> body) {
        String domainId = String.valueOf(body.getOrDefault("domainId", ""));
        domainRepository.deleteById(domainId);
        List<DomainEntity> remaining = domainRepository.findAll();
        if (!remaining.isEmpty() && remaining.stream().noneMatch(DomainEntity::isActive)) {
            remaining.get(0).setActive(true);
            domainRepository.save(remaining.get(0));
        }
        return status();
    }

    private Map<String, Object> toDto(DomainEntity e) {
        List<String> ips = Collections.emptyList();
        try {
            if (e.getResolvedIpsJson() != null) {
                ips = objectMapper.readValue(e.getResolvedIpsJson(), new TypeReference<>() {});
            }
        } catch (Exception ignored) {
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("domain", e.getDomain());
        map.put("hostingProvider", e.getHostingProvider());
        map.put("siteName", e.getSiteName());
        map.put("baseUrl", e.getBaseUrl());
        map.put("connected", e.isConnected());
        map.put("dnsVerified", e.isDnsVerified());
        map.put("resolvedIps", ips);
        map.put("active", e.isActive());
        map.put("verifiedAt", e.getVerifiedAt() != null ? e.getVerifiedAt().toString() : null);
        return map;
    }
}
