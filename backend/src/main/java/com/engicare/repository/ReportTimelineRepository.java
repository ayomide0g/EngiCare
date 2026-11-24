package com.engicare.repository;

import com.engicare.entity.ReportTimelineEntry;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportTimelineRepository extends JpaRepository<ReportTimelineEntry, UUID> {
    List<ReportTimelineEntry> findAllByReport_IdOrderByCreatedAtAscIdAsc(UUID reportId);
}
