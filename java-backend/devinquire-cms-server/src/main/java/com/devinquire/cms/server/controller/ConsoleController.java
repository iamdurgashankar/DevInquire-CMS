package com.devinquire.cms.server.controller;

import com.devinquire.cms.server.entity.*;
import com.devinquire.cms.server.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/v1/console")
public class ConsoleController {

    private final ConsoleEventRepository consoleEventRepository;
    private final PageRepository pageRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionEntryRepository entryRepository;
    private final DomainRepository domainRepository;
    private final ReplicationRecordRepository replicationRecordRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final AtomicBoolean autoCacheClean = new AtomicBoolean(true);
    private final AtomicLong cacheEpoch = new AtomicLong(1);
    private volatile Instant lastCacheCleanAt = Instant.now();

    public ConsoleController(
            ConsoleEventRepository consoleEventRepository,
            PageRepository pageRepository,
            CollectionRepository collectionRepository,
            CollectionEntryRepository entryRepository,
            DomainRepository domainRepository,
            ReplicationRecordRepository replicationRecordRepository,
            SystemSettingRepository systemSettingRepository
    ) {
        this.consoleEventRepository = consoleEventRepository;
        this.pageRepository = pageRepository;
        this.collectionRepository = collectionRepository;
        this.entryRepository = entryRepository;
        this.domainRepository = domainRepository;
        this.replicationRecordRepository = replicationRecordRepository;
        this.systemSettingRepository = systemSettingRepository;
    }

    @GetMapping("/overview")
    public Map<String, Object> getOverview() {
        Runtime rt = Runtime.getRuntime();
        long maxMemoryMb = rt.maxMemory() / (1024 * 1024);
        long totalMemoryMb = rt.totalMemory() / (1024 * 1024);
        long freeMemoryMb = rt.freeMemory() / (1024 * 1024);
        long usedMemoryMb = totalMemoryMb - freeMemoryMb;
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        Map<String, Object> jvm = new LinkedHashMap<>();
        jvm.put("javaVersion", System.getProperty("java.version"));
        jvm.put("osName", System.getProperty("os.name"));
        jvm.put("osArch", System.getProperty("os.arch"));
        jvm.put("usedMemoryMb", usedMemoryMb);
        jvm.put("totalMemoryMb", totalMemoryMb);
        jvm.put("maxMemoryMb", maxMemoryMb);
        jvm.put("availableProcessors", rt.availableProcessors());
        jvm.put("activeThreads", Thread.activeCount());
        jvm.put("uptimeSeconds", uptimeMs / 1000);

        Map<String, Object> repositoryStats = new LinkedHashMap<>();
        repositoryStats.put("pages", pageRepository.count());
        repositoryStats.put("collections", collectionRepository.count());
        repositoryStats.put("entries", entryRepository.count());
        repositoryStats.put("domains", domainRepository.count());
        repositoryStats.put("totalEvents", consoleEventRepository.count());
        repositoryStats.put("openIssues", consoleEventRepository.countByStatus("OPEN"));
        repositoryStats.put("openErrors", consoleEventRepository.countByLevelAndStatus("ERROR", "OPEN"));
        repositoryStats.put("openWarnings", consoleEventRepository.countByLevelAndStatus("WARN", "OPEN"));

        Map<String, Object> sdkInfo = new LinkedHashMap<>();
        sdkInfo.put("name", "devinquire-cms-sdk");
        sdkInfo.put("version", "1.0.0");
        sdkInfo.put("runtime", "Java Spring Boot 3.4 / JPA");
        sdkInfo.put("compatibility", List.of("AEM Content Fragment / JCR Tree Model", "Bloomreach Delivery API v1"));

        return Map.of(
                "success", true,
                "data", Map.of(
                        "status", "HEALTHY",
                        "timestamp", Instant.now().toString(),
                        "jvm", jvm,
                        "repository", repositoryStats,
                        "sdk", sdkInfo
                )
        );
    }

    @GetMapping("/events")
    public Map<String, Object> listEvents(
            @RequestParam(name = "level", required = false) String level,
            @RequestParam(name = "source", required = false) String source,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "q", required = false) String q
    ) {
        List<ConsoleEventEntity> all = consoleEventRepository.findTop250ByOrderByCreatedAtDesc();
        List<Map<String, Object>> filtered = all.stream()
                .filter(e -> level == null || level.isBlank() || "ALL".equalsIgnoreCase(level) || level.equalsIgnoreCase(e.getLevel()))
                .filter(e -> source == null || source.isBlank() || "ALL".equalsIgnoreCase(source) || source.equalsIgnoreCase(e.getSource()))
                .filter(e -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || status.equalsIgnoreCase(e.getStatus()))
                .filter(e -> {
                    if (q == null || q.isBlank()) return true;
                    String needle = q.toLowerCase(Locale.ROOT);
                    return (e.getMessage() != null && e.getMessage().toLowerCase(Locale.ROOT).contains(needle))
                            || (e.getPath() != null && e.getPath().toLowerCase(Locale.ROOT).contains(needle))
                            || (e.getNodePath() != null && e.getNodePath().toLowerCase(Locale.ROOT).contains(needle))
                            || (e.getCategory() != null && e.getCategory().toLowerCase(Locale.ROOT).contains(needle));
                })
                .map(this::eventToMap)
                .toList();

        return Map.of("success", true, "data", filtered);
    }

    @PostMapping("/events")
    public Map<String, Object> logEvent(@RequestBody Map<String, Object> body) throws Exception {
        ConsoleEventEntity event = new ConsoleEventEntity();
        event.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        event.setLevel(String.valueOf(body.getOrDefault("level", "INFO")).toUpperCase(Locale.ROOT));
        event.setSource(String.valueOf(body.getOrDefault("source", "FRONTEND")).toUpperCase(Locale.ROOT));
        event.setCategory(String.valueOf(body.getOrDefault("category", "CLIENT_EVENT")));
        event.setMessage(String.valueOf(body.getOrDefault("message", "Event recorded")));
        event.setStackTrace(body.get("stackTrace") != null ? String.valueOf(body.get("stackTrace")) : null);
        event.setPath(body.get("path") != null ? String.valueOf(body.get("path")) : null);
        event.setMethod(body.get("method") != null ? String.valueOf(body.get("method")) : null);
        if (body.get("httpStatus") instanceof Number n) {
            event.setHttpStatus(n.intValue());
        }
        if (body.get("durationMs") instanceof Number n) {
            event.setDurationMs(n.longValue());
        }
        event.setActor(body.get("actor") != null ? String.valueOf(body.get("actor")) : "admin");
        event.setNodePath(body.get("nodePath") != null ? String.valueOf(body.get("nodePath")) : "/content/console");
        if (body.get("metadata") != null) {
            event.setMetadataJson(objectMapper.writeValueAsString(body.get("metadata")));
        }
        String defaultStatus = ("ERROR".equals(event.getLevel()) || "WARN".equals(event.getLevel())) ? "OPEN" : "RESOLVED";
        event.setStatus(String.valueOf(body.getOrDefault("status", defaultStatus)).toUpperCase(Locale.ROOT));
        event.setCreatedAt(Instant.now());
        if ("RESOLVED".equals(event.getStatus())) {
            event.setResolvedAt(Instant.now());
        }
        consoleEventRepository.save(event);
        return Map.of("success", true, "data", eventToMap(event));
    }

    @PatchMapping("/events/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable("id") String id,
            @RequestBody Map<String, Object> body
    ) {
        return consoleEventRepository.findById(id)
                .map(event -> {
                    String newStatus = String.valueOf(body.getOrDefault("status", "RESOLVED")).toUpperCase(Locale.ROOT);
                    event.setStatus(newStatus);
                    event.setResolvedAt("RESOLVED".equals(newStatus) ? Instant.now() : null);
                    consoleEventRepository.save(event);
                    return ResponseEntity.ok(Map.<String, Object>of("success", true, "data", eventToMap(event)));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("success", false, "error", "Console event not found")));
    }

    @DeleteMapping("/events/resolved")
    public Map<String, Object> purgeResolved() {
        long deleted = consoleEventRepository.deleteByStatus("RESOLVED");
        return Map.of("success", true, "deleted", deleted);
    }

    @PostMapping("/diagnostics/run")
    public Map<String, Object> runDiagnostics(@RequestBody(required = false) Map<String, Object> body) {
        long start = System.currentTimeMillis();
        long pageCount = pageRepository.count();
        long collectionCount = collectionRepository.count();
        long entryCount = entryRepository.count();
        long domainCount = domainRepository.count();
        long dbLatencyMs = System.currentTimeMillis() - start;

        ConsoleEventEntity event = new ConsoleEventEntity();
        event.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        event.setLevel("INFO");
        event.setSource("SYSTEM");
        event.setCategory("DIAGNOSTICS");
        event.setMessage("Full system & repository diagnostics passed (" + dbLatencyMs + "ms): "
                + pageCount + " pages, " + collectionCount + " collections, "
                + entryCount + " entries, " + domainCount + " domains.");
        event.setPath("/api/v1/console/diagnostics/run");
        event.setMethod("POST");
        event.setHttpStatus(200);
        event.setDurationMs(dbLatencyMs);
        event.setActor(body != null && body.get("actor") != null ? String.valueOf(body.get("actor")) : "admin");
        event.setNodePath("/system/diagnostics");
        event.setStatus("RESOLVED");
        event.setCreatedAt(Instant.now());
        event.setResolvedAt(Instant.now());
        consoleEventRepository.save(event);

        return Map.of(
                "success", true,
                "data", Map.of(
                        "dbLatencyMs", dbLatencyMs,
                        "dbHealthy", true,
                        "counts", Map.of(
                                "pages", pageCount,
                                "collections", collectionCount,
                                "entries", entryCount,
                                "domains", domainCount
                        ),
                        "event", eventToMap(event)
                )
        );
    }

    @GetMapping("/repository")
    public Map<String, Object> inspectRepository() {
        List<Map<String, Object>> pageNodes = pageRepository.findAll().stream().map(p -> {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("path", "/content/pages/" + p.getSlug());
            node.put("id", p.getId());
            node.put("primaryType", "dq:Page");
            node.put("title", p.getTitle());
            node.put("status", p.getStatus());
            node.put("author", p.getAuthor());
            node.put("domain", p.getDomain());
            node.put("updatedAt", p.getUpdatedAt() != null ? p.getUpdatedAt().toString() : null);
            return node;
        }).toList();

        List<Map<String, Object>> collectionNodes = collectionRepository.findAll().stream().map(c -> {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("path", "/content/collections/" + c.getSlug());
            node.put("id", c.getId());
            node.put("primaryType", "dq:Collection");
            node.put("name", c.getName());
            node.put("description", c.getDescription());
            node.put("publishedEntryCount", entryRepository.findByCollectionIdAndStatus(c.getId(), "published").size());
            return node;
        }).toList();

        List<Map<String, Object>> domainNodes = domainRepository.findAll().stream().map(d -> {
            Map<String, Object> node = new LinkedHashMap<>();
            node.put("path", "/etc/domains/" + d.getDomain());
            node.put("id", d.getId());
            node.put("primaryType", "dq:DomainConfig");
            node.put("domain", d.getDomain());
            node.put("hostingProvider", d.getHostingProvider());
            node.put("connected", d.isConnected());
            node.put("dnsVerified", d.isDnsVerified());
            return node;
        }).toList();

        return Map.of(
                "success", true,
                "data", Map.of(
                        "root", "/content",
                        "nodes", Map.of(
                                "pages", pageNodes,
                                "collections", collectionNodes,
                                "domains", domainNodes
                        )
                )
        );
    }

    @GetMapping("/database/status")
    public Map<String, Object> getDatabaseStatus() {
        long start = System.currentTimeMillis();
        long pageCount = pageRepository.count();
        long collectionCount = collectionRepository.count();
        long entryCount = entryRepository.count();
        long domainCount = domainRepository.count();
        long eventCount = consoleEventRepository.count();
        long replicationCount = replicationRecordRepository.count();
        long latencyMs = System.currentTimeMillis() - start;

        String lastResyncAt = consoleEventRepository.findTop250ByOrderByCreatedAtDesc().stream()
                .filter(e -> "DB_RESYNC".equalsIgnoreCase(e.getCategory()))
                .map(ConsoleEventEntity::getCreatedAt)
                .filter(Objects::nonNull)
                .findFirst()
                .map(Instant::toString)
                .orElse(null);

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("pages", pageCount);
        counts.put("collections", collectionCount);
        counts.put("entries", entryCount);
        counts.put("domains", domainCount);
        counts.put("events", eventCount);
        counts.put("replications", replicationCount);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("connected", true);
        data.put("engine", "H2 Embedded (JPA / Hibernate)");
        data.put("latencyMs", latencyMs);
        data.put("lastResyncAt", lastResyncAt);
        data.put("counts", counts);

        return Map.of("success", true, "data", data);
    }

    @PostMapping("/database/resync")
    @SuppressWarnings("unchecked")
    public Map<String, Object> resyncDatabase(@RequestBody(required = false) Map<String, Object> body) throws Exception {
        long start = System.currentTimeMillis();
        String mode = body != null && body.get("mode") != null
                ? String.valueOf(body.get("mode")).toUpperCase(Locale.ROOT)
                : "MERGE";
        if (!List.of("MERGE", "PUSH", "PULL").contains(mode)) {
            mode = "MERGE";
        }
        String actor = body != null && body.get("actor") != null
                ? String.valueOf(body.get("actor"))
                : "admin";

        int pushedPages = 0;
        int pushedCollections = 0;
        int pushedEntries = 0;

        if (("PUSH".equals(mode) || "MERGE".equals(mode)) && body != null) {
            if (body.get("pages") instanceof List<?> rawPages) {
                for (Object item : rawPages) {
                    if (!(item instanceof Map<?, ?> pMap)) continue;
                    String id = pMap.get("id") != null ? String.valueOf(pMap.get("id")) : null;
                    if (id == null || id.isBlank()) continue;
                    PageEntity entity = pageRepository.findById(id).orElseGet(PageEntity::new);
                    entity.setId(id);
                    entity.setTitle(pMap.get("title") != null ? String.valueOf(pMap.get("title")) : "Untitled");
                    entity.setSlug(pMap.get("slug") != null ? String.valueOf(pMap.get("slug")) : id);
                    entity.setStatus(pMap.get("status") != null ? String.valueOf(pMap.get("status")) : "draft");
                    entity.setDomainId(pMap.get("domainId") != null ? String.valueOf(pMap.get("domainId")) : null);
                    entity.setDomain(pMap.get("domain") != null ? String.valueOf(pMap.get("domain")) : null);
                    entity.setAuthor(pMap.get("author") != null ? String.valueOf(pMap.get("author")) : "Admin");
                    entity.setSeoJson(objectMapper.writeValueAsString(pMap.get("seo") != null ? pMap.get("seo") : Map.of()));
                    entity.setLayoutJson(objectMapper.writeValueAsString(pMap.get("layoutJSON") != null ? pMap.get("layoutJSON") : Map.of("sections", List.of())));
                    if (entity.getCreatedAt() == null) entity.setCreatedAt(Instant.now());
                    entity.setUpdatedAt(Instant.now());
                    pageRepository.save(entity);
                    pushedPages++;
                }
            }

            if (body.get("collections") instanceof List<?> rawCols) {
                for (Object item : rawCols) {
                    if (!(item instanceof Map<?, ?> cMap)) continue;
                    String id = cMap.get("id") != null ? String.valueOf(cMap.get("id")) : null;
                    if (id == null || id.isBlank()) continue;
                    CollectionEntity entity = collectionRepository.findById(id).orElseGet(CollectionEntity::new);
                    entity.setId(id);
                    entity.setName(cMap.get("name") != null ? String.valueOf(cMap.get("name")) : "Collection");
                    entity.setSlug(cMap.get("slug") != null ? String.valueOf(cMap.get("slug")) : id);
                    entity.setDescription(cMap.get("description") != null ? String.valueOf(cMap.get("description")) : "");
                    entity.setFieldsJson(objectMapper.writeValueAsString(cMap.get("fields") != null ? cMap.get("fields") : List.of()));
                    collectionRepository.save(entity);
                    pushedCollections++;
                }
            }

            if (body.get("entries") instanceof List<?> rawEntries) {
                for (Object item : rawEntries) {
                    if (!(item instanceof Map<?, ?> eMap)) continue;
                    String id = eMap.get("id") != null ? String.valueOf(eMap.get("id")) : null;
                    if (id == null || id.isBlank()) continue;
                    CollectionEntryEntity entity = entryRepository.findById(id).orElseGet(CollectionEntryEntity::new);
                    entity.setId(id);
                    entity.setCollectionId(eMap.get("collectionId") != null ? String.valueOf(eMap.get("collectionId")) : "");
                    entity.setStatus(eMap.get("status") != null ? String.valueOf(eMap.get("status")) : "draft");
                    entity.setDataJson(objectMapper.writeValueAsString(eMap.get("data") != null ? eMap.get("data") : Map.of()));
                    if (entity.getCreatedAt() == null) entity.setCreatedAt(Instant.now());
                    entity.setUpdatedAt(Instant.now());
                    entryRepository.save(entity);
                    pushedEntries++;
                }
            }
        }

        List<Map<String, Object>> dbPages = pageRepository.findAll().stream().map(this::pageToSnapshotMap).toList();
        List<Map<String, Object>> dbCollections = collectionRepository.findAll().stream().map(this::collectionToSnapshotMap).toList();
        List<Map<String, Object>> dbEntries = entryRepository.findAll().stream().map(this::entryToSnapshotMap).toList();
        List<Map<String, Object>> dbDomains = domainRepository.findAll().stream().map(this::domainToSnapshotMap).toList();

        long durationMs = System.currentTimeMillis() - start;
        Instant syncedAt = Instant.now();

        ConsoleEventEntity evt = new ConsoleEventEntity();
        evt.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        evt.setLevel("INFO");
        evt.setSource("SYSTEM");
        evt.setCategory("DB_RESYNC");
        evt.setMessage("Database re-sync (" + mode + ") completed in " + durationMs + "ms: "
                + dbPages.size() + " pages, " + dbCollections.size() + " collections, "
                + dbEntries.size() + " entries, " + dbDomains.size() + " domains.");
        evt.setPath("/api/v1/console/database/resync");
        evt.setMethod("POST");
        evt.setHttpStatus(200);
        evt.setDurationMs(durationMs);
        evt.setActor(actor);
        evt.setNodePath("/system/database/resync");
        evt.setStatus("RESOLVED");
        evt.setCreatedAt(syncedAt);
        evt.setResolvedAt(syncedAt);
        consoleEventRepository.save(evt);

        Map<String, Object> pushed = new LinkedHashMap<>();
        pushed.put("pages", pushedPages);
        pushed.put("collections", pushedCollections);
        pushed.put("entries", pushedEntries);

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("pages", dbPages.size());
        counts.put("collections", dbCollections.size());
        counts.put("entries", dbEntries.size());
        counts.put("domains", dbDomains.size());

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("pages", dbPages);
        snapshot.put("collections", dbCollections);
        snapshot.put("entries", dbEntries);
        snapshot.put("domains", dbDomains);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", mode);
        result.put("syncedAt", syncedAt.toString());
        result.put("durationMs", durationMs);
        result.put("pushed", pushed);
        result.put("counts", counts);
        result.put("snapshot", snapshot);

        return Map.of("success", true, "data", result);
    }

    @GetMapping("/replication")
    public Map<String, Object> getReplicationStatus() {
        List<PageEntity> pages = pageRepository.findAll();
        long publishedCount = pages.stream().filter(p -> "published".equalsIgnoreCase(p.getStatus())).count();
        long draftCount = pages.size() - publishedCount;
        Instant latestContentUpdate = pages.stream()
                .map(PageEntity::getUpdatedAt)
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);

        List<ReplicationRecordEntity> history = replicationRecordRepository.findTop50ByOrderByCreatedAtDesc();
        Instant lastReplicatedAt = history.stream()
                .filter(r -> "SUCCESS".equalsIgnoreCase(r.getStatus()))
                .map(ReplicationRecordEntity::getCreatedAt)
                .findFirst()
                .orElse(null);

        boolean upToDate = latestContentUpdate == null
                || (lastReplicatedAt != null && !latestContentUpdate.isAfter(lastReplicatedAt));

        List<Map<String, Object>> historyRows = history.stream().map(this::replicationToMap).toList();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("liveStatus", upToDate ? "LIVE_UP_TO_DATE" : "PENDING_REPLICATION");
        data.put("autoCacheClean", autoCacheClean.get());
        data.put("cacheEpoch", cacheEpoch.get());
        data.put("lastCacheCleanAt", lastCacheCleanAt != null ? lastCacheCleanAt.toString() : null);
        data.put("lastReplicatedAt", lastReplicatedAt != null ? lastReplicatedAt.toString() : null);
        data.put("latestContentUpdateAt", latestContentUpdate != null ? latestContentUpdate.toString() : null);
        data.put("publishedPages", publishedCount);
        data.put("draftPages", draftCount);
        data.put("collections", collectionRepository.count());
        data.put("domains", domainRepository.count());
        data.put("history", historyRows);

        return Map.of("success", true, "data", data);
    }

    @PostMapping("/replication/replicate")
    public Map<String, Object> replicateContent(@RequestBody(required = false) Map<String, Object> body) {
        long start = System.currentTimeMillis();
        String targetDomain = body != null && body.get("targetDomain") != null
                ? String.valueOf(body.get("targetDomain"))
                : "all-connected-domains";
        String contentType = body != null && body.get("contentType") != null
                ? String.valueOf(body.get("contentType")).toUpperCase(Locale.ROOT)
                : "ALL";
        String contentPath = body != null && body.get("contentPath") != null
                ? String.valueOf(body.get("contentPath"))
                : "/content/*";
        String actor = body != null && body.get("actor") != null
                ? String.valueOf(body.get("actor"))
                : "admin";

        long publishedPages = pageRepository.findAll().stream()
                .filter(p -> "published".equalsIgnoreCase(p.getStatus()))
                .count();
        long collectionCount = collectionRepository.count();

        boolean shouldCleanCache = autoCacheClean.get();
        long revision = shouldCleanCache ? cacheEpoch.incrementAndGet() : cacheEpoch.get();
        if (shouldCleanCache) {
            lastCacheCleanAt = Instant.now();
        }

        String webhookSummary = dispatchReplicationWebhook(targetDomain, contentType, contentPath, revision, shouldCleanCache, actor);
        long durationMs = System.currentTimeMillis() - start;

        ReplicationRecordEntity record = new ReplicationRecordEntity();
        record.setId("rep_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        record.setTargetDomain(targetDomain);
        record.setContentType(contentType);
        record.setContentPath(contentPath);
        record.setStatus("SUCCESS");
        record.setCacheCleared(shouldCleanCache);
        record.setRevision(revision);
        record.setDurationMs(durationMs);
        record.setActor(actor);
        record.setMessage("Replicated " + publishedPages + " published page(s) and " + collectionCount
                + " collection(s) to " + targetDomain
                + (shouldCleanCache ? " with Auto Cache Clean (epoch v" + revision + ")." : ".")
                + (webhookSummary != null ? " " + webhookSummary : ""));
        record.setCreatedAt(Instant.now());
        replicationRecordRepository.save(record);

        ConsoleEventEntity evt = new ConsoleEventEntity();
        evt.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        evt.setLevel("INFO");
        evt.setSource("SYSTEM");
        evt.setCategory("REPLICATION");
        evt.setMessage(record.getMessage());
        evt.setPath("/api/v1/console/replication/replicate");
        evt.setMethod("POST");
        evt.setHttpStatus(200);
        evt.setDurationMs(durationMs);
        evt.setActor(actor);
        evt.setNodePath(contentPath);
        evt.setStatus("RESOLVED");
        evt.setCreatedAt(Instant.now());
        evt.setResolvedAt(Instant.now());
        consoleEventRepository.save(evt);

        return Map.of("success", true, "data", replicationToMap(record));
    }

    @PostMapping("/cache/clean")
    public Map<String, Object> cleanCache(@RequestBody(required = false) Map<String, Object> body) {
        String actor = body != null && body.get("actor") != null
                ? String.valueOf(body.get("actor"))
                : "admin";
        long newEpoch = cacheEpoch.incrementAndGet();
        lastCacheCleanAt = Instant.now();

        ConsoleEventEntity evt = new ConsoleEventEntity();
        evt.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        evt.setLevel("INFO");
        evt.setSource("SYSTEM");
        evt.setCategory("CACHE_CLEAN");
        evt.setMessage("Purged application & CDN delivery cache (cache epoch bumped to v" + newEpoch + ").");
        evt.setPath("/api/v1/console/cache/clean");
        evt.setMethod("POST");
        evt.setHttpStatus(200);
        evt.setActor(actor);
        evt.setNodePath("/system/cache");
        evt.setStatus("RESOLVED");
        evt.setCreatedAt(Instant.now());
        evt.setResolvedAt(Instant.now());
        consoleEventRepository.save(evt);

        return Map.of(
                "success", true,
                "data", Map.of(
                        "cacheEpoch", newEpoch,
                        "lastCacheCleanAt", lastCacheCleanAt.toString()
                )
        );
    }

    @PatchMapping("/cache/auto-clean")
    public Map<String, Object> setAutoCacheClean(@RequestBody Map<String, Object> body) {
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        autoCacheClean.set(enabled);
        String actor = body.get("actor") != null ? String.valueOf(body.get("actor")) : "admin";

        ConsoleEventEntity evt = new ConsoleEventEntity();
        evt.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        evt.setLevel("INFO");
        evt.setSource("SYSTEM");
        evt.setCategory("CACHE_CONFIG");
        evt.setMessage("Auto Cache Clean on replication/publish " + (enabled ? "ENABLED" : "DISABLED") + ".");
        evt.setPath("/api/v1/console/cache/auto-clean");
        evt.setMethod("PATCH");
        evt.setHttpStatus(200);
        evt.setActor(actor);
        evt.setNodePath("/system/cache/auto-clean");
        evt.setStatus("RESOLVED");
        evt.setCreatedAt(Instant.now());
        evt.setResolvedAt(Instant.now());
        consoleEventRepository.save(evt);

        return Map.of("success", true, "data", Map.of("autoCacheClean", autoCacheClean.get()));
    }

    @GetMapping("/replication/webhook")
    public Map<String, Object> getReplicationWebhook() throws Exception {
        Optional<SystemSettingEntity> existing = systemSettingRepository.findById("replication_webhook_config");
        if (existing.isPresent()) {
            Map<String, Object> parsed = objectMapper.readValue(existing.get().getSettingValue(), Map.class);
            return Map.of("success", true, "data", parsed);
        }
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("enabled", false);
        defaults.put("webhookUrl", "");
        defaults.put("secretToken", "");
        return Map.of("success", true, "data", defaults);
    }

    @PutMapping("/replication/webhook")
    public Map<String, Object> saveReplicationWebhook(@RequestBody Map<String, Object> body) throws Exception {
        Map<String, Object> toSave = new LinkedHashMap<>();
        toSave.put("enabled", Boolean.TRUE.equals(body.get("enabled")));
        toSave.put("webhookUrl", body.get("webhookUrl") != null ? String.valueOf(body.get("webhookUrl")).trim() : "");
        toSave.put("secretToken", body.get("secretToken") != null ? String.valueOf(body.get("secretToken")).trim() : "");
        toSave.put("updatedAt", Instant.now().toString());

        SystemSettingEntity entity = systemSettingRepository.findById("replication_webhook_config").orElseGet(SystemSettingEntity::new);
        entity.setSettingKey("replication_webhook_config");
        entity.setSettingValue(objectMapper.writeValueAsString(toSave));
        entity.setUpdatedAt(Instant.now());
        systemSettingRepository.save(entity);

        String actor = body.get("actor") != null ? String.valueOf(body.get("actor")) : "admin";
        logSystemEvent("INFO", "WEBHOOK_CONFIG", "Remote hosting webhook "
                + (Boolean.TRUE.equals(toSave.get("enabled")) ? "ENABLED" : "DISABLED")
                + (!String.valueOf(toSave.get("webhookUrl")).isBlank() ? " -> " + toSave.get("webhookUrl") : ""),
                "/api/v1/console/replication/webhook", "PUT", 200, actor, "/system/replication/webhook");

        return Map.of("success", true, "data", toSave);
    }

    @PostMapping("/replication/webhook/test")
    public Map<String, Object> testReplicationWebhook(@RequestBody(required = false) Map<String, Object> body) {
        String actor = body != null && body.get("actor") != null ? String.valueOf(body.get("actor")) : "admin";
        String summary = dispatchReplicationWebhook("test-ping", "TEST", "/system/webhook-test", cacheEpoch.get(), false, actor, true);
        return Map.of("success", true, "message", summary != null ? summary : "No webhook URL configured");
    }

    private String dispatchReplicationWebhook(
            String targetDomain,
            String contentType,
            String contentPath,
            long revision,
            boolean cacheCleared,
            String actor
    ) {
        return dispatchReplicationWebhook(targetDomain, contentType, contentPath, revision, cacheCleared, actor, false);
    }

    private String dispatchReplicationWebhook(
            String targetDomain,
            String contentType,
            String contentPath,
            long revision,
            boolean cacheCleared,
            String actor,
            boolean forceTest
    ) {
        try {
            Optional<SystemSettingEntity> existing = systemSettingRepository.findById("replication_webhook_config");
            if (existing.isEmpty()) return null;
            Map<String, Object> cfg = objectMapper.readValue(existing.get().getSettingValue(), Map.class);
            boolean enabled = Boolean.TRUE.equals(cfg.get("enabled"));
            String url = cfg.get("webhookUrl") != null ? String.valueOf(cfg.get("webhookUrl")).trim() : "";
            String secret = cfg.get("secretToken") != null ? String.valueOf(cfg.get("secretToken")).trim() : "";

            if ((!enabled && !forceTest) || url.isBlank()) return null;

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("event", forceTest ? "webhook.test" : "content.replicated");
            payload.put("targetDomain", targetDomain);
            payload.put("contentType", contentType);
            payload.put("contentPath", contentPath);
            payload.put("revision", revision);
            payload.put("cacheCleared", cacheCleared);
            payload.put("actor", actor);
            payload.put("timestamp", Instant.now().toString());

            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)));
            if (!secret.isBlank()) {
                reqBuilder.header("Authorization", "Bearer " + secret);
                reqBuilder.header("X-DevInquire-Token", secret);
            }

            HttpResponse<String> response = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            if (code >= 200 && code < 300) {
                logSystemEvent("INFO", "WEBHOOK_DELIVERED", "Remote hosting webhook delivered (HTTP " + code + ") to " + url,
                        url, "POST", code, actor, "/system/replication/webhook");
                return "Remote webhook delivered (HTTP " + code + ").";
            } else {
                logSystemEvent("WARN", "WEBHOOK_FAILED", "Remote hosting webhook returned HTTP " + code + " from " + url,
                        url, "POST", code, actor, "/system/replication/webhook");
                return "Remote webhook returned HTTP " + code + ".";
            }
        } catch (Exception ex) {
            logSystemEvent("ERROR", "WEBHOOK_ERROR", "Remote hosting webhook failed: " + ex.getMessage(),
                    "/api/v1/console/replication/webhook", "POST", 500, actor, "/system/replication/webhook");
            return "Remote webhook error: " + ex.getMessage();
        }
    }

    private void logSystemEvent(
            String level,
            String category,
            String message,
            String path,
            String method,
            int httpStatus,
            String actor,
            String nodePath
    ) {
        try {
            ConsoleEventEntity evt = new ConsoleEventEntity();
            evt.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
            evt.setLevel(level);
            evt.setSource("SYSTEM");
            evt.setCategory(category);
            evt.setMessage(message);
            evt.setPath(path);
            evt.setMethod(method);
            evt.setHttpStatus(httpStatus);
            evt.setActor(actor);
            evt.setNodePath(nodePath);
            evt.setStatus("ERROR".equals(level) || "WARN".equals(level) ? "OPEN" : "RESOLVED");
            evt.setCreatedAt(Instant.now());
            if ("RESOLVED".equals(evt.getStatus())) evt.setResolvedAt(Instant.now());
            consoleEventRepository.save(evt);
        } catch (Exception ignored) {
        }
    }

    @GetMapping("/i18n")
    public Map<String, Object> getI18nConfig() throws Exception {
        Optional<SystemSettingEntity> existing = systemSettingRepository.findById("i18n_config");
        if (existing.isPresent()) {
            Map<String, Object> parsed = objectMapper.readValue(existing.get().getSettingValue(), Map.class);
            return Map.of("success", true, "data", parsed);
        }
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("multiLanguageEnabled", false);
        defaults.put("autoDetectByLocation", true);
        defaults.put("defaultLocale", "en");
        defaults.put("supportedLocales", List.of(
                Map.of("code", "en", "name", "English", "nativeName", "English", "countries", List.of("US", "GB", "CA", "AU", "NZ", "IE", "SG"), "enabled", true),
                Map.of("code", "hi", "name", "Hindi", "nativeName", "हिन्दी", "countries", List.of("IN"), "enabled", true),
                Map.of("code", "es", "name", "Spanish", "nativeName", "Español", "countries", List.of("ES", "MX", "AR", "CO", "CL", "PE"), "enabled", true),
                Map.of("code", "fr", "name", "French", "nativeName", "Français", "countries", List.of("FR", "BE", "CH"), "enabled", true),
                Map.of("code", "de", "name", "German", "nativeName", "Deutsch", "countries", List.of("DE", "AT", "CH"), "enabled", true),
                Map.of("code", "ja", "name", "Japanese", "nativeName", "日本語", "countries", List.of("JP"), "enabled", true),
                Map.of("code", "ar", "name", "Arabic", "nativeName", "العربية", "countries", List.of("SA", "AE", "EG", "QA", "KW"), "enabled", true, "rtl", true),
                Map.of("code", "pt", "name", "Portuguese", "nativeName", "Português", "countries", List.of("BR", "PT"), "enabled", true)
        ));
        return Map.of("success", true, "data", defaults);
    }

    @PutMapping("/i18n")
    public Map<String, Object> updateI18nConfig(@RequestBody Map<String, Object> body) throws Exception {
        Map<String, Object> toSave = new LinkedHashMap<>(body);
        toSave.put("updatedAt", Instant.now().toString());
        SystemSettingEntity entity = systemSettingRepository.findById("i18n_config").orElseGet(SystemSettingEntity::new);
        entity.setSettingKey("i18n_config");
        entity.setSettingValue(objectMapper.writeValueAsString(toSave));
        entity.setUpdatedAt(Instant.now());
        systemSettingRepository.save(entity);

        boolean enabled = Boolean.TRUE.equals(body.get("multiLanguageEnabled"));
        boolean autoDetect = Boolean.TRUE.equals(body.get("autoDetectByLocation"));
        String actor = body.get("actor") != null ? String.valueOf(body.get("actor")) : "admin";

        ConsoleEventEntity evt = new ConsoleEventEntity();
        evt.setId("evt_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        evt.setLevel("INFO");
        evt.setSource("SYSTEM");
        evt.setCategory("I18N_CONFIG");
        evt.setMessage("Multi-Language Websites " + (enabled ? "ENABLED" : "DISABLED")
                + " (Location Auto-Detect: " + (autoDetect ? "ON" : "OFF") + ").");
        evt.setPath("/api/v1/console/i18n");
        evt.setMethod("PUT");
        evt.setHttpStatus(200);
        evt.setActor(actor);
        evt.setNodePath("/etc/i18n/config");
        evt.setStatus("RESOLVED");
        evt.setCreatedAt(Instant.now());
        evt.setResolvedAt(Instant.now());
        consoleEventRepository.save(evt);

        return Map.of("success", true, "data", toSave);
    }

    private Map<String, Object> pageToSnapshotMap(PageEntity p) {
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

    private Map<String, Object> collectionToSnapshotMap(CollectionEntity c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId());
        map.put("name", c.getName());
        map.put("slug", c.getSlug());
        map.put("description", c.getDescription());
        map.put("fields", readJson(c.getFieldsJson(), List.of()));
        return map;
    }

    private Map<String, Object> entryToSnapshotMap(CollectionEntryEntity e) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("collectionId", e.getCollectionId());
        map.put("status", e.getStatus());
        map.put("data", readJson(e.getDataJson(), Map.of()));
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        map.put("updatedAt", e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> domainToSnapshotMap(DomainEntity d) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", d.getId());
        map.put("domain", d.getDomain());
        map.put("hostingProvider", d.getHostingProvider());
        map.put("siteName", d.getSiteName());
        map.put("baseUrl", d.getBaseUrl());
        map.put("connected", d.isConnected());
        map.put("dnsVerified", d.isDnsVerified());
        map.put("active", d.isActive());
        map.put("resolvedIps", readJson(d.getResolvedIpsJson(), List.of()));
        map.put("verifiedAt", d.getVerifiedAt() != null ? d.getVerifiedAt().toString() : null);
        return map;
    }

    private <T> T readJson(String raw, T fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return objectMapper.readValue(raw, new TypeReference<T>() {});
        } catch (Exception e) {
            return fallback;
        }
    }

    private Map<String, Object> replicationToMap(ReplicationRecordEntity r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("targetDomain", r.getTargetDomain());
        map.put("contentType", r.getContentType());
        map.put("contentPath", r.getContentPath());
        map.put("status", r.getStatus());
        map.put("cacheCleared", r.isCacheCleared());
        map.put("revision", r.getRevision());
        map.put("durationMs", r.getDurationMs());
        map.put("actor", r.getActor());
        map.put("message", r.getMessage());
        map.put("createdAt", r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> eventToMap(ConsoleEventEntity e) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", e.getId());
        map.put("level", e.getLevel());
        map.put("source", e.getSource());
        map.put("category", e.getCategory());
        map.put("message", e.getMessage());
        map.put("stackTrace", e.getStackTrace());
        map.put("path", e.getPath());
        map.put("method", e.getMethod());
        map.put("httpStatus", e.getHttpStatus());
        map.put("durationMs", e.getDurationMs());
        map.put("actor", e.getActor());
        map.put("nodePath", e.getNodePath());
        map.put("metadataJson", e.getMetadataJson());
        map.put("status", e.getStatus());
        map.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        map.put("resolvedAt", e.getResolvedAt() != null ? e.getResolvedAt().toString() : null);
        return map;
    }
}
