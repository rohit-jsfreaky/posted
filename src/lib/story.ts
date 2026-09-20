/**
 * The five chapters, and the people talking in them.
 *
 * The arc is the one in DESIGN.md sec 6: he starts as an annoying reply, works out
 * there is a pattern, and then becomes the job. Job four is where it turns — the
 * client who will not give a name wants a car put at a scene, and it is his car.
 * Job five is the file that finishes him. Then the last line is true.
 *
 * Voice rule: these are people typing on a phone. Contractions, short sentences,
 * nobody makes speeches.
 */

export type Message = {
  from: 'client' | 'you' | 'system';
  text: string;
};

export type Chapter = {
  /** the thread before the job, the brief in conversation form */
  dms: Message[];
  /** what the client says once it lands */
  payoff: Message[];
  /** what he posts after the job sticks. This is the chapter beat */
  himClosing: string;
  /** one line of on-screen framing when the job opens */
  card: string;
};

export const CHAPTERS: Chapter[] = [
  {
    card: 'One',
    dms: [
      { from: 'client', text: "you the one who fixes photos?" },
      { from: 'you', text: 'depends what needs fixing' },
      {
        from: 'client',
        text: "Club Vantablack. I'm not on the list and I'm not going home. There's a guy on the door. One hour. $200.",
      },
    ],
    payoff: [
      { from: 'client', text: "im inside. i dont know how you did that" },
      { from: 'client', text: 'sending the 200 now' },
    ],
    himClosing:
      'idk something about that vantablack pic is bugging me. cant say what yet',
  },
  {
    card: 'Two',
    dms: [
      { from: 'client', text: "You came recommended. I need this quiet." },
      {
        from: 'client',
        text: "There's a photo going round of my car outside a place I have never been to in my life. Take the car out of it.",
      },
      { from: 'you', text: 'anything in the shot that has to stay?' },
      { from: 'client', text: 'The street sign. People need to know which street it is.' },
      { from: 'client', text: "And don't be sloppy. People check." },
    ],
    payoff: [
      { from: 'client', text: 'Good. Nobody has said a word.' },
      { from: 'client', text: "Delete this thread." },
    ],
    himClosing:
      "second one this week. same feeling. im keeping the originals from now on",
  },
  {
    card: 'Three',
    dms: [
      { from: 'client', text: "my brother wasn't at the marina that night." },
      { from: 'you', text: 'ok. send it' },
      {
        from: 'client',
        text: "he's in the shot. he's in the window behind him. and he's in the water. all three.",
      },
      { from: 'client', text: "the boat and the dock have to stay or it proves nothing" },
    ],
    payoff: [
      { from: 'client', text: 'three of him. gone.' },
      { from: 'client', text: "he says thanks. he doesn't know what for" },
    ],
    himClosing:
      'ok. vantablack, grassrivers, the marina. same hand on all three. im putting them side by side',
  },
  {
    card: 'Four',
    dms: [
      { from: 'client', text: 'You did the marina job. Word travels.' },
      {
        from: 'client',
        text: "There's a photo of the front of my place going round with a date on it. The date is the problem, not the photo.",
      },
      { from: 'you', text: 'how wrong does the date need to be' },
      { from: 'client', text: 'About thirty years.' },
      {
        from: 'client',
        text: 'The name over the door stays. Nobody can tell which diner it is without it.',
      },
    ],
    payoff: [
      { from: 'client', text: 'Thirty years. Nobody has asked once.' },
      { from: 'client', text: 'That is the last I will bother you.' },
    ],
    himClosing:
      'four now. im putting all of them in one thread tonight. somebody is doing this for money',
  },
  {
    card: 'Five',
    dms: [
      { from: 'client', text: 'No names. You do good work.' },
      { from: 'you', text: 'who is this' },
      {
        from: 'client',
        text: "Different job. Not removing. Adding. I need his car in bay four at half one yesterday. It wasn't there.",
      },
      { from: 'you', text: 'whose car' },
      { from: 'client', text: "You already know. He's been posting about you for a week." },
      { from: 'client', text: 'Gate number stays in frame. And it needs a shadow.' },
    ],
    payoff: [
      { from: 'client', text: "That's him placed. Good." },
      { from: 'client', text: 'One more and he stops being a problem.' },
    ],
    himClosing:
      "thats my car. i was home. i have the router logs. somebody is putting me somewhere i wasnt",
  },
  {
    card: 'Six',
    dms: [
      { from: 'client', text: 'Last one. Then we are done.' },
      {
        from: 'client',
        text: 'This needs to look like it came out of a police archive, not off a phone. Frame it. Label it. Cover the witness.',
      },
      { from: 'you', text: 'and the case number' },
      {
        from: 'client',
        text: 'Get it right. Wrong number and the whole thing falls over. The real one is in the photo if you look.',
      },
    ],
    payoff: [
      { from: 'client', text: 'Filed.' },
      { from: 'client', text: 'You never worked for me.' },
    ],
    himClosing: 'ok',
  },
];

export const OPENING: Message[] = [
  {
    from: 'system',
    text: 'In Leonida, whatever you post becomes true. Edit the photo. Post it. Watch the street change.',
  },
];

export const ENDING = {
  headline: 'He was right about all of it.',
  body: [
    'Five jobs. A bouncer, a car, a brother, a parking bay and a police file.',
    'Nobody went to the marina. Nobody parked in bay four. The man on the door still works there, as far as he knows.',
    'Cal Hampton spent a week telling everyone the photos were wrong, and he was right every single time, about every single one.',
    'Nobody checked. They never do. That was always the job.',
  ],
};
