package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.DomainEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DomainRepository extends JpaRepository<DomainEntity, String> {
    Optional<DomainEntity> findByDomain(String domain);
}
