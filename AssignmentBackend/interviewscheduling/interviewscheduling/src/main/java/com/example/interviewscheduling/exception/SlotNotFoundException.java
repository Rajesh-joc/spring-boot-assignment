package com.example.interviewscheduling.exception;


public class SlotNotFoundException extends RuntimeException {
    public SlotNotFoundException(String slotId) {
        super("Slot not found: " + slotId);
    }
}
