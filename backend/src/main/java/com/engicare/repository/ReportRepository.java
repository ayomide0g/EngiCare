package com.engicare.repository;

import com.engicare.entity.Report;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;

public interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findAllByReporter_IdOrderByCreatedAtDesc(UUID reporterId);

    List<Report> findAllByOrderByCreatedAtDesc();

    List<Report> findAllByReporter_IdOrAssignee_IdOrderByCreatedAtDesc(UUID reporterId, UUID assigneeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Report r where r.id = :id")
    Optional<Report> findForUpdate(@Param("id") UUID id);

    @Query(value = "select nextval('report_reference_seq')", nativeQuery = true)
    long nextReferenceNumber();
}
