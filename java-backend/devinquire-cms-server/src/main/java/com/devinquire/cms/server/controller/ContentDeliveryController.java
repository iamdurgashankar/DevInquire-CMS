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
    private final SystemSettingRepository systemSettingRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ContentDeliveryController(
            PageRepository pageRepository,
            CollectionRepository collectionRepository,
            CollectionEntryRepository entryRepository,
            SystemSettingRepository systemSettingRepository
    ) {
        this.pageRepository = pageRepository;
        this.collectionRepository = collectionRepository;
        this.entryRepository = entryRepository;
        this.systemSettingRepository = systemSettingRepository;
    }

    @GetMapping("/pages")
    public Map<String, Object> listPublishedPages(
            @RequestParam(required = false) String domainId,
            @RequestParam(required = false) String domain,
            @RequestParam(required = false, defaultValue = "false") boolean includeDrafts
    ) {
        List<PageEntity> baseRows = domainId != null && !domainId.isBlank()
                ? pageRepository.findByDomainId(domainId)
                : pageRepository.findAll();
        List<PageEntity> rows = baseRows.stream()
                .filter(p -> includeDrafts || "published".equals(p.getStatus()))
                .filter(p -> domain == null || domain.isBlank() || (p.getDomain() != null && domain.equalsIgnoreCase(p.getDomain())))
                .toList();
        List<Map<String, Object>> pages = rows.stream().map(this::pageToMap).toList();
        return Map.of("success", true, "data", pages);
    }

    @DeleteMapping("/pages/{id}")
    public Map<String, Object> deletePage(@PathVariable String id) {
        pageRepository.deleteById(id);
        return Map.of("success", true);
    }

    @GetMapping("/pages/{slug}")
    public ResponseEntity<Map<String, Object>> getPageBySlug(
            @PathVariable String slug,
            @RequestParam(required = false) String domain
    ) {
        if (domain != null && !domain.isBlank()) {
            Optional<PageEntity> domainMatch = pageRepository.findFirstBySlugAndDomainIgnoreCaseAndStatus(slug, domain, "published");
            if (domainMatch.isPresent()) {
                return ResponseEntity.ok(Map.of("success", true, "data", pageToMap(domainMatch.get())));
            }
        }
        return pageRepository.findFirstBySlugAndStatus(slug, "published")
                .map(p -> ResponseEntity.ok(Map.<String, Object>of("success", true, "data", pageToMap(p))))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("success", false, "error", "Published page not found")));
    }

    @GetMapping("/site-home")
    public ResponseEntity<Map<String, Object>> getSiteHome(@RequestParam String domain) {
        List<PageEntity> domainPages = pageRepository.findByDomainIgnoreCaseAndStatus(domain, "published");
        Optional<PageEntity> home = domainPages.stream()
                .filter(p -> "home".equalsIgnoreCase(p.getSlug()) || "index".equalsIgnoreCase(p.getSlug()))
                .findFirst()
                .or(() -> domainPages.stream().findFirst());
        return home
                .map(p -> ResponseEntity.ok(Map.<String, Object>of("success", true, "data", pageToMap(p))))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("success", false, "error", "No published home page found for domain")));
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
        entity.setCustomSite(Boolean.TRUE.equals(body.get("isCustomSite")));
        entity.setCustomHtml(body.get("customHTML") != null ? String.valueOf(body.get("customHTML")) : null);
        entity.setCustomCss(body.get("customCSS") != null ? String.valueOf(body.get("customCSS")) : null);
        entity.setCustomJs(body.get("customJS") != null ? String.valueOf(body.get("customJS")) : null);
        if (entity.getCreatedAt() == null) entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        pageRepository.save(entity);
        return Map.of("success", true, "data", pageToMap(entity));
    }

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        Map<String, Object> defaultStyles = Map.of(
                "primaryColor", "#4e45e1",
                "accentColor", "#6B63F2"
        );
        Map<String, Object> defaultConfig = Map.of(
                "siteName", "DevInquire Official",
                "baseUrl", "https://devinquire.com"
        );
        Map<String, Object> styles = systemSettingRepository.findById("global_styles")
                .map(s -> readJson(s.getSettingValue(), defaultStyles))
                .orElse(defaultStyles);
        Map<String, Object> config = systemSettingRepository.findById("site_config")
                .map(s -> readJson(s.getSettingValue(), defaultConfig))
                .orElse(defaultConfig);
        return Map.of(
                "success", true,
                "data", Map.of(
                        "styles", styles,
                        "config", config
                )
        );
    }

    @RequestMapping(value = "/config", method = {RequestMethod.POST, RequestMethod.PUT})
    public Map<String, Object> saveConfig(@RequestBody Map<String, Object> body) throws Exception {
        if (body.get("config") != null) {
            SystemSettingEntity cfgEntity = systemSettingRepository.findById("site_config").orElseGet(SystemSettingEntity::new);
            cfgEntity.setSettingKey("site_config");
            cfgEntity.setSettingValue(objectMapper.writeValueAsString(body.get("config")));
            cfgEntity.setUpdatedAt(Instant.now());
            systemSettingRepository.save(cfgEntity);
        }
        if (body.get("styles") != null) {
            SystemSettingEntity stylesEntity = systemSettingRepository.findById("global_styles").orElseGet(SystemSettingEntity::new);
            stylesEntity.setSettingKey("global_styles");
            stylesEntity.setSettingValue(objectMapper.writeValueAsString(body.get("styles")));
            stylesEntity.setUpdatedAt(Instant.now());
            systemSettingRepository.save(stylesEntity);
        }
        return getConfig();
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

    @DeleteMapping("/collections/{id}")
    public Map<String, Object> deleteCollection(@PathVariable String id) {
        collectionRepository.deleteById(id);
        return Map.of("success", true);
    }

    @GetMapping("/entries")
    public Map<String, Object> listEntries(
            @RequestParam(required = false) String collectionId,
            @RequestParam(required = false) String status
    ) {
        List<CollectionEntryEntity> rows = (collectionId != null && !collectionId.isBlank())
                ? entryRepository.findByCollectionId(collectionId)
                : entryRepository.findAll();
        List<Map<String, Object>> items = rows.stream()
                .filter(e -> status == null || status.isBlank() || status.equalsIgnoreCase(e.getStatus()))
                .map(this::entryToMap)
                .toList();
        return Map.of("success", true, "data", items);
    }

    @PostMapping("/entries")
    public Map<String, Object> upsertEntry(@RequestBody Map<String, Object> body) throws Exception {
        String id = String.valueOf(body.getOrDefault("id", UUID.randomUUID().toString()));
        CollectionEntryEntity entity = entryRepository.findById(id).orElseGet(CollectionEntryEntity::new);
        entity.setId(id);
        entity.setCollectionId(String.valueOf(body.getOrDefault("collectionId", "")));
        entity.setStatus(String.valueOf(body.getOrDefault("status", "draft")));
        entity.setDataJson(objectMapper.writeValueAsString(body.getOrDefault("data", Map.of())));
        if (entity.getCreatedAt() == null) entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());
        entryRepository.save(entity);
        return Map.of("success", true, "data", entryToMap(entity));
    }

    @DeleteMapping("/entries/{id}")
    public Map<String, Object> deleteEntry(@PathVariable String id) {
        entryRepository.deleteById(id);
        return Map.of("success", true);
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
        map.put("isCustomSite", p.isCustomSite());
        if (p.getCustomHtml() != null) map.put("customHTML", p.getCustomHtml());
        if (p.getCustomCss() != null) map.put("customCSS", p.getCustomCss());
        if (p.getCustomJs() != null) map.put("customJS", p.getCustomJs());
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
