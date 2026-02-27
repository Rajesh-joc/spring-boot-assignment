package com.example.interviewscheduling.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;


@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "interviewers")
public class Interviewer {
    @Id
    private String id;
    private String name;
    private String email;
    private int maxInterviewsPerWeek;
    private List<Availability> availability;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Availability {

        private Long startTime;

        private Long endTime;
    }
}
