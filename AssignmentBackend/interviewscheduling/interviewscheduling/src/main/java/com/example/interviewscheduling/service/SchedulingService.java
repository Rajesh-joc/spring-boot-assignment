package com.example.interviewscheduling.service;

import com.example.interviewscheduling.exception.InterviewerNotFoundException;
import com.example.interviewscheduling.exception.SlotAlreadyBookedException;
import com.example.interviewscheduling.exception.SlotNotFoundException;
import com.example.interviewscheduling.exception.WeeklyLimitExceededException;
import com.example.interviewscheduling.model.Interviewer;
import com.example.interviewscheduling.model.Slot;
import com.example.interviewscheduling.repository.InterviewerRepository;
import com.example.interviewscheduling.repository.SlotRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;


@Service
public class SchedulingService {


    private static final long ONE_HOUR_MILLIS = 3600_000L;

    @Autowired
    private InterviewerRepository interviewerRepository;

    @Autowired
    private SlotRepository slotRepository;


    @Autowired
    private MongoTemplate mongoTemplate;


    public Interviewer createInterviewer(Interviewer interviewer) {
        return interviewerRepository.save(interviewer);
    }


    public void generateSlots(String interviewerId, List<Interviewer.Availability> availability) {
        // Step 1: Fetch the interviewer — throws 404 if not found
        Interviewer interviewer = interviewerRepository.findById(interviewerId)
                .orElseThrow(() -> new InterviewerNotFoundException(interviewerId));

        // Step 2: Save the availability windows to the interviewer document
        interviewer.setAvailability(availability);
        interviewerRepository.save(interviewer);

        // Step 3: Generate 1-hour slots from each availability window
        List<Slot> newSlots = new ArrayList<>();

        if (availability != null) {
            for (Interviewer.Availability avail : availability) {
                long currentStart = avail.getStartTime();
                long windowEnd = avail.getEndTime();

                // Slice the window into 1-hour slots
                // Loop runs as long as there's room for a full 1-hour slot
                while (currentStart + ONE_HOUR_MILLIS <= windowEnd) {
                    Slot slot = new Slot();
                    slot.setInterviewerId(interviewer.getId());
                    slot.setStartTime(currentStart);
                    slot.setEndTime(currentStart + ONE_HOUR_MILLIS);
                    slot.setStatus(Slot.SlotStatus.AVAILABLE);
                    newSlots.add(slot);

                    // Advance to the next hour
                    currentStart += ONE_HOUR_MILLIS;
                }
            }
        }

        // Step 4: Bulk save all generated slots to MongoDB
        slotRepository.saveAll(newSlots);
    }


    public List<Slot> getAvailableSlots(Long start, Long end) {
        return slotRepository.findByStartTimeBetween(start, end);
    }


    public Slot bookSlot(String slotId, String candidateName) {
        // ── Step 1: Fetch the slot to validate it exists and get the interviewer ID ──
        Slot slotToCheck = slotRepository.findById(slotId)
                .orElseThrow(() -> new SlotNotFoundException(slotId));

        // ── Step 2: Fetch the interviewer to get their weekly booking limit ──
        Interviewer interviewer = interviewerRepository.findById(slotToCheck.getInterviewerId())
                .orElseThrow(() -> new InterviewerNotFoundException(slotToCheck.getInterviewerId()));

        // ── Step 3: Calculate the week boundaries for the slot's date ──
        // Convert the slot's epoch millis timestamp to a LocalDateTime
        ZoneId zoneId = ZoneId.systemDefault();
        LocalDateTime slotDateTime = Instant.ofEpochMilli(slotToCheck.getStartTime())
                .atZone(zoneId)
                .toLocalDateTime();

        // Find Monday 00:00 of the slot's week and the following Monday
        LocalDateTime startOfWeek = slotDateTime.with(DayOfWeek.MONDAY).truncatedTo(ChronoUnit.DAYS);
        LocalDateTime endOfWeek = startOfWeek.plusDays(7);

        // Convert week boundaries back to epoch millis for the database query
        long startOfWeekTimestamp = startOfWeek.atZone(zoneId).toInstant().toEpochMilli();
        long endOfWeekTimestamp = endOfWeek.atZone(zoneId).toInstant().toEpochMilli();

        // ── Step 4: Count the interviewer's BOOKED slots this week ──
        List<Slot> bookedSlots = slotRepository.findByInterviewerIdAndStartTimeBetween(
                interviewer.getId(),
                startOfWeekTimestamp,
                endOfWeekTimestamp);
        long currentBookings = bookedSlots.stream()
                .filter(s -> s.getStatus() == Slot.SlotStatus.BOOKED)
                .count();

        // Reject if the interviewer has already reached their weekly limit
        if (currentBookings >= interviewer.getMaxInterviewsPerWeek()) {
            throw new WeeklyLimitExceededException(interviewer.getId());
        }

        // ── Step 5: Atomic booking using findAndModify ──
        // This query only matches if the slot is still AVAILABLE (race-condition safe)
        Query query = new Query(Criteria.where("_id").is(slotId).and("status").is(Slot.SlotStatus.AVAILABLE));
        Update update = new Update()
                .set("status", Slot.SlotStatus.BOOKED)
                .set("candidateName", candidateName);

        // returnNew(true) returns the document AFTER the update is applied
        FindAndModifyOptions options = new FindAndModifyOptions().returnNew(true);
        Slot updatedSlot = mongoTemplate.findAndModify(query, update, options, Slot.class);

        // If null, another request booked the slot between our check and this update
        if (updatedSlot == null) {
            throw new SlotAlreadyBookedException(slotId);
        }

        return updatedSlot;
    }


    public Slot updateSlot(String slotId, Slot updates) {
        // Fetch the existing slot — throws 404 if not found
        Slot existing = slotRepository.findById(slotId)
                .orElseThrow(() -> new SlotNotFoundException(slotId));

        // Apply only the provided fields (partial update / PATCH semantics)
        if (updates.getStartTime() != 0) {
            existing.setStartTime(updates.getStartTime());
        }
        if (updates.getEndTime() != 0) {
            existing.setEndTime(updates.getEndTime());
        }
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
        }
        if (updates.getCandidateName() != null) {
            existing.setCandidateName(updates.getCandidateName());
        }

        // Validate the resulting time range
        if (existing.getEndTime() <= existing.getStartTime()) {
            throw new IllegalArgumentException("endTime must be after startTime");
        }

        return slotRepository.save(existing);
    }
}
