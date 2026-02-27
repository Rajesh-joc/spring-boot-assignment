package com.example.interviewscheduling.repository;

import com.example.interviewscheduling.model.Slot;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlotRepository extends MongoRepository<Slot, String> {
    // Basic finders for availability
    List<Slot> findByStartTimeBetween(long start, long end);

    List<Slot> findByInterviewerIdAndStartTimeBetween(String interviewerId, long start, long end);
}