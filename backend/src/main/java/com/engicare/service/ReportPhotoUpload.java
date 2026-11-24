package com.engicare.service;

import com.engicare.entity.Report;
import com.engicare.entity.ReportPhoto;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Locale;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

final class ReportPhotoUpload {
    static final int MAX_PHOTOS = 5;
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 12_000_000;

    private ReportPhotoUpload() {}

    static ReportPhoto read(Report report, MultipartFile file, LocalDateTime now) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw invalid("Each photo must be between 1 byte and 5 MiB");
        }
        try (var input = file.getInputStream(); var imageInput = ImageIO.createImageInputStream(input)) {
            if (imageInput == null) {
                throw invalid("Choose a valid JPEG or PNG photo");
            }
            var readers = ImageIO.getImageReaders(imageInput);
            if (!readers.hasNext()) {
                throw invalid("Choose a valid JPEG or PNG photo");
            }

            var reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!format.equals("jpeg") && !format.equals("png")) {
                    throw invalid("Only JPEG and PNG photos are supported");
                }
                reader.setInput(imageInput, true, true);
                long pixels = (long) reader.getWidth(0) * reader.getHeight(0);
                if (pixels <= 0 || pixels > MAX_PIXELS) {
                    throw invalid("Each photo may contain up to 12 megapixels");
                }
                try (var output = new ByteArrayOutputStream()) {
                    // Re-encode the decoded pixels to discard metadata and extra file content.
                    if (!ImageIO.write(reader.read(0), format, output) || output.size() > MAX_BYTES) {
                        throw invalid("The processed photo must be 5 MiB or smaller");
                    }
                    return new ReportPhoto(report, safeName(file.getOriginalFilename(), format),
                            "image/" + format, output.toByteArray(), now);
                }
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalid("Choose a valid JPEG or PNG photo");
        }
    }

    private static String safeName(String original, String format) {
        if (original == null || original.isBlank()) {
            return "photo." + (format.equals("jpeg") ? "jpg" : format);
        }
        String name = original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("\\p{Cntrl}", "").strip();
        if (name.isBlank()) {
            return "photo." + (format.equals("jpeg") ? "jpg" : format);
        }
        return name.substring(0, Math.min(name.length(), 200));
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
