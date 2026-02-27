package com.example.interviewscheduling.exception;


public class SlotAlreadyBookedException extends RuntimeException {
    public SlotAlreadyBookedException(String slotId) {
        super("Slot is already booked: " + slotId);
    }
}
