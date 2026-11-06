import {
  localDate,
  shiftDate,
  reminderFor,
  type State,
  type Task,
} from "./model";
const utc = (n: number) =>
  new Date(n)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
const day = (s: string) => s.replace(/-/g, "");
/** Export the selected local-calendar occurrence, not the recurrence series. */
export function calendarEvent(s: State, task: Task, date: string) {
  const time = reminderFor(s, task, date);
  const start = localDate(date);
  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    start.setHours(hours, minutes, 0, 0);
  }
  return {
    task,
    date,
    start: time ? utc(+start) : day(date),
    end: time ? utc(+start + 15 * 60000) : day(shiftDate(date, 1)),
    allDay: !time,
  };
}
export function googleCalendarUrl(s: State, task: Task, date: string) {
  const event = calendarEvent(s, task, date);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.name,
    dates: event.start + "/" + event.end,
    details: task.description || "",
  });
  return "https://calendar.google.com/calendar/render?" + params;
}
const escapeText = (s: string) =>
  s
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
/** RFC 5545 folding is measured in UTF-8 octets, including continuation spaces. */
function fold(line: string) {
  let result = "",
    part = "",
    bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      result += part + "\r\n";
      part = " ";
      bytes = 1;
    }
    part += char;
    bytes += size;
  }
  return result + part;
}
export function calendarFile(
  s: State,
  task: Task,
  date: string,
  now = Date.now(),
) {
  const event = calendarEvent(s, task, date);
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//PocketPal//Task Export//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + encodeURIComponent(task.id) + "-" + date + "@pocketpal.local",
      "DTSTAMP:" + utc(now),
      "DTSTART" + (event.allDay ? ";VALUE=DATE" : "") + ":" + event.start,
      "DTEND" + (event.allDay ? ";VALUE=DATE" : "") + ":" + event.end,
      "SUMMARY:" + escapeText(task.name),
      ...(task.description
        ? ["DESCRIPTION:" + escapeText(task.description)]
        : []),
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
export function downloadCalendar(s: State, task: Task, date: string) {
  const url = URL.createObjectURL(
    new Blob([calendarFile(s, task, date)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "pocketpal-" + date + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
