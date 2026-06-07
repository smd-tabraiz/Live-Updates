package com.gov.platform.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reports")
public class Report {
    @Id
    private String id;
    
    private String issue;
    private String category;
    private String severity;
    private String status;
    private String date;
    
    private String district;
    private String mandal;
    private String village;
    
    private String volunteer;
    private String priority;
    private Integer aiConfidence;
    private String attachmentPath;

    // Constructors
    public Report() {}

    public Report(String id, String issue, String category, String severity, String status, String date, String district, String mandal, String village, String volunteer, String priority, Integer aiConfidence, String attachmentPath) {
        this.id = id;
        this.issue = issue;
        this.category = category;
        this.severity = severity;
        this.status = status;
        this.date = date;
        this.district = district;
        this.mandal = mandal;
        this.village = village;
        this.volunteer = volunteer;
        this.priority = priority;
        this.aiConfidence = aiConfidence;
        this.attachmentPath = attachmentPath;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIssue() { return issue; }
    public void setIssue(String issue) { this.issue = issue; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getMandal() { return mandal; }
    public void setMandal(String mandal) { this.mandal = mandal; }

    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }

    public String getVolunteer() { return volunteer; }
    public void setVolunteer(String volunteer) { this.volunteer = volunteer; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Integer getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Integer aiConfidence) { this.aiConfidence = aiConfidence; }

    public String getAttachmentPath() { return attachmentPath; }
    public void setAttachmentPath(String attachmentPath) { this.attachmentPath = attachmentPath; }
}
