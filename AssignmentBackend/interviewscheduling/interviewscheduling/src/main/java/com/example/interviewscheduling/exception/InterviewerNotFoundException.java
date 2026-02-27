package com.example.interviewscheduling.exception;


public class InterviewerNotFoundException extends RuntimeException {
    public InterviewerNotFoundException(String interviewerId) {
        super("Interviewer not found: " + interviewerId);
    }
}
