package com.engicare.repository;

import com.engicare.dto.ReportPhotoResponse;
import com.engicare.entity.ReportPhoto;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportPhotoRepository extends JpaRepository<ReportPhoto, UUID> {
    @Query("""
            select new com.engicare.dto.ReportPhotoResponse(p.id, p.fileName, p.mimeType, p.sizeBytes, p.uploadedAt)
            from ReportPhoto p where p.report.id = :reportId order by p.uploadedAt, p.id
            """)
    List<ReportPhotoResponse> listForReport(@Param("reportId") UUID reportId);

    Optional<ReportPhoto> findByIdAndReport_Id(UUID id, UUID reportId);
}
