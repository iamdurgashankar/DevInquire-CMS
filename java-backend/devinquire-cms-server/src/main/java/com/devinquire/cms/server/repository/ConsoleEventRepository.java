package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.ConsoleEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ConsoleEventRepository extends JpaRepository<ConsoleEventEntity, String> {
    List<ConsoleEventEntity> findTop250ByOrderByCreatedAtDesc();
    long countByStatus(String status);
    long countByLevelAndStatus(String level, String status);

    @Transactional
    long deleteByStatus(String status);
}
