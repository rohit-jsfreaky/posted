/**
 * The five chapters, and the people talking in them.
 *
 * The arc: he starts as an annoying reply, works out
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

/**
 * The people who reply to everything you post.
 *
 * Exported because the content check has to know them: a client handle that is
 * also one of these means the man arguing with your post in the feed is the same
 * man who paid for it, which nobody intended and everybody would notice.
 */
export const CROWD = ['nine_lives_vc', 'marla_qt', 'boardwalk_dan', 'leonida_lurker'] as const;

export const CHAPTERS: Chapter[] = [
  {
    card: 'One',
    dms: [
      { from: 'client', text: 'you the one who fixes photos?' },
      { from: 'you', text: 'depends what needs fixing' },
      {
        from: 'client',
        text: "Club Vantablack. I'm not on the list and I'm not going home. There's a guy on the door. One hour. $200.",
      },
    ],
    payoff: [
      { from: 'client', text: 'im inside. i dont know how you did that' },
      { from: 'client', text: 'sending the 200 now' },
    ],
    himClosing:
      'idk something about that vantablack pic is bugging me. cant say what yet',
  },
  {
    card: 'Two',
    dms: [
      { from: 'client', text: 'You came recommended. I need this quiet.' },
      {
        from: 'client',
        text: "There's a photo going round of my car outside a place I have never been to in my life. Take the car out of it.",
      },
      { from: 'you', text: 'anything in the shot that has to stay?' },
      {
        from: 'client',
        text: 'The street sign. People need to know which street it is.',
      },
      { from: 'client', text: "And don't be sloppy. People check." },
    ],
    payoff: [
      { from: 'client', text: 'Good. Nobody has said a word.' },
      { from: 'client', text: 'Delete this thread.' },
    ],
    himClosing:
      'second one this week. same feeling. im keeping the originals from now on',
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
      {
        from: 'client',
        text: 'the boat and the dock have to stay or it proves nothing',
      },
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
      { from: 'client', text: 'No names. You do good work.' },
      { from: 'you', text: 'who is this' },
      {
        from: 'client',
        text: "Different job. Not removing. Adding. I need his car in bay four at half one yesterday. It wasn't there.",
      },
      { from: 'you', text: 'whose car' },
      {
        from: 'client',
        text: "You already know. He's been posting about you for a week.",
      },
      {
        from: 'client',
        text: 'Gate number stays in frame. And it needs a shadow.',
      },
    ],
    payoff: [
      { from: 'client', text: "That's him placed. Good." },
      { from: 'client', text: 'One more and he stops being a problem.' },
    ],
    himClosing:
      'thats my car. i was home. i have the router logs. somebody is putting me somewhere i wasnt',
  },
  {
    card: 'Five',
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

/**
 * The jobs you can take on the side, keyed by level id.
 *
 * They have a client and a payoff like anything else, and he still replies,
 * because he reads everything. But none of it is a beat in the case he is
 * building: the run is five chapters whether these are played or not.
 */
export const SIDE_BRIEFS: Record<number, Chapter> = {
  6: {
    card: 'Side job',
    dms: [
      { from: 'client', text: 'Word travels. I am told you fix photographs.' },
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
      'somebody aged a photo of the flamingo by thirty years and the replies are all nostalgia. nobody checks anything',
  },
  7: {
    card: 'Side job',
    dms: [
      {
        from: 'client',
        text: 'Different client. Somebody passed on your name.',
      },
      {
        from: 'client',
        text: 'I have a photo of a van at the back of Delancey. Nobody cares about a photo somebody took on their phone.',
      },
      { from: 'you', text: 'so where did it come from' },
      {
        from: 'client',
        text: 'Camera four. It needs to look like it came off camera four.',
      },
      {
        from: 'client',
        text: 'The van stays in it. That is the whole point of it.',
      },
    ],
    payoff: [
      {
        from: 'client',
        text: 'They have taken it as footage. Nobody asked for the original.',
      },
      { from: 'client', text: 'I will not need you again.' },
    ],
    himClosing:
      'thats a phone photo dressed as a camera still. i can see the 4:3 crop line. nobody else can apparently',
  },
  8: {
    card: 'Side job',
    dms: [
      { from: 'client', text: 'You do the quiet stuff, right.' },
      {
        from: 'client',
        text: 'There are two bars on that block. One has a red sign, one has a pink one. I said I was at the red one.',
      },
      { from: 'you', text: 'and the photo says pink' },
      { from: 'client', text: 'Bright pink. You can see it on the road.' },
      { from: 'client', text: 'Leave the front of the place in it. That is how anyone knows which one it is.' },
    ],
    payoff: [
      { from: 'client', text: 'Red. Nobody has walked down there to check.' },
      { from: 'client', text: 'We never spoke.' },
    ],
    himClosing:
      'somebody turned the hue on a whole street last night. the neon is red now and the lamps inside are still warm, so they knew when to stop. thats not a beginner',
  },
};

export const ENDING = {
  headline: 'He was right about all of it.',
  body: [
    'Five jobs. A bouncer, a car, a brother, a parking bay and a police file.',
    'Nobody went to the marina. Nobody parked in bay four. The man on the door still works there, as far as he knows.',
    'Cal Hampton spent a week telling everyone the photos were wrong, and he was right every single time, about every single one.',
    'Nobody checked. They never do. That was always the job.',
  ],
};
