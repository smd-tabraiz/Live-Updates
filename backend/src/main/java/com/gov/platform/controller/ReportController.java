package com.gov.platform.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gov.platform.model.Report;
import com.gov.platform.repository.ReportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final String UPLOAD_DIR = "uploads/";

    public ReportController() {
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @GetMapping
    public List<Report> getAllReports() {
        return reportRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<Report> createReport(
            @RequestPart("reportData") String reportDataJson,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            Report report = mapper.readValue(reportDataJson, Report.class);

            if (file != null && !file.isEmpty()) {
                String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Path filePath = Paths.get(UPLOAD_DIR + filename);
                Files.write(filePath, file.getBytes());
                report.setAttachmentPath("/api/reports/files/" + filename);
            }

            Report savedReport = reportRepository.save(report);
            
            // Broadcast to connected WebSocket clients
            messagingTemplate.convertAndSend("/topic/reports", savedReport);

            return ResponseEntity.ok(savedReport);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Report> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        Optional<Report> opt = reportRepository.findById(id);
        if (opt.isPresent()) {
            Report report = opt.get();
            report.setStatus(newStatus);
            Report savedReport = reportRepository.save(report);
            
            // Broadcast the update
            messagingTemplate.convertAndSend("/topic/reports", savedReport);
            
            return ResponseEntity.ok(savedReport);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        try {
            Path file = Paths.get(UPLOAD_DIR).resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
