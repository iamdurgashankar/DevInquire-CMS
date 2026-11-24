package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.CollectionEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CollectionEntryRepository extends JpaRepository<CollectionEntryEntity, String> {
    List<CollectionEntryEntity> findByCollectionId(String collectionId);
    List<CollectionEntryEntity> findByCollectionIdAndStatus(String collectionId, String status);
}
