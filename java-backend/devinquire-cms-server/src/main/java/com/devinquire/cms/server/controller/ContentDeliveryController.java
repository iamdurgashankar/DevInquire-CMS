package com.devinquire.cms.server.controller;

import com.devinquire.cms.server.entity.*;
import com.devinquire.cms.server.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/content")
public class ContentDeliveryController {

    private final PageRepository pageRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionEntryRepository entryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ContentDeliveryController(
            PageRepository pageRepository,
            CollectionRepository collectionRepository,
            CollectionEntryRepository entryRepository
    ) {
        this.pageRepository = pageRepository;
        this.collectionRepository = collectionRepository;
        this.entryRepository = entryRepository;
    }

    @GetMapping("/pages")
    public Map<String, Object> listPublishedPages(
            @RequestParam(required = false) String domainId,
            @RequestParam(required = false, defaultValue = "false") boolean includeDrafts
    ) {
        List<PageEntity> baseRows = domainId != null && !domainId.isBlank()
                ? pageRepository.findByDomainId(domainId)
                : pageRepository.findAll();
        List<PageEntity> rows = includeDrafts
                ? baseRows
                : baseRows.stream().filter(p -> "published".equals(p.getStatus())).toList();
        List<Map<String, Object>> pages = rows.stream().map(this::pageToMap).toList();
        return Map.of("success", true, "data", pages);
    }

    @DeleteMapping("/pages/{id}")
    public Map<String, Object> deletePage(@PathVariable String id) {
        pageRepository.deleteById(id);
        return Map.of("success", true);
    }

    @GetMapping("/pages/{slug}")
    public ResponseEntity<Map<String, Object>> getPageBySlug(@PathVariable String slug) {
        return pageRepository.findFirstBySlugAndStatus(slug, "published")
                .map(p -> ResponseEntity.ok(Map.<String, Object>of("success", true, "data", pageToMap(p))))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("success", false, "error", "Published page not found")));
    }

    @PostMapping("/pages")
    public Map<String, Object> upsertPage(@RequestBody Map<String, Object> body) throws Exception {
        String id = String.valueOf(body.getOrDefault("id", UUID.randomUUID().toString()));
        PageEntity entity = pageRepository.findById(id).orElseGet(PageEntity::new);
        entity.setId(id);
        entity.setTitle(String.valueOf(body.getOrDefault("title", "Untitled")));
        entity.setSlug(String.valueOf(body.getOrDefault("slug", id)));
        entity.setStatus(String.valueOf(body.getOrDefault("status", "draft")));
        entity.setDomainId(body.get("domainId") != null ? String.valueOf(body.get("domainId")) : null);
        entity.setDomain(body.get("domain") != null ? String.valueOf(body.get("domain")) : null);
        entity.setAuthor(String.valueOf(body.getOrDefault("author", "Admin")));
        entity.setSeoJson(objectMapper.writeValueAsString(body.getOrDefault("seo", Map.of())));
        entity.setLayoutJson(objectMapper.writeValueAsString(body.getOrDefault("layoutJSON", Map.of("sections", List.of()))));
        if (entity.getCreatedAt() == null) entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        pageRepository.save(entity);
        return Map.of("success", true, "data", pageToMap(entity));
    }

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        return Map.of(
                "success", true,
                "data", Map.of(
                        "styles", Map.of("primaryColor", "#4e45e1", "accentColor", "#6B63F2"),
                        "config", Map.of("siteName", "DevInquire Official", "baseUrl", "https://devinquire.com")
                )
        );
    }

    @GetMapping("/collections")
    public Map<String, Object> listCollections() {
        List<Map<String, Object>> cols = collectionRepository.findAll().stream().map(this::collectionToMap).toList();
        return Map.of("success", true, "data", cols);
    }

    @PostMapping("/collections")
    public Map<String, Object> upsertCollection(@RequestBody Map<String, Object> body) throws Exception {
        String id = String.valueOf(body.getOrDefault("id", UUID.randomUUID().toString()));
        CollectionEntity entity = collectionRepository.findById(id).orElseGet(CollectionEntity::new);
        entity.setId(id);
        entity.setName(String.valueOf(body.getOrDefault("name", "Collection")));
        entity.setSlug(String.valueOf(body.getOrDefault("slug", id)));
        entity.setDescription(body.get("description") != null ? String.valueOf(body.get("description")) : "");
        entity.setFieldsJson(objectMapper.writeValueAsString(body.getOrDefault("fields", List.of())));
        collectionRepository.save(entity);
        return Map.of("success", true, "data", collectionToMap(entity));
    }

    @GetMapping("/collections/{collectionSlug}/items")
    public ResponseEntity<Map<String, Object>> listCollectionItems(@PathVariable String collectionSlug) {
        return collectionRepository.findBySlug(collectionSlug)
                .map(col -> {
                    List<Map<String, Object>> items = entryRepository.findByCollectionIdAndStatus(col.getId(), "published")
                            .stream().map(this::entryToMap).toList();
                    return ResponseEntity.ok(Map.<String, Object>of("success", true, "data", items));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("success", false, "error", "Collection not found")));
    }

    @GetMapping("/entries/{entryId}")
    public ResponseEntity<Map<String, Object>> getEntry(@PathVariable String entryId) {
        return entryRepository.findById(entryId)
                .map(e -> ResponseEntity.ok(Map.<String, Object>of("success", true, "data", entryToMap(e))))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("success", false, "error", "Entry not found")));
    }

    private Map<String, Object> pageToMap(PageEntity p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("title", p.getTitle());
        map.put("slug", p.getSlug());
        map.put("status", p.getStatus());
        map.put("domainId", p.getDomainId());
        map.put("domain", p.getDomain());
        map.put("author", p.getAuthor());
        map.put("seo", readJson(p.getSeoJson(), Map.of()));
        map.put("layoutJSON", readJson(p.getLayoutJson(), Map.of()));
        map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        map.put("updatedAt", p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> collectionToMap(CollectionEntity c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId());
        map.put("name", c.getName());
        map.put("slug", c.getSlug());
        map.put("description", c.getDescription());
        map.put("fields", readJson(c.getFieldsJson(), List.of()));
        return map;
    }

    private Map<String, Object> entryToMap(CollectionEntryEntity e) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("collectionId", e.getCollectionId());
        map.put("status", e.getStatus());
        map.put("data", readJson(e.getDataJson(), Map.of()));
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        map.put("updatedAt", e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null);
        return map;
    }

    private <T> T readJson(String json, T fallback) {
        if (json == null || json.isBlank()) return fallback;
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return fallback;
        }
    }
}
