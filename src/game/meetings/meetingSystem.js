export function createMeetingState() {
  return { active: false, timer: 0, votes: {}, reason: '' }
}

export function startMeeting(meeting, reason = 'Emergency Den Den Mushi') {
  meeting.active = true
  meeting.timer = 45
  meeting.votes = {}
  meeting.reason = reason
}

export function stopMeeting(meeting) {
  meeting.active = false
  meeting.timer = 0
}

export function updateMeeting(meeting, dt) {
  if (!meeting.active) return
  meeting.timer = Math.max(0, meeting.timer - dt)
  if (meeting.timer <= 0) meeting.active = false
}
