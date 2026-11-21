# DevInquire CMS — Java Backend & Delivery SDK

Enterprise Java 21 + Spring Boot 3 backend and reusable Java Delivery SDK (`devinquire-cms-sdk`) designed for **Devinquire-CMS** (inspired by AEM / Bloomreach delivery patterns).

## Modules
- **`devinquire-cms-sdk`**: Lightweight Java 21 HTTP + Jackson client library (`DevInquireCmsClient`) with typed models (`CmsPage`, `CmsSection`, `CmsBlock`, `CmsCollection`, `CmsCollectionEntry`, `CmsSiteConfig`).
- **`devinquire-cms-server`**: Spring Boot 3 REST API server implementing:
  - `GET /api/health`
  - `GET /api/hosting/status`, `POST /api/hosting/connect`, `POST /api/hosting/select`, `POST /api/hosting/delete`
  - `GET /api/v1/content/pages`, `/pages/{slug}`, `/config`, `/collections`, `/collections/{slug}/items`, `/entries/{id}`
  - `POST /api/v1/content/pages` & `POST /api/v1/content/collections` (for publishing from the CMS)

## Prerequisites (macOS)
```bash
brew install openjdk@21 maven
```

## Build & Run Locally
```bash
cd java-backend
mvn clean install
mvn -pl devinquire-cms-server spring-boot:run
```

Then point the React frontend (`Devinquire-CMS/.env.local`) to the Java backend:
```env
VITE_API_URL=http://localhost:8080
```

## Using the Java SDK in Client Apps
```java
DevInquireCmsClient cms = DevInquireCmsClient.builder()
    .baseUrl("http://localhost:8080")
    .build();

CmsPage home = cms.getPageBySlug("home");
List<CmsCollectionEntry> posts = cms.getCollectionItems("blog");
```
