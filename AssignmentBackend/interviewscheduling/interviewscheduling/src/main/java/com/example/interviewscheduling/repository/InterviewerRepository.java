package com.example.interviewscheduling.repository;

import com.example.interviewscheduling.model.Interviewer;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InterviewerRepository extends MongoRepository<Interviewer, String> {
}