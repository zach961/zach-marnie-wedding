// ─────────────────────────────────────────────────────────────
//  All wording for the site lives here. Edit freely.
// ─────────────────────────────────────────────────────────────

export const couple = { one: "Marnie", two: "Zach" };

export const dateLine = "Saturday 23 January 2027";
export const dateShort = "23 · 01 · 2027";

/** RSVPs close at the end of this day (Gold Coast time, AEST +10:00). */
export const rsvpDeadline = { label: "14 November", iso: "2026-11-14T23:59:59+10:00" };

export const ceremony = {
  tab: "The Ceremony",
  intro: ["Please join us for", "the Sacrament of"],
  title: "Holy Matrimony",
  of: "of",
  date: "Saturday",
  dateLine: "23 January 2027",
  time: "at 1:30 PM",
  venue: "St Anna’s Orthodox Church",
  address: ["31A Crombie Ave", "Bundall QLD 4217"],
  dress: "Formal Attire",
  dressNote: "Ladies are kindly requested to cover their shoulders in the church.",
};

export const reception = {
  tab: "The Reception",
  intro: ["Following the ceremony,", "please join us for"],
  title: "An Evening of Celebration",
  at: "at",
  venue: "Kwila Lodge",
  address: ["5 Boomerang Rd", "Mudgeeraba QLD 4213"],
  time: "From 4 PM until 11 PM",
};

export const timeline: { time: string; title: string; note?: string }[] = [
  { time: "1:30 PM", title: "Ceremony begins", note: "St Anna’s Orthodox Church" },
  { time: "2:30 PM", title: "Ceremony ends" },
  { time: "3:00 PM", title: "Guests travel to the reception", note: "Transport will be provided" },
  { time: "4:00 PM", title: "Cocktails & canapés", note: "Kwila Lodge" },
  { time: "6:30 PM", title: "Dinner" },
  { time: "8:00 PM", title: "Music & dancing" },
  { time: "11:00 PM", title: "Celebrations conclude" },
];

export const venues = [
  {
    label: "Ceremony",
    name: "St Anna’s Orthodox Church",
    address: "31A Crombie Ave, Bundall QLD 4217",
    time: "1:30 PM",
    maps: "https://www.google.com/maps/search/?api=1&query=St+Anna+Greek+Orthodox+Church+31A+Crombie+Ave+Bundall+QLD+4217",
  },
  {
    label: "Reception",
    name: "Kwila Lodge",
    address: "5 Boomerang Rd, Mudgeeraba QLD 4213",
    time: "4 PM – 11 PM",
    maps: "https://www.google.com/maps/search/?api=1&query=Kwila+Lodge+5+Boomerang+Road+Mudgeeraba+QLD+4213",
  },
];

export const transportNote =
  "Transport from the church to Kwila Lodge will be provided after the ceremony.";

export const rsvpCopy = {
  heading: "Kindly Reply",
  intro: "We would love for you to join us in celebrating our special day.",
  by: `Please RSVP by ${rsvpDeadline.label} so we can finalise arrangements.`,
  thanksYes: "Thank you — we can’t wait to celebrate with you!",
  thanksNo: "Thank you for letting us know. You’ll be missed.",
  closed: "RSVPs have now closed. If anything has changed, please contact Marnie or Zach directly.",
};
