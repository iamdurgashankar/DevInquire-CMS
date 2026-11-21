package com.devinquire.cms.server.repository;

import com.devinquire.cms.server.entity.SystemSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingRepository extends JpaRepository<SystemSettingEntity, String> {
}
