package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.ReplicationRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReplicationRecordRepository extends JpaRepository<ReplicationRecordEntity, String> {
    List<ReplicationRecordEntity> findTop50ByOrderByCreatedAtDesc();
}
