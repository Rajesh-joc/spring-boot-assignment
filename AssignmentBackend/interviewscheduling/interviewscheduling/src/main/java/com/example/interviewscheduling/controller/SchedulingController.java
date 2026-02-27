package com.example.interviewscheduling.controller;

import com.example.interviewscheduling.model.Interviewer;
import com.example.interviewscheduling.model.Slot;
import com.example.interviewscheduling.service.SchedulingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/")
public class SchedulingController {

    @Autowired
    private SchedulingService schedulingService;


    @PostMapping("/v1/interviewers")
    public Interviewer createInterviewer(@RequestBody Interviewer interviewer) {
        return schedulingService.createInterviewer(interviewer);
    }


    @PostMapping("/v1/interviewers/{id}/availability")
    public ResponseEntity<Void> setAvailability(
            @PathVariable String id,
            @RequestBody List<Interviewer.Availability> availability) {
        schedulingService.generateSlots(id, availability);
        return ResponseEntity.ok().build();
    }




    @GetMapping("/slots")
    public List<Slot> getSlots(
            @RequestParam Long start,
            @RequestParam Long end) {
        return schedulingService.getAvailableSlots(start, end);
    }




    @PostMapping("/slots/{id}/book")
    public ResponseEntity<Slot> bookSlot(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String candidateName = body.get("candidateName");
        Slot booked = schedulingService.bookSlot(id, candidateName);
        return ResponseEntity.ok(booked);
    }





    @PutMapping("/slots/{id}")
    public ResponseEntity<Slot> updateSlot(
            @PathVariable String id,
            @RequestBody Slot updates) {
        Slot updated = schedulingService.updateSlot(id, updates);
        return ResponseEntity.ok(updated);
    }
}
