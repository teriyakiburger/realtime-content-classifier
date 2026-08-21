export type DemoSample = readonly [title: string, source: string, description: string];

// Deliberately mixes confident rule matches with genuinely context-poor fixtures.
export const demoSamples: DemoSample[] = [
  ["TypeScript release notes", "Local engineering feed", "A small update about software and code."],
  ["Local JavaScript workshop", "Engineering desk", "Developers compare browser code patterns."],
  ["Database migration guide", "Platform desk", "A software team documents a code migration."],
  ["Cloud deployment checklist", "Operations desk", "The software service reviews a code release."],
  ["Security patch notes", "Developer desk", "The software library fixes an authentication bug."],
  ["Council transport decision", "Local newsroom", "The headline reports officials announced a revised bus timetable."],
  ["Morning bulletin", "Regional desk", "A reporter covered the overnight power outage."],
  ["Public policy update", "Civic desk", "The newspaper report described a change to the permit rules."],
  ["Election count report", "News desk", "The regional report follows the completed vote count."],
  ["Storm warning report", "Weather desk", "A breaking report described the coastal storm."],
  ["New streaming series", "Culture desk", "A new movie series premiered on the streaming service."],
  ["Concert dates announced", "Music desk", "New music dates were added to the summer tour."],
  ["Puzzle game review", "Games desk", "A reviewer praised the mechanics of the new game adventure."],
  ["Theater production", "Arts desk", "A theater company opened its latest movie production."],
  ["Animated film guide", "Cinema desk", "The movie guide lists this season's animated films."],
  ["Community garden calendar", "Neighborhood desk", "Residents shared community volunteer gardening dates."],
  ["Cafe weekend menu", "Local business feed", "The community cafe posted its breakfast menu."],
  ["Library room hours", "Community feed", "The community library extended its quiet study hours."],
  ["Market opening times", "Local noticeboard", "The community market listed its weekend opening times."],
  ["Club meeting reminder", "Neighborhood group", "The local community club shared details for its next meeting."],
  ["A short update", "Local fixture feed", "The item was released today and discussed."],
  ["More details later", "Local fixture feed", "The author said more details would follow later."],
  ["An unexplained announcement", "Local fixture feed", "An unnamed group shared an unexplained announcement."],
  ["A vague entry", "Local fixture feed", "The feed entry is too vague to identify its category."],
  ["The item changed", "Local fixture feed", "The item changed and people noticed."],
  ["An update is pending", "Local fixture feed", "An update is pending without a stated subject."],
  ["A discussion continues", "Local fixture feed", "The discussion continues after the event."],
  ["A note for later", "Local fixture feed", "The note contains no recognizable topic."],
  ["A general message", "Local fixture feed", "This message does not identify what it concerns."],
  ["Compiler benchmark", "Engineering journal", "A programming team compares compiler startup time."],
  ["Device repair guide", "Technology desk", "The hardware guide explains a battery replacement."],
  ["Identity service update", "Infrastructure desk", "The software service rotates credentials automatically."],
  ["Harbor inspection", "City desk", "The evening report covers inspections at the harbor."],
  ["Research funding vote", "Public affairs desk", "The bulletin describes a vote on a research grant."],
  ["Festival lineup", "Culture calendar", "The music festival published its autumn lineup."],
  ["Board game night", "Leisure calendar", "The games club invited residents to a board game night."],
  ["Recycling collection", "Residents association", "The community notice lists the next collection day."],
  ["Farmers market stall", "Local noticeboard", "A neighborhood market added a new produce stall."],
  ["Something is changing", "Local fixture feed", "The post says circumstances are changing."],
  ["An item to review", "Local fixture feed", "The author asks readers to review an item without context."]
];

export function createDemoSamplePicker(random: () => number = Math.random): () => DemoSample {
  let bag: DemoSample[] = [];
  let previous: DemoSample | undefined;
  return () => {
    if (bag.length === 0) {
      bag = [...demoSamples];
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (previous && bag.length > 1 && bag[bag.length - 1] === previous) {
        [bag[bag.length - 1], bag[bag.length - 2]] = [bag[bag.length - 2], bag[bag.length - 1]];
      }
    }
    previous = bag.pop();
    return previous!;
  };
}
