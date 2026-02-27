package com.example.interviewscheduling.exception;


public class WeeklyLimitExceededException extends RuntimeException {
    public WeeklyLimitExceededException(String interviewerId) {
        super("Interviewer " + interviewerId + " has reached the maximum bookings for this week.");
    }
}
