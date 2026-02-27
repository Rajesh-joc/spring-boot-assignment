package com.example.interviewscheduling.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "slots")
public class Slot {
    @Id
    private String id;
    @Indexed
    private String interviewerId;
    @Indexed
    private long startTime;
    private long endTime;
    private SlotStatus status; // AVAILABLE, BOOKED
    private String candidateName;
    @Version
    private Long version; // For Optimistic Locking

    public enum SlotStatus {
        AVAILABLE,
        BOOKED
    }
}