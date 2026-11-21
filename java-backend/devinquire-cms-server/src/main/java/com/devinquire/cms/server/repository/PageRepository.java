package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.PageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PageRepository extends JpaRepository<PageEntity, String> {
    List<PageEntity> findByStatus(String status);
    Optional<PageEntity> findFirstBySlugAndStatus(String slug, String status);
    List<PageEntity> findByDomainId(String domainId);
}
