package com.devinquire.cms.server.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "cms_system_settings")
public class SystemSettingEntity {
    @Id
    @Column(name = "setting_key", length = 100)
    private String settingKey;

    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String settingValue;

    private Instant updatedAt;

    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }

    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
