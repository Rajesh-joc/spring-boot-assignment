'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:8080/api';

/* ─── Helper: Format epoch millis to readable date/time ─── */
function formatEpoch(epochMs) {
  const d = new Date(epochMs);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(epochMs) {
  return new Date(epochMs).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(epochMs) {
  return new Date(epochMs).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ─── Animation Variants ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.3 } },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const toastVariants = {
  hidden: { opacity: 0, y: 50, x: 0 },
  visible: { opacity: 1, y: 0, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, y: 50, transition: { duration: 0.2 } },
};

/* ─── Steps Config ─── */
const STEPS = [
  { id: 1, label: 'Create Interviewer', icon: '👤' },
  { id: 2, label: 'Set Availability', icon: '📅' },
  { id: 3, label: 'View Slots', icon: '🔍' },
  { id: 4, label: 'Book Slot', icon: '✅' },
  { id: 5, label: 'Update Slot', icon: '✏️' },
];

export default function Home() {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  /* State for each step */
  const [interviewer, setInterviewer] = useState({ name: '', email: '', maxInterviewsPerWeek: 5 });
  const [createdInterviewer, setCreatedInterviewer] = useState(null);

  const [availability, setAvailability] = useState({ startDate: '', startTime: '09:00', endTime: '13:00' });

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [candidateName, setCandidateName] = useState('');
  const [bookedSlot, setBookedSlot] = useState(null);

  /* State for Step 5: Update Slot */
  const [updateSlotId, setUpdateSlotId] = useState('');
  const [updateFields, setUpdateFields] = useState({ startTime: '', endTime: '', status: '' });
  const [updatedSlot, setUpdatedSlot] = useState(null);

  /* Toast helper */
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ─── API 1: Create Interviewer ─── */
  const createInterviewer = async () => {
    if (!interviewer.name || !interviewer.email) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/interviewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interviewer),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create interviewer');
      setCreatedInterviewer(data);
      setCompletedSteps((prev) => new Set([...prev, 1]));
      setActiveStep(2);
      showToast(`Interviewer "${data.name}" created successfully!`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── API 2: Set Availability ─── */
  const setInterviewerAvailability = async () => {
    if (!availability.startDate) {
      showToast('Please select a date', 'error');
      return;
    }
    setLoading(true);
    try {
      const startEpoch = new Date(`${availability.startDate}T${availability.startTime}`).getTime();
      const endEpoch = new Date(`${availability.startDate}T${availability.endTime}`).getTime();

      if (endEpoch <= startEpoch) {
        throw new Error('End time must be after start time');
      }

      const res = await fetch(`${API_BASE}/v1/interviewers/${createdInterviewer.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ startTime: startEpoch, endTime: endEpoch }]),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to set availability');
      }
      setCompletedSteps((prev) => new Set([...prev, 2]));

      /* Auto-fetch slots */
      const slotsRes = await fetch(`${API_BASE}/slots?start=${startEpoch}&end=${endEpoch}`);
      const slotsData = await slotsRes.json();
      setSlots(slotsData);
      setActiveStep(3);
      showToast(`Availability set! ${slotsData.length} slots generated.`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── API 3: Get Slots (refresh) ─── */
  const refreshSlots = async () => {
    setLoading(true);
    try {
      const startEpoch = new Date(`${availability.startDate}T${availability.startTime}`).getTime();
      const endEpoch = new Date(`${availability.startDate}T${availability.endTime}`).getTime();
      const res = await fetch(`${API_BASE}/slots?start=${startEpoch}&end=${endEpoch}`);
      const data = await res.json();
      setSlots(data);
      setCompletedSteps((prev) => new Set([...prev, 3]));
      showToast(`Found ${data.length} slots`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── API 4: Book Slot ─── */
  const bookSlot = async () => {
    if (!selectedSlot || !candidateName) {
      showToast('Select a slot and enter candidate name', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/slots/${selectedSlot.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data || 'Booking failed');
      setBookedSlot(data);
      setCompletedSteps((prev) => new Set([...prev, 4]));
      /* Update slot in list */
      setSlots((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      setSelectedSlot(null);
      showToast(`Slot booked for "${candidateName}"! 🎉`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── API 5: Update Slot ─── */
  const updateSlot = async () => {
    if (!updateSlotId) {
      showToast('Please enter a Slot ID', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {};
      if (updateFields.startTime) payload.startTime = new Date(updateFields.startTime).getTime();
      if (updateFields.endTime) payload.endTime = new Date(updateFields.endTime).getTime();
      if (updateFields.status) payload.status = updateFields.status;

      const res = await fetch(`${API_BASE}/slots/${updateSlotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setUpdatedSlot(data);
      setCompletedSteps((prev) => new Set([...prev, 5]));
      showToast('Slot updated successfully! ✏️');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Get default date (tomorrow) ─── */
  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="app-container">
      {/* ─── Header ─── */}
      <motion.div
        className="header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="header__badge">Interview Scheduling System</div>
        <h1 className="header__title">Schedule Interviews</h1>
        <p className="header__subtitle">
          Create interviewers, set availability, and book slots — all in one place.
        </p>
      </motion.div>

      {/* ─── Step Pills ─── */}
      <motion.div
        className="steps"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {STEPS.map((step) => (
          <motion.button
            key={step.id}
            className={`step-pill ${
              activeStep === step.id
                ? 'step-pill--active'
                : completedSteps.has(step.id)
                ? 'step-pill--completed'
                : ''
            }`}
            onClick={() => {
              if (step.id <= Math.max(...[1, ...completedSteps]) + 1) {
                setActiveStep(step.id);
              }
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="step-pill__number">
              {completedSteps.has(step.id) ? '✓' : step.id}
            </span>
            <span>{step.icon}</span>
            {step.label}
          </motion.button>
        ))}
      </motion.div>

      {/* ─── Step Content ─── */}
      <AnimatePresence mode="wait">
        {/* ── Step 1: Create Interviewer ── */}
        {activeStep === 1 && (
          <motion.div
            key="step1"
            className="card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="card__header">
              <div className="card__icon card__icon--purple">👤</div>
              <div>
                <div className="card__title">Create Interviewer</div>
                <div className="card__description">
                  Add a new interviewer to the system with their weekly booking limit
                </div>
              </div>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div variants={fadeUp} className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={interviewer.name}
                  onChange={(e) => setInterviewer({ ...interviewer, name: e.target.value })}
                />
              </motion.div>

              <motion.div variants={fadeUp} className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="john@example.com"
                    value={interviewer.email}
                    onChange={(e) => setInterviewer({ ...interviewer, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Interviews / Week</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="20"
                    value={interviewer.maxInterviewsPerWeek}
                    onChange={(e) =>
                      setInterviewer({ ...interviewer, maxInterviewsPerWeek: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <button
                  className={`btn btn--primary ${loading ? 'btn--disabled' : ''}`}
                  onClick={createInterviewer}
                  disabled={loading}
                >
                  {loading ? <span className="btn__spinner" /> : null}
                  {loading ? 'Creating...' : 'Create Interviewer →'}
                </button>
              </motion.div>
            </motion.div>

            {createdInterviewer && (
              <motion.div
                className="response response--success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <div className="response__label">✓ Interviewer Created</div>
                <div className="response__body">{JSON.stringify(createdInterviewer, null, 2)}</div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Step 2: Set Availability ── */}
        {activeStep === 2 && (
          <motion.div
            key="step2"
            className="card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="card__header">
              <div className="card__icon card__icon--green">📅</div>
              <div>
                <div className="card__title">Set Availability</div>
                <div className="card__description">
                  Define when{' '}
                  <strong style={{ color: 'var(--accent-light)' }}>{createdInterviewer?.name}</strong> is
                  available — the system auto-generates 1-hour slots
                </div>
              </div>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div variants={fadeUp} className="form-group">
                <label className="form-label">Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={availability.startDate || getDefaultDate()}
                  onChange={(e) => setAvailability({ ...availability, startDate: e.target.value })}
                />
              </motion.div>

              <motion.div variants={fadeUp} className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    className="form-input"
                    type="time"
                    value={availability.startTime}
                    onChange={(e) => setAvailability({ ...availability, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input
                    className="form-input"
                    type="time"
                    value={availability.endTime}
                    onChange={(e) => setAvailability({ ...availability, endTime: e.target.value })}
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <button
                  className={`btn btn--success ${loading ? 'btn--disabled' : ''}`}
                  onClick={() => {
                    if (!availability.startDate) {
                      setAvailability({ ...availability, startDate: getDefaultDate() });
                    }
                    setInterviewerAvailability();
                  }}
                  disabled={loading}
                >
                  {loading ? <span className="btn__spinner" /> : null}
                  {loading ? 'Setting...' : 'Set Availability & Generate Slots →'}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Step 3: View & Select Slots ── */}
        {activeStep === 3 && (
          <motion.div
            key="step3"
            className="card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="card__header">
              <div className="card__icon card__icon--blue">🔍</div>
              <div>
                <div className="card__title">Available Slots</div>
                <div className="card__description">
                  {slots.length} slot{slots.length !== 1 ? 's' : ''} found — click one to book it
                </div>
              </div>
            </div>

            {slots.length > 0 ? (
              <motion.div
                className="slots-grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {slots.map((slot, i) => (
                  <motion.div
                    key={slot.id}
                    className={`slot-card ${
                      slot.status === 'BOOKED'
                        ? 'slot-card--booked'
                        : selectedSlot?.id === slot.id
                        ? 'slot-card--selected'
                        : ''
                    }`}
                    variants={fadeUp}
                    whileHover={slot.status !== 'BOOKED' ? { scale: 1.02 } : {}}
                    whileTap={slot.status !== 'BOOKED' ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (slot.status !== 'BOOKED') {
                        setSelectedSlot(slot);
                        setActiveStep(4);
                      }
                    }}
                  >
                    <span
                      className={`slot-card__status ${
                        slot.status === 'BOOKED'
                          ? 'slot-card__status--booked'
                          : 'slot-card__status--available'
                      }`}
                    >
                      {slot.status}
                    </span>
                    <div className="slot-card__time">
                      {formatTime(slot.startTime)} — {formatTime(slot.endTime)}
                    </div>
                    <div className="slot-card__date">{formatDate(slot.startTime)}</div>
                    {slot.candidateName && (
                      <div className="slot-card__candidate">🧑 {slot.candidateName}</div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="empty-state">
                <div className="empty-state__icon">📭</div>
                <div className="empty-state__text">No slots found for this time range</div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                className={`btn btn--primary ${loading ? 'btn--disabled' : ''}`}
                onClick={refreshSlots}
                disabled={loading}
                style={{ maxWidth: 240 }}
              >
                {loading ? <span className="btn__spinner" /> : '🔄'} Refresh Slots
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 4: Book Slot ── */}
        {activeStep === 4 && (
          <motion.div
            key="step4"
            className="card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="card__header">
              <div className="card__icon card__icon--amber">✅</div>
              <div>
                <div className="card__title">Book Interview Slot</div>
                <div className="card__description">
                  Confirm the candidate&apos;s name to book the selected slot
                </div>
              </div>
            </div>

            {selectedSlot && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: 20,
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent-light)', marginBottom: 8 }}>
                  Selected Slot
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 4 }}>
                  {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {formatDate(selectedSlot.startTime)}
                </div>
              </motion.div>
            )}

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div variants={fadeUp} className="form-group">
                <label className="form-label">Candidate Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                />
              </motion.div>

              <motion.div variants={fadeUp} className="form-row">
                <button
                  className="btn btn--primary"
                  onClick={() => setActiveStep(3)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'none' }}
                >
                  ← Back to Slots
                </button>
                <button
                  className={`btn btn--success ${loading ? 'btn--disabled' : ''}`}
                  onClick={bookSlot}
                  disabled={loading}
                >
                  {loading ? <span className="btn__spinner" /> : null}
                  {loading ? 'Booking...' : 'Confirm Booking ✓'}
                </button>
              </motion.div>
            </motion.div>

            {bookedSlot && (
              <motion.div
                className="response response--success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <div className="response__label">✓ Booking Confirmed</div>
                <div className="response__body">{JSON.stringify(bookedSlot, null, 2)}</div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Step 5: Update Slot ── */}
        {activeStep === 5 && (
          <motion.div
            key="step5"
            className="card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="card__header">
              <div className="card__icon card__icon--purple">✏️</div>
              <div>
                <div className="card__title">Update Slot</div>
                <div className="card__description">
                  Reschedule a slot or cancel it by setting status back to AVAILABLE
                </div>
              </div>
            </div>

            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div variants={fadeUp} className="form-group">
                <label className="form-label">Slot ID</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Paste the slot ID to update"
                  value={updateSlotId}
                  onChange={(e) => setUpdateSlotId(e.target.value)}
                />
              </motion.div>

              {bookedSlot && (
                <motion.div variants={fadeUp}
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setUpdateSlotId(bookedSlot.id)}
                >
                  ↑ Click to auto-fill last booked slot ID: {bookedSlot.id}
                </motion.div>
              )}

              <motion.div variants={fadeUp} className="form-row">
                <div className="form-group">
                  <label className="form-label">New Start Time (optional)</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={updateFields.startTime}
                    onChange={(e) => setUpdateFields({ ...updateFields, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New End Time (optional)</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={updateFields.endTime}
                    onChange={(e) => setUpdateFields({ ...updateFields, endTime: e.target.value })}
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="form-group">
                <label className="form-label">New Status (optional)</label>
                <select
                  className="form-input"
                  value={updateFields.status}
                  onChange={(e) => setUpdateFields({ ...updateFields, status: e.target.value })}
                >
                  <option value="">— keep current status —</option>
                  <option value="AVAILABLE">AVAILABLE (cancel / reopen)</option>
                  <option value="BOOKED">BOOKED</option>
                </select>
              </motion.div>

              <motion.div variants={fadeUp} className="form-row">
                <button
                  className="btn btn--primary"
                  onClick={() => setActiveStep(4)}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: 'none' }}
                >
                  ← Back
                </button>
                <button
                  className={`btn btn--success ${loading ? 'btn--disabled' : ''}`}
                  onClick={updateSlot}
                  disabled={loading}
                >
                  {loading ? <span className="btn__spinner" /> : null}
                  {loading ? 'Updating...' : 'Update Slot ✏️'}
                </button>
              </motion.div>
            </motion.div>

            {updatedSlot && (
              <motion.div
                className="response response--success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.4 }}
              >
                <div className="response__label">✓ Slot Updated</div>
                <div className="response__body">{JSON.stringify(updatedSlot, null, 2)}</div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {toast.type === 'success' ? '✓' : '✕'} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
