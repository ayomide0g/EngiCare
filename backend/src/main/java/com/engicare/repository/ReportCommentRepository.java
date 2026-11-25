package com.engicare.repository;

import com.engicare.entity.ReportComment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportCommentRepository extends JpaRepository<ReportComment, UUID> {
    @EntityGraph(attributePaths = "author")
    List<ReportComment> findAllByReport_IdOrderByCreatedAtAscIdAsc(UUID reportId);
}
