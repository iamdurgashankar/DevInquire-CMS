package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.CollectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CollectionRepository extends JpaRepository<CollectionEntity, String> {
    Optional<CollectionEntity> findBySlug(String slug);
}
