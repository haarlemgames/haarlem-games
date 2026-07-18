(function () {
  "use strict";

  const w = 3;
  const o = (label, trait, weight = w) => ({ label, trait, weight });

  const QUESTION_POOL = [
    { q: "Perfect Saturday night?", opts: [o("Backpacking under the stars","adventurous"), o("Candlelit dinner at home","homebody"), o("Dancing till sunrise","playful"), o("Working on a passion project","ambitious")] },
    { q: "Your love language?", opts: [o("Handwritten love letters","romantic"), o("Standing by them always","loyal"), o("Spontaneous road trips","adventurous"), o("Inside jokes & laughter","playful")] },
    { q: "Five years from now?", opts: [o("Built an empire together","ambitious"), o("Cozy house, dog, garden","homebody"), o("Lived in three countries","adventurous"), o("Still madly in love","romantic")] },
    { q: "First fight — how do you handle it?", opts: [o("Talk it out, hold hands","loyal"), o("Crack a joke, defuse it","playful"), o("Write them a poem after","romantic"), o("Take space, then reconnect","homebody")] },
    { q: "What do you bring to the marriage?", opts: [o("Drive and big dreams","ambitious"), o("Calm, warmth, presence","sweet"), o("Loyalty no matter what","loyal"), o("Endless adventure","adventurous")] },
    { q: "Self-care looks like…", opts: [o("Long run, cold plunge","ambitious"), o("Bubble bath & a novel","homebody"), o("Solo trip somewhere new","adventurous"), o("Calling a friend for hours","sweet")] },
    { q: "Friends describe you as…", opts: [o("The protector","loyal"), o("The planner","leader"), o("The chaos energy","playful"), o("The deep, soulful one","romantic")] },
    { q: "Money mindset?", opts: [o("Invest, build, multiply","ambitious"), o("Spend on experiences","adventurous"), o("Save for a cozy nest","homebody"), o("Whatever, I'm with you","sweet")] },
    { q: "Partner is sad. You…", opts: [o("Hold them in silence","sweet"), o("Take charge, fix it","leader"), o("Make them laugh","playful"), o("Write a heartfelt note","romantic")] },
    { q: "Dream honeymoon?", opts: [o("Trekking in Patagonia","adventurous"), o("A villa with no agenda","homebody"), o("Festivals in Lisbon","playful"), o("Private violinist in Venice","romantic")] },
    { q: "What ruins a date?", opts: [o("Phones on the table","loyal"), o("No real conversation","romantic"), o("No spontaneity","adventurous"), o("Too much planning","playful")] },
    { q: "Sunday morning is…", opts: [o("Pancakes in bed","sweet"), o("Trail run before sunrise","ambitious"), o("Hosting brunch for ten","leader"), o("Bookshop, no plans","homebody")] },
    { q: "Your idea of romance?", opts: [o("Slow-dancing in the kitchen","romantic"), o("Cooking together","homebody"), o("Sharing a wild secret","playful"), o("Choosing them every day","loyal")] },
    { q: "Conflict style?", opts: [o("Direct & honest","leader"), o("Empathetic listener","sweet"), o("Need processing time","homebody"), o("Solve it with humor","playful")] },
    { q: "Career or relationship?", opts: [o("Relationship, always","loyal"), o("Both, fiercely","ambitious"), o("Whatever lights me up","adventurous"), o("Build a life together","homebody")] },
    { q: "Pick a pet.", opts: [o("Big rescue dog","loyal"), o("Two chaotic kittens","playful"), o("A parrot named Steve","adventurous"), o("Just us, for now","homebody")] },
    { q: "Your guilty pleasure?", opts: [o("Reality TV marathons","playful"), o("Reading until 3am","homebody"), o("Designer coffee","ambitious"), o("Writing poems no one reads","romantic")] },
    { q: "What scares you most?", opts: [o("Wasting my potential","ambitious"), o("Being alone","sweet"), o("Settling for less","adventurous"), o("Losing the people I love","loyal")] },
    { q: "Best gift you've received?", opts: [o("A handwritten letter","romantic"), o("A surprise trip","adventurous"), o("Time, fully present","sweet"), o("Something they made","homebody")] },
    { q: "Texting style?", opts: [o("Long, thoughtful","romantic"), o("Quick & witty","playful"), o("Voice notes only","leader"), o("Reliable, every day","loyal")] },
    { q: "Holiday with the in-laws?", opts: [o("Charm them all","leader"), o("Quiet & polite","sweet"), o("Bring great wine","playful"), o("Help in the kitchen","homebody")] },
    { q: "Friday night plans?", opts: [o("Crowded rooftop bar","playful"), o("Quiet dinner for two","romantic"), o("Last-minute flight","adventurous"), o("Movie & takeout","homebody")] },
    { q: "Workout vibe?", opts: [o("Marathon training","ambitious"), o("Hot yoga","romantic"), o("Hiking trails","adventurous"), o("Long walks together","sweet")] },
    { q: "How do you celebrate wins?", opts: [o("Throw a big party","leader"), o("Quiet champagne at home","romantic"), o("Treat the team","sweet"), o("Already onto the next","ambitious")] },
    { q: "Your apology style?", opts: [o("Direct, no excuses","leader"), o("Acts of service","sweet"), o("A long heartfelt letter","romantic"), o("Show up consistently","loyal")] },
    { q: "Big purchase opinion?", opts: [o("Research for weeks","homebody"), o("Decide together fast","leader"), o("Spend on experiences","adventurous"), o("Save & wait","loyal")] },
    { q: "Where do you feel happiest?", opts: [o("By the ocean","adventurous"), o("In our kitchen","homebody"), o("On a stage","leader"), o("In their arms","romantic")] },
    { q: "Your dream home is…", opts: [o("Cabin in the woods","homebody"), o("Loft in the city","ambitious"), o("Beach bungalow","adventurous"), o("Anywhere they are","romantic")] },
    { q: "Kids someday?", opts: [o("Yes, a tribe","homebody"), o("Maybe one or two","sweet"), o("Open to it","loyal"), o("Not for me","ambitious")] },
    { q: "Pick a vacation.", opts: [o("Backpacking Vietnam","adventurous"), o("Tuscan vineyards","romantic"), o("Theme park chaos","playful"), o("All-inclusive, no thoughts","homebody")] },
    { q: "How do you flirt?", opts: [o("Deep eye contact","romantic"), o("Bold compliments","leader"), o("Playful teasing","playful"), o("Subtle kindness","sweet")] },
    { q: "Favorite season?", opts: [o("Autumn sweaters","homebody"), o("Hot summer nights","adventurous"), o("Snowy hideaways","romantic"), o("Spring renewal","sweet")] },
    { q: "Pick a chore.", opts: [o("Cook elaborate dinners","homebody"), o("Plan the calendar","leader"), o("Organize closets","ambitious"), o("Take care of plants","sweet")] },
    { q: "Big disappointment, you…", opts: [o("Process, then plan again","ambitious"), o("Need a hug first","sweet"), o("Channel it into art","romantic"), o("Get out of town","adventurous")] },
    { q: "What's non-negotiable?", opts: [o("Honesty","loyal"), o("Ambition","ambitious"), o("Kindness","sweet"), o("Adventure","adventurous")] },
    { q: "Your role in a friend group?", opts: [o("The host","leader"), o("The therapist","sweet"), o("The wildcard","playful"), o("The rock","loyal")] },
    { q: "Anniversary plans?", opts: [o("Recreate first date","romantic"), o("Surprise trip","adventurous"), o("Cook their favorite","homebody"), o("Throw a dinner party","leader")] },
    { q: "How do you receive love?", opts: [o("Words of affirmation","romantic"), o("Physical touch","sweet"), o("Acts of service","loyal"), o("Quality time","homebody")] },
    { q: "How do you give love?", opts: [o("Showing up always","loyal"), o("Big gestures","romantic"), o("Building a life","homebody"), o("Making them laugh","playful")] },
    { q: "Spontaneous trip — go?", opts: [o("Already packing","adventurous"), o("Only if planned","homebody"), o("If they come too","romantic"), o("Depends on work","ambitious")] },
    { q: "Friend in crisis at 2am.", opts: [o("On my way","loyal"), o("Stay on the phone","sweet"), o("Help them strategize","leader"), o("Bring snacks","playful")] },
    { q: "Compliment that lands?", opts: [o("\"You're brilliant.\"","ambitious"), o("\"You're so safe.\"","sweet"), o("\"You're hilarious.\"","playful"), o("\"You're stunning.\"","romantic")] },
    { q: "Your texting after a date?", opts: [o("\"Tonight was magic.\"","romantic"), o("\"Got home safe?\"","sweet"), o("\"When's the next one?\"","leader"), o("Send a meme","playful")] },
    { q: "Family dinner — your move?", opts: [o("Host it perfectly","leader"), o("Quietly help","sweet"), o("Be the entertainment","playful"), o("Bring everyone together","loyal")] },
    { q: "When you're stressed?", opts: [o("Run it out","ambitious"), o("Bake something","homebody"), o("Call my person","sweet"), o("Plan an escape","adventurous")] },
    { q: "Romantic movie or thriller?", opts: [o("Sappy romance","romantic"), o("Edge-of-seat thriller","adventurous"), o("Comedy always","playful"), o("Whatever they want","sweet")] },
    { q: "What do you collect?", opts: [o("Books","homebody"), o("Records","romantic"), o("Passport stamps","adventurous"), o("Stories","playful")] },
    { q: "What's your weakness?", opts: [o("Stubbornness","leader"), o("Overthinking","ambitious"), o("Caring too much","sweet"), o("Restlessness","adventurous")] },
    { q: "What's your superpower?", opts: [o("Reading the room","sweet"), o("Making things happen","leader"), o("Loyalty for life","loyal"), o("Finding the joke","playful")] },
    { q: "Pick a date idea.", opts: [o("Stargazing on a roof","romantic"), o("Cooking class","homebody"), o("Karting + cocktails","playful"), o("Hike & picnic","adventurous")] },
    { q: "Your communication style?", opts: [o("Direct & clear","leader"), o("Warm & curious","sweet"), o("Witty","playful"), o("Deep & slow","romantic")] },
    { q: "Pick a wedding size.", opts: [o("Just us, eloping","adventurous"), o("Close 30 people","homebody"), o("Big celebration","playful"), o("Whatever they want","sweet")] },
    { q: "Pet peeve in love?", opts: [o("Inconsistency","loyal"), o("Boredom","adventurous"), o("Coldness","sweet"), o("No ambition","ambitious")] },
    { q: "What makes you cry?", opts: [o("A good film","romantic"), o("Their kindness","sweet"), o("Saying goodbye","loyal"), o("Almost never","leader")] },
    { q: "Big dream right now?", opts: [o("Start my own thing","ambitious"), o("Travel for a year","adventurous"), o("Build a family","homebody"), o("Find a forever person","romantic")] },
    { q: "How loud is your love?", opts: [o("Shout it everywhere","romantic"), o("Quiet & deep","loyal"), o("Loud in the group chat","playful"), o("Steady & known","sweet")] },
    { q: "Coffee or tea?", opts: [o("Coffee, strong","ambitious"), o("Tea, slow morning","homebody"), o("Whatever's fastest","leader"), o("Coffee shop tour","adventurous")] },
    { q: "Pick a Sunday hobby.", opts: [o("Reading in a window","homebody"), o("Long bike ride","adventurous"), o("Hosting friends","leader"), o("Painting badly","playful")] },
    { q: "What's your green flag?", opts: [o("I always show up","loyal"), o("I'm warm","sweet"), o("I'm building something","ambitious"), o("I make life fun","playful")] },
    { q: "What's your red flag?", opts: [o("Workaholic","ambitious"), o("Too much chaos","playful"), o("Need lots of space","homebody"), o("Romantic to a fault","romantic")] },
    { q: "First date — who pays?", opts: [o("Whoever offered","leader"), o("Split it","ambitious"), o("Take turns","sweet"), o("Surprise them next time","romantic")] },
    { q: "Couple goals?", opts: [o("Cooking weekly","homebody"), o("Yearly big trip","adventurous"), o("Building a brand","ambitious"), o("Slow-dancing always","romantic")] },
    { q: "Where do you go to think?", opts: [o("A long walk","sweet"), o("The gym","ambitious"), o("Anywhere with water","romantic"), o("Bed, blanket, dark","homebody")] },
    { q: "Pet name you'd use?", opts: [o("Babe","playful"), o("My love","romantic"), o("Honey","sweet"), o("First name forever","leader")] },
    { q: "What's your home like?", opts: [o("Plants everywhere","sweet"), o("Minimalist","ambitious"), o("Books, candles, cozy","homebody"), o("Souvenirs from travels","adventurous")] },
    { q: "How do you decide together?", opts: [o("Pros & cons list","ambitious"), o("Vibe check","playful"), o("Talk it through slowly","sweet"), o("I'll lead, you trust me","leader")] },
    { q: "What turns you on?", opts: [o("Confidence","leader"), o("Tenderness","sweet"), o("Wit","playful"), o("Soulful eyes","romantic")] },
    { q: "Big life motto?", opts: [o("Build, build, build","ambitious"), o("Love loudly","romantic"), o("Stay loyal","loyal"), o("Say yes more","adventurous")] },
    { q: "Your worst habit?", opts: [o("Overworking","ambitious"), o("Avoiding hard talks","homebody"), o("Saying yes too much","sweet"), o("Always restless","adventurous")] },
    { q: "Birthday for partner?", opts: [o("Surprise weekend away","adventurous"), o("Cook their dream meal","homebody"), o("Throw a huge party","leader"), o("Write a love letter","romantic")] },
    { q: "What do you envy?", opts: [o("Confident people","leader"), o("Free spirits","adventurous"), o("Deeply settled couples","homebody"), o("People who say less","sweet")] },
    { q: "Holiday traditions?", opts: [o("Same place every year","homebody"), o("Always somewhere new","adventurous"), o("Big family meals","sweet"), o("Just us, ignore the world","romantic")] },
    { q: "How do you fight?", opts: [o("Calm & rational","leader"), o("Tears come quick","sweet"), o("Need to walk it off","homebody"), o("Need it resolved tonight","loyal")] },
    { q: "Phone in bed?", opts: [o("Never","romantic"), o("Always","ambitious"), o("Only on weekdays","sweet"), o("Doom-scrolling buddy","playful")] },
    { q: "How affectionate publicly?", opts: [o("Always touching","romantic"), o("Hand-holding only","sweet"), o("Private love","loyal"), o("Full PDA, no shame","playful")] },
    { q: "Pick a Friday meal.", opts: [o("Homemade pasta","homebody"), o("Street food crawl","adventurous"), o("Tasting menu","ambitious"), o("Pizza on the couch","playful")] },
    { q: "Hosting style?", opts: [o("Themed dinner parties","leader"), o("Casual, plenty of wine","playful"), o("Cook for hours","homebody"), o("Big intimate conversations","sweet")] },
    { q: "Best gift to give?", opts: [o("Something they mentioned once","sweet"), o("A trip","adventurous"), o("A handwritten letter","romantic"), o("An upgrade to their life","ambitious")] },
    { q: "What's your ideal pace?", opts: [o("Slow & savoring","homebody"), o("Always moving","ambitious"), o("Bursts of chaos","playful"), o("Steady & sure","loyal")] },
    { q: "Career change at 40?", opts: [o("Do it","adventurous"), o("Plan it for 2 years","ambitious"), o("Only with their support","loyal"), o("Stay the course","homebody")] },
    { q: "Therapy — yes or no?", opts: [o("Couples therapy always","sweet"), o("Solo, then together","ambitious"), o("Only if needed","leader"), o("Tried it, helped a lot","loyal")] },
    { q: "Best part of long-term love?", opts: [o("Inside jokes","playful"), o("Built a world","homebody"), o("Truly known","sweet"), o("Loyalty through it all","loyal")] },
    { q: "Pick a music night.", opts: [o("Stadium concert","playful"), o("Jazz bar","romantic"), o("Underground rave","adventurous"), o("Vinyl at home","homebody")] },
    { q: "How do you say sorry?", opts: [o("Direct, immediately","leader"), o("Make their favorite meal","homebody"), o("A long letter","romantic"), o("Show up better tomorrow","loyal")] },
    { q: "Pick a deal-breaker.", opts: [o("Dishonesty","loyal"), o("Cruelty","sweet"), o("No drive","ambitious"), o("No fun","playful")] },
    { q: "What's your ideal Sunday?", opts: [o("Long brunch with friends","playful"), o("Trail run + breakfast","ambitious"), o("Slow morning, no plans","homebody"), o("Drive to nowhere","adventurous")] },
    { q: "Big anniversary at 10 years?", opts: [o("Renew vows","romantic"), o("Trip we always dreamed of","adventurous"), o("Quiet weekend, just us","homebody"), o("Throw a huge party","leader")] },
    { q: "Friends or solo time?", opts: [o("Solo, recharge","homebody"), o("Friends every week","playful"), o("Balance, with partner","sweet"), o("Networking always","ambitious")] },
    { q: "Pet you'd never have?", opts: [o("Snake","sweet"), o("Bird","homebody"), o("Anything tiny","leader"), o("Nothing — too clean","ambitious")] },
    { q: "Pick a city to live.", opts: [o("Lisbon — warm & slow","homebody"), o("New York — always on","ambitious"), o("Tokyo — endless wonder","adventurous"), o("Paris — pure romance","romantic")] },
    { q: "Marriage in one word?", opts: [o("Home","homebody"), o("Adventure","adventurous"), o("Partnership","loyal"), o("Devotion","romantic")] },
    { q: "Pick a love story.", opts: [o("Slow burn over years","loyal"), o("Wild & fast","adventurous"), o("Best friends to lovers","sweet"), o("Sparks at first sight","romantic")] },
    { q: "How do you say I love you?", opts: [o("Every single day","romantic"), o("By showing up","loyal"), o("Quietly, with eyes","sweet"), o("Loud & often","playful")] },
    { q: "Pick a couples activity.", opts: [o("Cook together","homebody"), o("Train for a race","ambitious"), o("Travel monthly","adventurous"), o("Read same book","romantic")] },
    { q: "Mid-life crisis you?", opts: [o("Quit, travel","adventurous"), o("Start over, smarter","ambitious"), o("Buy a cabin","homebody"), o("Get a tattoo with them","playful")] },
    { q: "Best feedback you give?", opts: [o("Direct & kind","leader"), o("Soft, with examples","sweet"), o("Through a joke","playful"), o("In a long letter","romantic")] },
    { q: "How do you celebrate them?", opts: [o("Throw a surprise","playful"), o("Public love post","romantic"), o("Quiet, deep moment","sweet"), o("Brag to everyone","leader")] },
  ];

  const SOLO_POOL = [
    { scene: "You're at a solo cafe. A cute stranger smiles.", options: [
      { label: "Smile back, say hi", points: 25, reply: "+25 confidence" },
      { label: "Pretend to read your book", points: 8, reply: "+8 self-care" },
      { label: "Leave immediately", points: 2, reply: "+2 cardio" },
    ]},
    { scene: "Friends invite you to karaoke night.", options: [
      { label: "Sing your heart out", points: 30, reply: "+30 main character" },
      { label: "Tambourine duty", points: 15, reply: "+15 vibes" },
      { label: "Stay home, mask & wine", points: 10, reply: "+10 healing" },
    ]},
    { scene: "Last-minute weekend in Lisbon offered.", options: [
      { label: "Pack in 30 minutes", points: 35, reply: "+35 adventure" },
      { label: "Go, but stressed", points: 18, reply: "+18 growth" },
      { label: "Decline, journal instead", points: 12, reply: "+12 reflection" },
    ]},
    { scene: "An ex texts: 'thinking of you'.", options: [
      { label: "Block them. Next.", points: 40, reply: "+40 self-respect" },
      { label: "Reply: 'I've moved on.'", points: 22, reply: "+22 closure" },
      { label: "Spiral for 3 hours", points: 5, reply: "+5… growth, I guess?" },
    ]},
    { scene: "You see a pottery class starting tonight.", options: [
      { label: "Sign up on the spot", points: 28, reply: "+28 new hobby" },
      { label: "Save it for later", points: 8, reply: "+8 maybe" },
      { label: "Watch a YouTube tutorial", points: 12, reply: "+12 home skill" },
    ]},
    { scene: "Your boss offers a promotion with travel.", options: [
      { label: "Say yes immediately", points: 32, reply: "+32 ambition" },
      { label: "Negotiate harder", points: 26, reply: "+26 confidence" },
      { label: "Need a week to think", points: 14, reply: "+14 wisdom" },
    ]},
    { scene: "A friend sets you up on a blind date.", options: [
      { label: "Go open-hearted", points: 24, reply: "+24 hope" },
      { label: "Go, but cynical", points: 10, reply: "+10 stories" },
      { label: "Cancel last minute", points: 4, reply: "+4 self-protection" },
    ]},
    { scene: "Saturday morning — what now?", options: [
      { label: "Farmer's market alone", points: 18, reply: "+18 peace" },
      { label: "Long run by the river", points: 22, reply: "+22 endorphins" },
      { label: "Stay in bed all day", points: 8, reply: "+8 rest" },
    ]},
    { scene: "An old friend visits from out of town.", options: [
      { label: "Cook them dinner", points: 24, reply: "+24 connection" },
      { label: "Hit the town all night", points: 28, reply: "+28 chaos" },
      { label: "Coffee, then bail", points: 8, reply: "+8 boundaries" },
    ]},
    { scene: "You match with someone interesting on an app.", options: [
      { label: "Suggest meeting this week", points: 26, reply: "+26 momentum" },
      { label: "Banter for two weeks first", points: 14, reply: "+14 patience" },
      { label: "Ghost — not feeling it", points: 6, reply: "+6 clarity" },
    ]},
    { scene: "Therapy session — what comes up?", options: [
      { label: "Talk about the wedding", points: 30, reply: "+30 healing" },
      { label: "Talk about your mother", points: 24, reply: "+24 root work" },
      { label: "Cancel and reschedule", points: 4, reply: "+4 avoidance" },
    ]},
    { scene: "You inherit $5,000 unexpectedly.", options: [
      { label: "Solo trip to Japan", points: 30, reply: "+30 adventure" },
      { label: "Invest it all", points: 22, reply: "+22 maturity" },
      { label: "Treat your friends", points: 18, reply: "+18 generosity" },
    ]},
    { scene: "A wedding invite arrives — your ex is the bride.", options: [
      { label: "Go in your best outfit", points: 32, reply: "+32 power" },
      { label: "Send a polite no", points: 18, reply: "+18 grace" },
      { label: "Cry, then RSVP yes", points: 14, reply: "+14 messy growth" },
    ]},
    { scene: "Your apartment lease ends in a month.", options: [
      { label: "Move somewhere brave", points: 28, reply: "+28 reinvention" },
      { label: "Renew — it's home", points: 12, reply: "+12 stability" },
      { label: "Move in with a friend", points: 18, reply: "+18 community" },
    ]},
    { scene: "You're invited to a silent retreat.", options: [
      { label: "Three days, no phone", points: 30, reply: "+30 clarity" },
      { label: "One day, you'll try", points: 14, reply: "+14 dipping in" },
      { label: "Hard pass", points: 4, reply: "+4 honesty" },
    ]},
    { scene: "Late-night doomscroll — your wedding photos appear.", options: [
      { label: "Delete the app", points: 26, reply: "+26 protection" },
      { label: "Look once, close it", points: 12, reply: "+12 acceptance" },
      { label: "Spiral for an hour", points: 2, reply: "+2 oof" },
    ]},
    { scene: "A stranger compliments your laugh.", options: [
      { label: "Say thank you, smile", points: 20, reply: "+20 lightness" },
      { label: "Deflect awkwardly", points: 6, reply: "+6 humility" },
      { label: "Flirt back", points: 26, reply: "+26 spark" },
    ]},
    { scene: "Your mother calls to check in.", options: [
      { label: "Tell her the truth", points: 24, reply: "+24 honesty" },
      { label: "Keep it light", points: 14, reply: "+14 grace" },
      { label: "Send to voicemail", points: 4, reply: "+4 boundaries" },
    ]},
    { scene: "Gym, new yoga teacher, you're nervous.", options: [
      { label: "Front row, full focus", points: 22, reply: "+22 presence" },
      { label: "Back row, hide", points: 10, reply: "+10 still showed up" },
      { label: "Skip it, walk home", points: 4, reply: "+4 self-trust" },
    ]},
    { scene: "Big birthday is in two weeks.", options: [
      { label: "Throw yourself a party", points: 28, reply: "+28 celebration" },
      { label: "Solo trip, no one knows", points: 22, reply: "+22 peace" },
      { label: "Quiet dinner, two friends", points: 16, reply: "+16 intimacy" },
    ]},
    { scene: "You bump into your wedding officiant at a bookstore.", options: [
      { label: "Hug them, catch up", points: 24, reply: "+24 closure" },
      { label: "Polite hello, leave", points: 12, reply: "+12 maturity" },
      { label: "Hide in poetry section", points: 4, reply: "+4 same" },
    ]},
    { scene: "A friend asks: are you ready to date again?", options: [
      { label: "Yes — really mean it", points: 28, reply: "+28 readiness" },
      { label: "Not quite, but close", points: 18, reply: "+18 honesty" },
      { label: "Hard no", points: 8, reply: "+8 self-knowing" },
    ]},
    { scene: "You start journaling daily.", options: [
      { label: "Stick with it 30 days", points: 26, reply: "+26 discipline" },
      { label: "Skip days, keep going", points: 14, reply: "+14 realism" },
      { label: "Quit by day 4", points: 4, reply: "+4 tried it" },
    ]},
    { scene: "Old friend says you've changed.", options: [
      { label: "Take it as a compliment", points: 24, reply: "+24 self-trust" },
      { label: "Ask what they mean", points: 18, reply: "+18 curiosity" },
      { label: "Get defensive", points: 6, reply: "+6 honesty" },
    ]},
    { scene: "You start writing your dating profile.", options: [
      { label: "Honest, bold, you", points: 26, reply: "+26 alignment" },
      { label: "Safe and curated", points: 12, reply: "+12 caution" },
      { label: "Delete the app", points: 8, reply: "+8 patience" },
    ]},
    { scene: "Friends invite you on a girls'/guys' trip.", options: [
      { label: "Go, all in", points: 28, reply: "+28 belonging" },
      { label: "Join for one weekend", points: 18, reply: "+18 balance" },
      { label: "Can't afford it, decline", points: 8, reply: "+8 boundaries" },
    ]},
    { scene: "You realize you're laughing again.", options: [
      { label: "Notice & write it down", points: 26, reply: "+26 awareness" },
      { label: "Call your best friend", points: 22, reply: "+22 share it" },
      { label: "Don't make it weird", points: 12, reply: "+12 keep going" },
    ]},
    { scene: "A coworker keeps flirting.", options: [
      { label: "Politely shut it down", points: 22, reply: "+22 clarity" },
      { label: "Mild flirting back", points: 14, reply: "+14 spark" },
      { label: "Report it if it continues", points: 26, reply: "+26 self-respect" },
    ]},
    { scene: "You finish a book you've been avoiding.", options: [
      { label: "Start another tonight", points: 22, reply: "+22 momentum" },
      { label: "Tell a friend about it", points: 16, reply: "+16 connection" },
      { label: "Sit with it quietly", points: 18, reply: "+18 reflection" },
    ]},
    { scene: "You feel ready. Truly.", options: [
      { label: "Apply for the experiment again", points: 40, reply: "+40 hope" },
      { label: "One more month for me", points: 22, reply: "+22 wisdom" },
      { label: "Take a long walk", points: 16, reply: "+16 stillness" },
    ]},
  ];

  const NAMES = ["Jordan","Avery","Sasha","Rowan","Kai","Sloane","Quinn","River","Ellis","Marlowe","Sienna","Theo","Indie","Nico","Wren","Amani","Yuki","Leo","Mira","Cassidy","Bo","Niko","Frey","Lior","Sage","Remy","Ines","Arlo","Noor","Juno"];
  const JOBS = ["pastry chef","ER nurse","indie game developer","travel photographer","architect","high school teacher","sommelier","marine biologist","jazz pianist","UX designer","wildfire researcher","stand-up comic","ceramicist","perfumer","documentary editor","kindergarten teacher","tattoo artist","translator","screenwriter","climate lawyer"];
  const QUIRKS = ["collects vintage records","restores old motorcycles","makes their own sourdough","has a podcast about ghosts","speaks four languages badly","has hiked Kilimanjaro twice","writes haiku on receipts","rescued three cats from one alley","plays D&D every Thursday","has a tattoo for every breakup","keeps bees on the roof","wakes up at 4am to surf","makes their own kombucha","grew up in five countries","reads two books a week"];

  const OLDER_QUIRKS = ["owns six vintage cars and refuses to sell a single one","has been married three times — swears this one's the one","has two grown kids who still call for money","collects fountain pens and won't stop complaining about email","has strong opinions about how the mail used to work","still uses a flip phone, unironically","has been to 40+ countries and will not stop talking about Peru","keeps a boat they haven't used in six years","has a golf handicap they bring up unprompted","grows tomatoes the size of a human head","has a group chat with four ex-brothers-in-law, somehow","refers to their 401k the way other people talk about their children"];
  const FAMILIES = ["youngest of four","only child raised by their grandmother","middle child, big chaotic family","raised by two moms","second-generation immigrant","grew up on a farm","army kid, moved 11 times","raised in a small fishing village"];

  const OLDER_FAMILIES = ["divorced twice, three grown kids between them","widowed young, raised two kids solo, finally ready to date again","empty nester — five grandkids and counting","married their college sweetheart for 22 years before it ended","divorced once, engaged once, single by choice for a decade since","has three grown children and a very opinionated family group chat","raised four kids who now all live suspiciously close to each other"];

  const REDFLAGS = [
    { text: "texts back in 3-day bursts", trait: null },
    { text: "really cannot do small talk", trait: null },
    { text: "ghosted their last therapist", trait: null },
    { text: "calls their mother daily, mid-date", trait: null },
    { text: "names every plant in the house", trait: null },
    { text: "won't watch movies without subtitles, even in English", trait: null },
    { text: "has 4 unfinished novels", trait: null },
    { text: "sleeps with the TV on", trait: null },
    { text: "insults the waiter the second service is slow", trait: "mean" },
    { text: "brings up their ex's flaws completely unprompted", trait: "jealous" },
    { text: "checks your phone 'just to see the time'", trait: "jealous" },
    { text: "has loud, confident opinions about wine they can't actually taste", trait: "snob" },
    { text: "once got banned from a casino, refuses to say why", trait: null },
    { text: "still keeps a shrine-adjacent shelf for college trophies", trait: "selfassured" },
    { text: "brags about their salary within the first ten minutes", trait: "selfassured" },
    { text: "has 'accidentally' kept a towel from every hotel they've stayed at", trait: "kleptomaniac" },
    { text: "throws actual tantrums when they lose board games", trait: "childish" },
    { text: "keeps a burner account just to watch an ex's stories", trait: "jealous" },
    { text: "has never once loaded a dishwasher correctly, possibly on purpose", trait: "slob" },
    { text: "refers to their car by a pet name, more affectionately than most pets", trait: "materialistic" },
    { text: "will absolutely make a scene over a parking spot", trait: "hotheaded" },
    { text: "keeps unread texts in the thousands, deliberately, as a power move", trait: "insider" },
    { text: "has 'borrowed' money from three separate friend groups", trait: "frugal" },
    { text: "laughs a beat too long when someone else trips", trait: "evil" },
    { text: "has never apologized first in their life, allegedly", trait: "mean" },
    { text: "will interrupt a funeral story to pivot back to themselves", trait: "selfassured" },
    { text: "keeps receipts — literal ones, in a shoebox, 'for leverage'", trait: "evil" },
    { text: "still hasn't returned a library book from 2019", trait: null },
    { text: "calls it 'decluttering' when they quietly throw your things away", trait: "mean" },
    { text: "has ranked their friends 1 through 10, out loud, to your face", trait: "mean" },
    { text: "gets suspiciously competitive during 'casual' trivia night", trait: "hotheaded" },
    { text: "leaves exactly one shoe in every room of the house, permanently", trait: "slob" },
    { text: "has a group chat literally named 'the exes'", trait: "jealous" },
    { text: "orders the most expensive thing on the menu, then 'forgets' their wallet", trait: "frugal" },
    { text: "sulks for an entire day over a joke nobody else even remembers", trait: "childish" },
    { text: "has genuinely tried to fight a seagull over a plate of fries", trait: null },
    { text: "name-drops minor celebrities they met once, constantly", trait: "snob" },
    { text: "keeps score of every favor owed, in an actual notebook", trait: "mean" },
    { text: "has never once said 'you were right' about anything, ever", trait: "hotheaded" },
    { text: "still 'accidentally' likes an ex's photos from 2017", trait: "jealous" },
    { text: "makes everything a competition, up to and including grief", trait: "hotheaded" },
    { text: "has a whole LinkedIn persona nobody who knows them recognizes", trait: "insider" },
    { text: "genuinely believes punctuality is 'a construct'", trait: null },
    { text: "has been banned from at least one all-you-can-eat buffet", trait: "glutton" },
    { text: "sets the thermostat as a power move, not a comfort setting", trait: "hotheaded" },
    { text: "narrates their own workout PRs to total strangers, unprompted", trait: "selfassured" },
    { text: "has three different group chats dedicated to complaining about the same person", trait: "gloomy" },
    { text: "cries — genuinely cries — when a food delivery is four minutes late", trait: "childish" },
  ];
  const GREENFLAGS = [
    { text: "remembers every story you tell", trait: null },
    { text: "actually listens", trait: null },
    { text: "tips 25% always", trait: null },
    { text: "cried once during a Pixar trailer", trait: "sweet" },
    { text: "keeps friends from every era", trait: "loyal" },
    { text: "calls their grandparents weekly", trait: "familyoriented" },
    { text: "puts the phone face-down at dinner", trait: null },
    { text: "plans low-key surprises", trait: "romantic" },
    { text: "still writes actual thank-you cards", trait: "sweet" },
    { text: "remembers exactly how you take your coffee", trait: null },
    { text: "genuinely cheers for other people's wins", trait: "cheerful" },
    { text: "carries snacks for literal strangers", trait: "sweet" },
    { text: "reads the acknowledgments page of every book", trait: "bookworm" },
    { text: "has never once left a one-star review out of spite", trait: null },
    { text: "texts the group chat happy birthday first, every single time", trait: "loyal" },
    { text: "learned your love language without ever being told", trait: "romantic" },
    { text: "apologizes first, even when it's not fully their fault", trait: null },
    { text: "has a five-year plan and somehow already made room for you in it", trait: "ambitious" },
    { text: "still gets nervous before a first kiss, every single time", trait: "romantic" },
    { text: "donates the good clothes, not just the ratty ones", trait: null },
    { text: "will absolutely fight a stranger's unfair review with facts and sources", trait: "loyal" },
    { text: "keeps a running list of your favorite things, completely unprompted", trait: "sweet" },
    { text: "shows up early to help set up, not just to attend", trait: "familyoriented" },
    { text: "genuinely, unreasonably loves your weird laugh", trait: null },
    { text: "has never ghosted anyone, not even a badly matched date", trait: "loyal" },
    { text: "makes friends with literally every dog on the street", trait: "cheerful" },
    { text: "packs a go-bag for spontaneous adventures, just in case", trait: "adventurous" },
    { text: "keeps the thermostat compromise scrupulously fair", trait: "homebody" },
    { text: "will absolutely rearrange the furniture at 11pm because 'it just came to them'", trait: "creative" },
    { text: "still has the ticket stub from your first date", trait: "romantic" },
    { text: "color-codes the spice rack, unprompted, purely out of love", trait: "neat" },
    { text: "genuinely enjoys grocery shopping with you, every week", trait: "homebody" },
    { text: "always orders dessert 'to share' and quietly gives you the bigger half", trait: "sweet" },
    { text: "knows the name of every barista at your regular spot", trait: "outgoing" },
    { text: "keeps a mental list of every kind thing you've forgotten you did", trait: null },
    { text: "will absolutely stand up for the intern in a meeting", trait: "leader" },
    { text: "has never once said 'we need to talk' as a threat", trait: null },
    { text: "cries at weddings that aren't even theirs", trait: "sweet" },
    { text: "believes you when you say you're fine, then checks anyway", trait: null },
    { text: "remembers your parents' anniversary better than you do", trait: "familyoriented" },
    { text: "will drive forty-five minutes for your favorite food, zero complaints", trait: "loyal" },
    { text: "always splits the last slice exactly in half, to the millimeter", trait: "perfectionist" },
    { text: "genuinely can't stay mad past one good joke", trait: "playful" },
    { text: "keeps a folder of your accomplishments for when you doubt yourself", trait: "ambitious" },
    { text: "has never let a birthday pass unnoticed, not even acquaintances'", trait: "outgoing" },
    { text: "narrates museum plaques out loud like a personal tour guide, and it's oddly delightful", trait: "artlover" },
    { text: "genuinely gets excited describing the plot of a book you'll never read", trait: "bookworm" },
  ];

  function pickFlag(pool, desiredTraits, seed) {
    if (desiredTraits && desiredTraits.length) {
      const matching = pool.filter((f) => f.trait && desiredTraits.includes(f.trait));
      if (matching.length) return pickOne(matching, seed).text;
    }
    return pickOne(pool, seed).text;
  }
  const HEARTBREAKS = ["a five-year relationship that ended last spring","a long engagement they walked away from","being left at the altar two years ago","losing someone they thought was the one","a divorce they don't talk about much"];
  const HOPES = ["wants a real partner, not a project","is ready to build something lasting","wants someone who can sit in silence with them","is finally choosing love over career","wants to be picked first, just once"];

  function pickN(arr, n, seed) {
    const a = [...arr];
    const out = [];
    let s = seed >>> 0;
    for (let i = 0; i < n && a.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      out.push(a.splice(s % a.length, 1)[0]);
    }
    return out;
  }

  function pickOne(arr, seed) {
    return arr[seed % arr.length];
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
    return h >>> 0;
  }

  function ageBracketFor(age, brackets) {
    for (const bracket of brackets) {
      if (age >= bracket[0] && age <= bracket[1]) return bracket;
    }
    return brackets[brackets.length - 1];
  }

  const COUNTRY_FLAVOR = {
    "United States": "road-tripped all 50 states before turning 30 — has the national park stamps to prove it.",
    "Canada": "still says sorry to furniture when they bump into it.",
    "Mexico": "makes tamales from scratch every December with three generations of the family.",
    "Brazil": "has never missed a Carnaval block party, rain or shine.",
    "Argentina": "can talk for an hour about a soccer match from 2006.",
    "Chile": "grew up watching the sunset over the Andes from their kitchen window.",
    "Colombia": "puts arepas on the table for literally any occasion.",
    "Peru": "will defend ceviche as a breakfast food, no notes.",
    "United Kingdom": "has a strong, specific opinion about the correct way to make tea.",
    "Ireland": "can turn any small talk into a twenty-minute story with a proper ending.",
    "France": "has strong opinions about bread and will not apologize for them.",
    "Germany": "shows up exactly on time, every time, no exceptions.",
    "Netherlands": "bikes everywhere, rain or shine, no complaints.",
    "Belgium": "has a favorite fries stand and will die on that hill.",
    "Switzerland": "keeps a surprisingly organized spice drawer, alphabetized.",
    "Austria": "grew up five minutes from a proper alpine hiking trail.",
    "Portugal": "knows every verse of at least one fado song by heart.",
    "Spain": "doesn't understand eating dinner before 9pm and never will.",
    "Italy": "has a nonna's recipe they refuse to write down, ever.",
    "Denmark": "has fully committed to hygge as a personality trait.",
    "Sweden": "takes fika seriously — the coffee break is non-negotiable.",
    "Norway": "has hiked a fjord before breakfast, more than once.",
    "Finland": "considers a sauna the correct answer to most problems.",
    "Iceland": "has strong feelings about the correct geothermal pool etiquette.",
    "Poland": "makes pierogi from scratch every holiday, filling debates included.",
    "Czechia": "has a favorite pub they've been loyal to for a decade.",
    "Hungary": "makes a goulash that's been in the family for three generations.",
    "Romania": "grew up with a grandmother who could out-cook any restaurant.",
    "Greece": "has a whole island they consider 'theirs,' emotionally.",
    "Ukraine": "makes varenyky every New Year's, family recipe, no shortcuts.",
    "Turkey": "will serve you tea before you've even sat down.",
    "Israel": "argues passionately about hummus, and means every word.",
    "United Arab Emirates": "has watched the sunset over the desert more times than over a skyline.",
    "Saudi Arabia": "makes the best Arabic coffee you'll ever be offered.",
    "South Africa": "grew up thirty minutes from a proper braai every weekend.",
    "Egypt": "has family stories that go back further than most countries have existed.",
    "Nigeria": "has a jollof rice opinion and will not be moved on it.",
    "Kenya": "grew up watching sunrise over the savanna more than over a city skyline.",
    "Morocco": "makes mint tea the proper way — three pours, no exceptions.",
    "India": "has a spice blend passed down that nobody outside the family gets the recipe for.",
    "Pakistan": "makes a biryani that ends every family debate about whose is best.",
    "Bangladesh": "has a fish curry recipe that's basically a family heirloom.",
    "Thailand": "has strong opinions about how spicy 'spicy' is actually supposed to be.",
    "Singapore": "has a hawker centre order memorized down to the exact stall.",
    "Malaysia": "will argue their state has the best version of every dish, always.",
    "Indonesia": "grew up with a grandmother's sambal recipe nobody else can replicate.",
    "Philippines": "shows up to every gathering with enough food for twice as many people.",
    "Vietnam": "makes a pho broth that simmers for an entire day, no shortcuts.",
    "Hong Kong": "has a favorite dim sum spot and a strict Sunday-morning ritual around it.",
    "China": "still calls their grandmother every Sunday, no matter the time zone.",
    "South Korea": "treats a proper skincare routine as a form of self-respect.",
    "Japan": "still sends handwritten New Year's cards the old-fashioned way.",
    "Australia": "has strong opinions about the correct beach for a summer Christmas.",
    "New Zealand": "has hiked more of the country than most locals ever will.",
  };

  function buildPartner(seed, gender, playerCountry, allCountries, playerAge, ageBrackets, desiredTraits) {
    const name = pickOne(NAMES, seed);
    const bracket = ageBracketFor(playerAge, ageBrackets);
    const span = bracket[1] - bracket[0] + 1;
    const age = bracket[0] + (seed % span);
    const job = pickOne(JOBS, seed >>> 2);
    const country = playerCountry && playerCountry !== "Anywhere"
      ? playerCountry
      : pickOne(allCountries && allCountries.length ? allCountries : ["Somewhere"], seed >>> 4);
    const isOlder = age >= 45;
    const quirk = isOlder ? pickOne(OLDER_QUIRKS, seed >>> 6) : pickOne(QUIRKS, seed >>> 6);
    const family = isOlder ? pickOne(OLDER_FAMILIES, seed >>> 8) : pickOne(FAMILIES, seed >>> 8);
    const green = pickFlag(GREENFLAGS, desiredTraits, seed >>> 10);
    const red = pickFlag(REDFLAGS, desiredTraits, seed >>> 12);
    const heartbreak = pickOne(HEARTBREAKS, seed >>> 14);
    const hope = pickOne(HOPES, seed >>> 16);
    const cultureNote = COUNTRY_FLAVOR[country] || null;
    return {
      name,
      age,
      gender,
      job,
      country,
      quirk,
      family,
      greenFlag: green,
      redFlag: red,
      heartbreak,
      hope,
      cultureNote,
      oneLiner: `${job}, ${age}, from ${country} — ${quirk}.`,
    };
  }

  const NAME_EASTER_EGGS = {
    cathy: {
      name: "Martha",
      job: "accountant",
      country: "United States",
      quirk: "still makes her abuela's arroz con pollo every Sunday, no substitutions",
      family: "grew up in Medellín, Colombia, moved to the U.S. for grad school and never left",
      greenFlag: "never misses a birthday, hers or anyone else's",
      redFlag: "will absolutely correct your tax math at dinner",
      heartbreak: "a long-distance relationship that finally ran out of road",
      hope: "wants someone who's as ready to stay as she is",
      cultureNote: "still calls her Colombian side of the family every Sunday, no matter the time zone.",
    },
  };

  function hasNameEasterEgg(name) {
    return !!NAME_EASTER_EGGS[String(name || "").trim().toLowerCase()];
  }

  function buildNameEasterEggPartner(name, gender, playerAge, ageBrackets) {
    const egg = NAME_EASTER_EGGS[String(name || "").trim().toLowerCase()];
    if (!egg) return null;
    const bracket = ageBracketFor(playerAge, ageBrackets);
    const span = bracket[1] - bracket[0] + 1;
    const age = bracket[0] + Math.floor(span / 2);
    return {
      name: egg.name,
      age,
      gender,
      job: egg.job,
      country: egg.country,
      quirk: egg.quirk,
      family: egg.family,
      greenFlag: egg.greenFlag,
      redFlag: egg.redFlag,
      heartbreak: egg.heartbreak,
      hope: egg.hope,
      cultureNote: egg.cultureNote,
      oneLiner: `${egg.job}, ${age}, from ${egg.country} — ${egg.quirk}.`,
    };
  }

  function pickQuestions(seed, count) {
    return pickN(QUESTION_POOL, count, seed);
  }
  function pickSoloScenes(seed, count) {
    return pickN(SOLO_POOL, count, seed);
  }

  const DATE_SLOTS = [
    {
      id: "coffee",
      emoji: "☕",
      title: "Coffee",
      variants: [
        {
          opener: "So... what's your biggest red flag?",
          replies: [
            { label: "Honestly? I care too much.", reaction: "That's either a red flag or the nicest thing anyone's said to me all week. I'll allow it.", delta: 6 },
            { label: "I steal fries. Off your plate. No warning.", reaction: "Bold. Slightly terrifying. Weirdly attractive.", delta: 8 },
            { label: "I'll tell you mine if you tell me yours.", reaction: "Deal. I still have every birthday card anyone's ever given me — including one from my dentist's office.", delta: 12, rewarded: true },
          ],
          questionPrompt: "So — what do you ask?",
          questions: [
            { label: "What's your biggest dream?", answer: "Open a tiny bakery that sells exactly one perfect croissant a day. Scarcity marketing.", delta: 4 },
            { label: "Worst date you've ever been on?", answer: "Someone brought their mom. She ordered for me.", delta: 4 },
            { label: "What's something you've never told anyone?", answer: "I still have a voicemail from my grandma saved. I can't delete it. I just... can't.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Okay, real talk, before this goes any further: pineapple on pizza. Yes or no.",
          replies: [
            { label: "Yes. Fight me.", reaction: "Oh, we're going to have problems. I respect it though.", delta: 6 },
            { label: "Absolutely not. That's a war crime.", reaction: "Finally, someone with a moral compass.", delta: 8 },
            { label: "Depends what you're willing to do to change my mind.", reaction: "Bold opening move for a coffee date. I like it.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What's the last thing that made you laugh out loud?", answer: "A video of a dog that fell asleep mid-bark. Still not over it.", delta: 4 },
            { label: "Coffee order that says the most about you?", answer: "Black coffee, no sugar. I contain multitudes.", delta: 4 },
            { label: "What's a weirdly specific thing you're proud of?", answer: "I can parallel park in one try, every time. It's the only skill I trust myself with.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Okay, I read your profile bio at least four times before this. Be honest — did you write that yourself?",
          replies: [
            { label: "Every word. I workshopped it for a week.", reaction: "A week?! Incredible commitment to a bio about liking hiking.", delta: 6 },
            { label: "My best friend wrote it. I take zero responsibility.", reaction: "Smart. Outsourcing your charm. Efficient.", delta: 8 },
            { label: "I stole a line from a movie and I'm not telling you which one.", reaction: "Now I have to know. This is officially a mystery date.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What's the most used app on your phone, honestly?", answer: "A weather app. I check it eleven times a day for no reason.", delta: 4 },
            { label: "What's your go-to karaoke song, no judgment?", answer: "Anything by ABBA. Judgment accepted anyway.", delta: 4 },
            { label: "What's something on your profile that wasn't 100% true?", answer: "I said I 'love hiking.' I've hiked once. It was hard. I complained the whole time.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Real question: what's your love language? And don't just say 'quality time' because it sounds good on a dating profile.",
          replies: [
            { label: "Physical touch, unapologetically.", reaction: "Bold answer for a first coffee. I like where your head's at.", delta: 6 },
            { label: "Acts of service. Fix my Wi-Fi and I'm yours.", reaction: "Noted. I already know three router settings. We're basically engaged.", delta: 8 },
            { label: "Honestly? Words of affirmation. Tell me I did a good job and I'll follow you anywhere.", reaction: "Duly noted. You did a good job walking in here today, by the way.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What's yours?", answer: "Quality time, actually. I just didn't want to say it first.", delta: 4 },
            { label: "Has anyone ever gotten your love language completely wrong?", answer: "My ex bought me a treadmill for our anniversary. We are no longer together. Unrelated, probably.", delta: 4 },
            { label: "What would it look like if someone loved you exactly right?", answer: "Honestly? Kind of like this. Sitting here, overthinking coffee orders together.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Okay, gut check: on a scale of one to feral, how much of a morning person are you?",
          replies: [
            { label: "A solid ten. I'm insufferable before 7am.", reaction: "We might need separate bedrooms. I'm kidding. Mostly.", delta: 6 },
            { label: "Negative numbers. I don't speak until my second coffee.", reaction: "Understood. I'll just point at things and you nod.", delta: 8 },
            { label: "Depends entirely on who's next to me when I wake up.", reaction: "...okay, that's a genuinely good answer. I did not expect to be charmed this early.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What's your actual morning routine?", answer: "Snooze four times, panic, leave the house with one-shoe energy even when I have both shoes.", delta: 4 },
            { label: "Coffee or tea, and is this a dealbreaker?", answer: "Coffee. If you say tea I'll still marry you, I'll just judge you internally forever.", delta: 4 },
            { label: "What does a perfect morning with someone actually look like to you?", answer: "Quiet. Slow. Someone who doesn't need me to perform a personality before 9am.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Quick vibe check: cats, dogs, or 'I'm allergic to commitment and also cats'?",
          replies: [
            { label: "Dogs, obviously. I need something that's excited to see me.", reaction: "Relatable. I aspire to be greeted at the door like that.", delta: 6 },
            { label: "Cats. I like being chosen, not obligated.", reaction: "That says a lot about you and I respect every word of it.", delta: 8 },
            { label: "Neither. I'm holding out for a golden retriever in human form. No offense.", reaction: "None taken. I've been told I have golden retriever energy, for what it's worth.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Did you have pets growing up?", answer: "A goldfish named Steve who lived four days past when he should have. RIP Steve.", delta: 4 },
            { label: "Would you actually get a dog with someone you just started dating?", answer: "No. That's a level-ten commitment. Ask me again in a month.", delta: 4 },
            { label: "What's something you'd want to build with someone, not just get?", answer: "A life that's actually quiet and mine and someone else's, all at once. Sorry, that got real fast.", delta: 8, rewarded: true },
          ],
        },
      ],
    },
    {
      id: "beach",
      emoji: "🏖",
      title: "Beach",
      variants: [
        {
          opener: "Okay, can you keep a secret? I have a hobby most people find a little unhinged.",
          replies: [
            { label: "Try me. I love unhinged.", reaction: "I'm a competitive karaoke singer. I have an actual trophy. It's on my mantle.", delta: 6 },
            { label: "As long as it's not illegal.", reaction: "Depends who you ask. Kidding — karaoke champion. Trophy and everything.", delta: 5 },
            { label: "Only if you show me right now.", reaction: "…okay, that just happened. I have zero regrets, and neither should you.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Wait, can you actually sing?", answer: "No. Not even a little. Pure confidence, zero talent.", delta: 4 },
            { label: "What song do you always pick?", answer: "Anything by Celine Dion. I peak emotionally at karaoke.", delta: 4 },
            { label: "What's the most embarrassing thing about you?", answer: "I talk to my plants. All nine of them have names. I introduced one to a friend once. Unprompted.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Fair warning before we get comfortable: I am aggressively competitive at board games.",
          replies: [
            { label: "Good. I don't respect people who let others win.", reaction: "We are going to get along scarily well.", delta: 6 },
            { label: "How aggressive are we talking?", reaction: "I once didn't speak to my brother for a week after Monopoly. That aggressive.", delta: 5 },
            { label: "Prove it. Right now. Name a game.", reaction: "Rock paper scissors. Best of seven. I already know I'm winning.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What game ended a friendship, be honest?", answer: "Risk. Nobody has fully forgiven anyone.", delta: 4 },
            { label: "Are you a sore loser?", answer: "Devastatingly. I need a full five minutes alone after losing at Uno.", delta: 4 },
            { label: "What's the pettiest thing you've ever done to win?", answer: "I 'accidentally' unplugged the Wi-Fi during a Mario Kart tournament. I regret nothing.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "So, slightly embarrassing beach confession: I actually can't swim.",
          replies: [
            { label: "That's okay, I'll teach you.", reaction: "That's either really sweet or a liability waiver I should sign.", delta: 6 },
            { label: "Wait, at all? Not even a little?", reaction: "I can float. Aggressively. That's the whole skillset.", delta: 5 },
            { label: "Then we're staying exactly here, on this towel, together.", reaction: "Best plan I've heard all week.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "How does a person just... never learn to swim?", answer: "I signed up for lessons at seven, cried the whole first class, and my mom let me quit. No regrets.", delta: 4 },
            { label: "What other surprisingly basic skill are you missing?", answer: "I still don't know how to whistle. Thirty-one years and counting.", delta: 4 },
            { label: "What are you actually afraid of, under the joking?", answer: "Being the reason someone has a bad time. So I make it a joke before it becomes a problem.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Fair warning, I have a habit that low-key alarms people: I narrate my own life out loud. Constantly.",
          replies: [
            { label: "That's amazing, please demonstrate immediately.", reaction: "'She sat on the towel, deeply regretting agreeing to this so fast.' See? Constant.", delta: 6 },
            { label: "Is this going to happen on our wedding day?", reaction: "Statistically, yes. 'And then he said yes, and she cried, and it was so cheesy and she loved it.'", delta: 5 },
            { label: "Say something about me, right now, out loud.", reaction: "'She had no idea how much trouble she was about to be in.' ...too much?", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Do you do this at work too?", answer: "Only in my head. Mostly. There was an incident in a meeting once.", delta: 4 },
            { label: "When did you realize you did this?", answer: "My college roommate recorded me doing it for a week straight and played it back. Humbling.", delta: 4 },
            { label: "What's the most honest thing you've ever said out loud without meaning to?", answer: "'I really hope this one likes me.' About you. Two minutes ago. You weren't supposed to hear that.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "I have a completely useless skill I'm still weirdly proud of. Want to guess?",
          replies: [
            { label: "Is it juggling?", reaction: "No, but now I feel like I need to learn juggling just to keep up.", delta: 5 },
            { label: "I'm going to guess something oddly specific, like whistling with your nose.", reaction: "Terrifyingly close. It's actually reciting an entire movie from memory. The whole thing.", delta: 6 },
            { label: "I don't need to guess, just show me.", reaction: "*performs the opening five minutes of a movie word for word* ...I told you it was useless.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Which movie is it?", answer: "I'm not saying. It's embarrassing and I've made peace with that.", delta: 4 },
            { label: "How long did it take to learn that, honestly?", answer: "I didn't 'learn' it. It just happened over eleven rewatches during a bad breakup.", delta: 4 },
            { label: "What's a skill you actually wish you had instead?", answer: "The ability to end a conversation gracefully. I once said bye four separate times leaving a party.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Confession: I collect something a little embarrassing. Snow globes. I have forty-three.",
          replies: [
            { label: "Forty-three is a very specific number, I respect the commitment.", reaction: "Thank you. Number forty-four is currently a source of tension with my roommate.", delta: 6 },
            { label: "That's oddly wholesome, honestly.", reaction: "See, that's exactly what I needed to hear today.", delta: 5 },
            { label: "I want to see all forty-three, in order, right now.", reaction: "That's a three-hour tour and I am completely prepared to give it.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Which one's your favorite?", answer: "A tiny lopsided one from a gas station. Nobody makes it, it's basically a snow blob. I love it most.", delta: 4 },
            { label: "Do you collect anything else?", answer: "Rubber ducks, briefly, in college. I stopped when it got 'concerning' according to my mom.", delta: 4 },
            { label: "What's something you collect that isn't really an object?", answer: "Voicemails, actually. From people I care about. In case I ever need to hear their voice again.", delta: 8, rewarded: true },
          ],
        },
      ],
    },
    {
      id: "dinner",
      emoji: "🍝",
      title: "Dinner",
      variants: [
        {
          opener: "I should probably tell you something before this goes any further... I still talk to my ex.",
          replies: [
            { label: "I appreciate your honesty.", reaction: "Thank you. I know it's not nothing.", delta: 4 },
            { label: "That makes me uncomfortable.", reaction: "That's fair. I get it. Let me explain, if you'll let me.", delta: 1 },
            { label: "So... do you still have feelings for them?", reaction: "Honestly? No. She just still checks on my cat when I travel and somehow that never stopped being normal.", delta: 10, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "How long were you together?", answer: "Three years. It ended slowly, not badly.", delta: 4 },
            { label: "Are you over it?", answer: "Completely. I just never bothered updating the group chat.", delta: 4 },
            { label: "Why didn't you mention this sooner?", answer: "Because I really like you, and I didn't want to mess this up before it even started.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Okay, confession time. I've never technically broken up with anyone in my life.",
          replies: [
            { label: "Wait — what do you do instead?", reaction: "I just... slowly become busier and busier until it fades. It's not great.", delta: 4 },
            { label: "That's a red flag and you know it.", reaction: "I do know it. I'm working on it. Ish.", delta: 6 },
            { label: "So how would I know if you were losing interest in me?", reaction: "Honestly? You wouldn't, unless I told you. Which is exactly why I'm telling you now.", delta: 10, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "How many people have you ghosted, roughly?", answer: "I'm going to say 'a number' and leave it there.", delta: 4 },
            { label: "Has anyone ever called you out on it?", answer: "Once. Loudly. In a coffee shop. I deserved it.", delta: 4 },
            { label: "Why do you think you do that?", answer: "Because saying 'this isn't working' out loud makes it real, and I'm apparently not great with real.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Something you should probably know: I am spectacularly bad at saving money.",
          replies: [
            { label: "Okay, how bad are we talking?", reaction: "I bought a $200 blender for a smoothie phase that lasted four days.", delta: 4 },
            { label: "As long as you're honest about it, I don't mind.", reaction: "I appreciate that. My bank app sends me warning emojis now.", delta: 6 },
            { label: "Is this going to be a 'we' problem eventually?", reaction: "Honestly, probably, unless someone with a spreadsheet steps in. Volunteering?", delta: 10, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What's the most impulsive thing you've bought?", answer: "A kayak. I have used it once. It lives in my hallway now.", delta: 4 },
            { label: "Do you have a budget at all?", answer: "I have a vibe. The vibe is 'it'll be fine.'", delta: 4 },
            { label: "What would actually help you fix it?", answer: "Someone who isn't afraid to say 'put it back' in the moment. Loudly, if necessary.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Something you should know before this goes further: I am genuinely terrible at texting back. Not because I don't care. I just... vanish.",
          replies: [
            { label: "As long as you tell me that's what's happening, I can live with it.", reaction: "I will. I promise. Mostly.", delta: 6 },
            { label: "That would drive me a little crazy, not going to lie.", reaction: "That's fair. I'm working on it. Slowly.", delta: 4 },
            { label: "So if I don't hear from you for two days, I shouldn't assume the worst?", reaction: "Correct. Assume I'm either working, asleep, or having an existential crisis about my inbox.", delta: 10, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Is it a work thing or just a you thing?", answer: "Both, if I'm honest. Work gives me the excuse, but I was like this before too.", delta: 4 },
            { label: "Has this ended a relationship before?", answer: "Once. She said it made her feel like an afterthought. She wasn't wrong to feel that.", delta: 4 },
            { label: "What would actually help, if I called you out on it?", answer: "Just... call me out on it. Directly. I respond a lot better to 'hey, this hurt' than silence.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Okay, honesty hour: my apartment is a certified disaster. I once found a coffee cup from three weeks ago behind the couch.",
          replies: [
            { label: "Bold of you to admit that on a first real dinner.", reaction: "I figured you'd find out eventually. Better from me.", delta: 6 },
            { label: "That's... a lot. But okay, I can work with that.", reaction: "'Work with that' is generous and I appreciate it.", delta: 4 },
            { label: "Is this a 'needs help' mess or a 'send a search party' mess?", reaction: "Somewhere in the middle. There's a system. It's just a system only I understand.", delta: 10, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "How long has that cup actually been there?", answer: "I said three weeks to sound better. It's closer to five.", delta: 4 },
            { label: "Would you actually let someone help you fix it?", answer: "Yes, honestly. I just need someone to start, and then I can't stop.", delta: 4 },
            { label: "What does the mess actually mean to you, if anything?", answer: "That I'm better at taking care of people than I am at taking care of myself. Working on that.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Something I should probably mention: I've never had a relationship last longer than eight months. Ever.",
          replies: [
            { label: "Do you know why, or is that the mystery?", reaction: "I have theories. None of them make me look great.", delta: 6 },
            { label: "That's a little concerning, not gonna lie.", reaction: "Fair. I'd be concerned too, honestly.", delta: 4 },
            { label: "So what makes this time different, if anything?", reaction: "I don't know yet. But I haven't wanted to find out the answer this badly before.", delta: 10, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "What usually happens around month eight?", answer: "I get scared it's about to get real, and I find a reason to leave before it does.", delta: 4 },
            { label: "Have you ever regretted ending one?", answer: "One. I think about it more than I'd like to admit.", delta: 4 },
            { label: "What would you need from someone to actually stay past eight months?", answer: "Someone patient enough to notice when I'm about to run, and stubborn enough to stay anyway.", delta: 8, rewarded: true },
          ],
        },
      ],
    },
    {
      id: "evening",
      emoji: "🎡",
      title: "Evening activity",
      variants: [
        {
          opener: "Hey — thank you for not running after last night. That actually meant a lot.",
          replies: [
            { label: "Of course. Everyone has a past.", reaction: "Still. Thank you.", delta: 8 },
            { label: "I'm still a little weird about it, not gonna lie.", reaction: "That's fair. I'd rather you be honest than pretend.", delta: 5 },
            { label: "I need you to promise me something.", reaction: "Anything. — I'm blocking her number tonight. I should've done it months ago.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Truce — ferris wheel or bumper cars?", answer: "Bumper cars. I have something to prove.", delta: 4 },
            { label: "Are you scared of heights?", answer: "Terrified. Which is a fun thing to learn about yourself on a ferris wheel.", delta: 4 },
            { label: "What are you most afraid of, actually?", answer: "That I'll end up doing to you what made her leave in the first place.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "I keep thinking about what I told you last night. You didn't even blink.",
          replies: [
            { label: "I've heard worse. Way worse.", reaction: "Now I need to know what 'worse' looks like.", delta: 5 },
            { label: "I appreciate people who are upfront. So — thank you.", reaction: "Okay. Noted. I'll keep being upfront then.", delta: 8 },
            { label: "I need you to know it doesn't change anything for me.", reaction: "…I wasn't expecting that. In a good way.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Truce — ferris wheel or bumper cars?", answer: "Bumper cars. I have something to prove.", delta: 4 },
            { label: "Do you regret telling me?", answer: "Not even a little. Actually, relieved.", delta: 4 },
            { label: "What made you decide to be honest with me instead of just hiding it?", answer: "Because I liked you enough to risk you knowing the whole thing.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Can I ask you something a little vulnerable? Does what I told you change how you see me?",
          replies: [
            { label: "Not even a little. It makes you more real to me.", reaction: "That might be the best thing anyone's said to me on a date.", delta: 8 },
            { label: "A bit, honestly. But not in a bad way.", reaction: "That's fair. I'd rather have honest than pretend.", delta: 5 },
            { label: "I need you to answer me seriously, not just say something nice.", reaction: "Okay, seriously — no. It doesn't. If anything I trust you more now.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Are you scared of heights?", answer: "Terrified. Which is a fun thing to learn about yourself on a ferris wheel.", delta: 4 },
            { label: "What made you finally open up tonight?", answer: "You didn't flinch. That's rarer than you'd think.", delta: 4 },
            { label: "What are you most afraid of, actually?", answer: "That I'll end up doing to you what made the last person leave in the first place.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "I was sure you'd have one foot out the door today, after everything I told you last night. You didn't.",
          replies: [
            { label: "Why would I run? Everyone's got something.", reaction: "Not everyone says it out loud on a first honeymoon, though.", delta: 8 },
            { label: "I thought about it, honestly. But I'm still here.", reaction: "That honesty means more than if you'd just said 'never crossed my mind.'", delta: 6 },
            { label: "I need you to know I'm not going anywhere over this.", reaction: "Okay. ...I needed to hear that more than I realized.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Truce — ferris wheel or bumper cars?", answer: "Bumper cars. I have something to prove.", delta: 4 },
            { label: "Were you expecting me to leave?", answer: "Honestly, a little. It's usually where things fall apart.", delta: 4 },
            { label: "What would it mean to you if this actually worked out?", answer: "That I finally found someone who stays for the whole story, not just the good parts.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "I've been rehearsing an apology in my head all day. Do you want to hear it, or should we just move on?",
          replies: [
            { label: "Let's hear it. I want the real version, not the polished one.", reaction: "Okay. Deep breath. Here goes the unpolished version.", delta: 8 },
            { label: "Let's just move on. I already made peace with it.", reaction: "Okay. Thank you. Genuinely.", delta: 6 },
            { label: "I don't need an apology. I need to know it won't happen again.", reaction: "Fair. It won't. I mean that.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Truce — ferris wheel or bumper cars?", answer: "Bumper cars. I have something to prove.", delta: 4 },
            { label: "What were you most afraid I'd say?", answer: "That I'd already ruined it. That was the whole rehearsal, basically.", delta: 4 },
            { label: "What did you actually learn from last night?", answer: "That being honest early hurts less than being caught later. I should've led with that, in general.", delta: 8, rewarded: true },
          ],
        },
        {
          opener: "Be honest with me — does what happened last night change what you think this could become?",
          replies: [
            { label: "No. If anything it made this feel more real.", reaction: "That's exactly what I was hoping and too scared to hope for.", delta: 8 },
            { label: "A little. But I still want to see where this goes.", reaction: "That's honest, and I'll take honest over pretend every time.", delta: 6 },
            { label: "It changes how much I want to protect this. Not how I feel about you.", reaction: "...okay. I did not expect to feel this okay right now.", delta: 12, rewarded: true },
          ],
          questionPrompt: "What do you ask?",
          questions: [
            { label: "Are you scared of heights?", answer: "Terrified. Which is a fun thing to learn about yourself on a ferris wheel.", delta: 4 },
            { label: "What would you have done if I'd walked away?", answer: "Let you. And regretted not fighting for it, probably for a long time.", delta: 4 },
            { label: "What do you actually want this to become?", answer: "Something that survives the honest parts, not just the easy ones.", delta: 8, rewarded: true },
          ],
        },
      ],
    },
    {
      id: "final-night",
      emoji: "🌅",
      title: "Final night",
      variants: [
        {
          opener: "Can I be honest about something? I was so sure I'd end up faking it if this didn't feel right. I haven't had to fake anything with you.",
          replies: [
            { label: "I feel exactly the same way.", reaction: "Good. I was hoping it wasn't just me.", delta: 12 },
            { label: "I'm still figuring it out, but I'm glad I'm figuring it out with you.", reaction: "That's honestly all I wanted to hear.", delta: 9 },
            { label: "I think I might actually be falling for you.", reaction: "…okay. Same. I've been trying not to say that first.", delta: 16, rewarded: true },
          ],
          questionPrompt: "Last question before Decision Day. What do you ask?",
          questions: [
            { label: "What are you hoping happens tomorrow?", answer: "That we both say yes and figure the rest out later.", delta: 6 },
            { label: "Any regrets so far?", answer: "One. That we didn't get more time before all this.", delta: 6 },
            { label: "Whatever happens tomorrow — was this real?", answer: "Every single part of it.", delta: 10, rewarded: true },
          ],
        },
        {
          opener: "I need to say something and I need you to not make it weird.",
          replies: [
            { label: "I promise. Go ahead.", reaction: "Okay. ...I'm really glad the experts picked you.", delta: 10 },
            { label: "No promises, but I'll try.", reaction: "Fair enough. Here goes anyway — I'm really glad the experts picked you.", delta: 8 },
            { label: "Whatever it is, I feel it too.", reaction: "You don't even know what I was going to say yet.", delta: 16, rewarded: true },
          ],
          questionPrompt: "Last question before Decision Day. What do you ask?",
          questions: [
            { label: "What's the moment this stopped feeling like an experiment?", answer: "Somewhere around you laughing at my worst joke like it was actually funny.", delta: 6 },
            { label: "Are you nervous about tomorrow?", answer: "Terrified. In the good way, if that's a thing.", delta: 6 },
            { label: "If I said yes tomorrow, what would that mean to you?", answer: "That the strangest, best decision of my life actually worked out.", delta: 10, rewarded: true },
          ],
        },
        {
          opener: "Tomorrow we say yes or no in front of everyone we know. Tonight, it's just us. So — how are you, really?",
          replies: [
            { label: "Terrified. Hopeful. Both, somehow.", reaction: "That's exactly it. Both, somehow.", delta: 12 },
            { label: "Surprisingly calm, actually.", reaction: "I envy that. I've rehearsed three different speeches.", delta: 9 },
            { label: "Honestly? I don't want this to be the end regardless of what we say tomorrow.", reaction: "Then let's make sure it isn't.", delta: 16, rewarded: true },
          ],
          questionPrompt: "Last question before Decision Day. What do you ask?",
          questions: [
            { label: "What are you hoping happens tomorrow?", answer: "That we both say yes and figure the rest out later.", delta: 6 },
            { label: "What would you change about how we got here?", answer: "Nothing. Even the awkward parts. Especially the awkward parts.", delta: 6 },
            { label: "Whatever happens tomorrow — was this real?", answer: "Every single part of it.", delta: 10, rewarded: true },
          ],
        },
        {
          opener: "If you'd told me a month ago I'd be this nervous about tomorrow, I wouldn't have believed you.",
          replies: [
            { label: "I wouldn't have believed it about myself either.", reaction: "Good. At least we're both terrified together.", delta: 12 },
            { label: "Nervous is good. It means it matters.", reaction: "That's a genuinely comforting way to put it.", delta: 9 },
            { label: "I'm not nervous anymore. I'm just sure.", reaction: "...I think I just got there too. Right now. Saying it to you.", delta: 16, rewarded: true },
          ],
          questionPrompt: "Last question before Decision Day. What do you ask?",
          questions: [
            { label: "What are you hoping happens tomorrow?", answer: "That we both say yes and figure the rest out later.", delta: 6 },
            { label: "What scared you most about all this, at the start?", answer: "That I'd fake my way through it. I never had to.", delta: 6 },
            { label: "Whatever happens tomorrow — was this real?", answer: "Every single part of it.", delta: 10, rewarded: true },
          ],
        },
        {
          opener: "I keep trying to picture life after tomorrow, and you're just... in it. All of it.",
          replies: [
            { label: "Good. Because I keep picturing the same thing.", reaction: "I was hoping you'd say that and terrified you wouldn't.", delta: 12 },
            { label: "That scares me a little. In a good way.", reaction: "Good scared. I can work with good scared.", delta: 9 },
            { label: "Then let's stop picturing it and just say it out loud.", reaction: "Okay. I want a life with you. There. Said it.", delta: 16, rewarded: true },
          ],
          questionPrompt: "Last question before Decision Day. What do you ask?",
          questions: [
            { label: "What does that picture actually look like?", answer: "Loud kitchens, bad mornings, someone who still picks me on the hard days. That one.", delta: 6 },
            { label: "Any regrets so far?", answer: "One. That we didn't get more time before all this.", delta: 6 },
            { label: "Whatever happens tomorrow — was this real?", answer: "Every single part of it.", delta: 10, rewarded: true },
          ],
        },
        {
          opener: "Whatever we decide tomorrow, I don't want it to be because we were too scared to say what we actually feel tonight.",
          replies: [
            { label: "Then I'll go first. I don't want this to end.", reaction: "Neither do I. I really, really don't.", delta: 12 },
            { label: "You're right. Let's not do the scared thing.", reaction: "Okay. Deep breath. Here goes something real, then.", delta: 9 },
            { label: "I love you. However tomorrow goes, that part's already true.", reaction: "...I love you too. Okay. Now tomorrow feels a lot less scary.", delta: 16, rewarded: true },
          ],
          questionPrompt: "Last question before Decision Day. What do you ask?",
          questions: [
            { label: "What's the moment this stopped feeling like an experiment?", answer: "Somewhere around you laughing at my worst joke like it was actually funny.", delta: 6 },
            { label: "Are you nervous about tomorrow?", answer: "Terrified. In the good way, if that's a thing.", delta: 6 },
            { label: "If I said yes tomorrow, what would that mean to you?", answer: "That the strangest, best decision of my life actually worked out.", delta: 10, rewarded: true },
          ],
        },
      ],
    },
  ];

  function pickDateSet(seed) {
    return DATE_SLOTS.map((slot) => {
      const variant = pickOne(slot.variants, reseed(seed, "date:" + slot.id));
      return { id: slot.id, emoji: slot.emoji, title: slot.title, ...variant };
    });
  }

  const KIDS_EMOJI = {
    "pregnant-first": "🤰",
    "newborn": "👶",
    "trying": "🤞",
    "two-kids": "👨‍👩‍👧‍👦",
    "pregnant-second": "🤰",
    "one-kid": "👶",
    "none-20s": "🐾",
    "none-30s": "🐾",
    "grandkids-visit": "👵",
    "grown-kids": "🎓",
    "blended-family": "👨‍👩‍👧‍👦",
    "just-us": "🐾",
  };

  const KIDS_LINE_POOLS = {
    "pregnant-first": [
      "Expecting your first any day now. The nursery is 60% done and 100% chaos.",
      "You're due next month. You've read one parenting book and panic-bought a stroller.",
      "{partner} has already picked three names you've vetoed and one you're both stuck on.",
    ],
    "newborn": [
      "You just had your first baby. Nobody has slept properly in weeks.",
      "Welcome to parenthood — three months in, still googling everything at 3am.",
      "{partner} is somehow already an expert at one-handed swaddling. You're impressed and a little jealous.",
    ],
    "trying": [
      "You're talking about starting a family. No baby yet, just a lot of spreadsheets.",
      "Kids are 'on the list.' Right now the list also includes a kitchen renovation.",
      "You and {partner} keep 'circling back' to the kid conversation. Progress, technically.",
    ],
    "two-kids": [
      "Two kids, complete chaos, wouldn't trade it.",
      "Two kids under five. The house looks like it lost a fight.",
      "{partner} is outnumbered and loving every second of it.",
    ],
    "pregnant-second": [
      "One toddler, one on the way. Send help — and snacks.",
      "Baby number two is due this spring. Baby number one has opinions about it.",
      "{partner} keeps saying 'this one will be easier.' You've both agreed not to believe that.",
    ],
    "one-kid": [
      "One very loud, very loved toddler running the household now.",
      "One kid, zero free time, still somehow worth it.",
      "{partner} narrates everything the toddler does like it's a nature documentary.",
    ],
    "none-20s": [
      "No kids yet — just you two, {pet}, and zero regrets about sleeping in.",
      "Kid-free for now. {pet} remains the only dependent, and frankly the favorite.",
      "You and {partner} keep saying 'someday.' {pet} is fine with the arrangement.",
    ],
    "none-30s": [
      "Still just the two of you and {pet} — and you're both completely fine with that.",
      "No kids. Lots of vacations. {pet} gets spoiled instead.",
      "{partner} has fully committed to the childfree life, and honestly, so have you.",
    ],
    "grandkids-visit": [
      "The grandkids visit most Sundays and immediately destroy the living room.",
      "Between your combined grandkids, there's always a birthday party happening somewhere.",
      "{partner} spoils the grandkids rotten and denies it every single time you bring it up.",
    ],
    "grown-kids": [
      "The kids are grown and mostly out of the house — you actually miss the chaos some days.",
      "Between {partner}'s kids and yours, the family group chat never stops buzzing, even though everyone moved out years ago.",
      "The kids call most Sundays, mostly to ask for advice, occasionally to ask for money.",
    ],
    "blended-family": [
      "A full blended family now — holidays require a shared calendar and a bigger table.",
      "Somewhere between his kids, her kids, and {pet}, it actually all just... works.",
      "{partner}'s kids call you by your first name still. You've stopped taking it personally.",
    ],
    "just-us": [
      "Just the two of you and {pet}, and honestly, that's the whole plan.",
      "No kids, no grandkids drama — just you two and a very spoiled {pet}.",
      "You and {partner} built a quiet life together. {pet} approves.",
    ],
  };

  const MILESTONE_POOLS = {
    high: [
      "You just renewed your vows in Tuscany. The speeches made everyone cry, on purpose.",
      "Still disgustingly in love. Your friends have muted your relationship posts.",
      "You have a couple's nickname now. Neither of you will say it in public.",
      "Date night is still a weekly thing. Somehow it never gets old.",
      "{partner} still {quirk}, and you still find it charming instead of annoying.",
      "You surprised {partner} with a trip to {country} for your anniversary. They cried in the airport.",
      "Turns out those \"{vow}\" vows held up — five years in and you'd say them again tomorrow.",
      "You still bring up that {partner} works as a {job} like it's the most impressive thing in the world.",
      "Your group chat has a nickname for you two as a unit now. You've stopped fighting it.",
      "{partner}'s green flag — {greenFlag} — turned out to be the whole relationship, honestly.",
    ],
    mid: [
      "You survived the toddler years — barely. There were negotiations.",
      "You've had exactly one IKEA-assembly fight that nearly ended the marriage. You recovered.",
      "Still going strong, mostly. The dishwasher-loading disagreement remains unresolved.",
      "Five years in, and you've finally agreed on a thermostat setting. Progress.",
      "{partner} still {quirk}, and you've mostly made peace with it.",
      "You talked about moving to {country} together. You're still just talking about it.",
      "The \"{vow}\" vows get quoted sarcastically now, mostly during arguments about chores.",
      "{partner}'s job as a {job} wrecks your weekends sometimes, but you make it work.",
      "You've had good years and rough years. This one's somewhere in between, and that's fine.",
      "Couples therapy is a semi-regular guest star on your calendar. It's helping.",
    ],
    low: [
      "Therapy helps. So does laughing.",
      "It's not always easy, but you keep choosing each other anyway.",
      "You've had your rough patches, and you're still here. That counts for something.",
      "Some years are just about getting through it together. This was one of them.",
      "You and {partner} argue more than you used to. You're working on it, actively.",
      "The \"{vow}\" vows feel like a lifetime ago some days. You're trying to find your way back to them.",
      "{partner}'s job as a {job} keeps you apart more than either of you would like.",
      "It's been a hard stretch. Neither of you is walking away, though.",
      "You don't say it out loud much anymore, but you still mean it.",
      "Some days are good. Some days you just show up anyway. Both count.",
    ],
  };

  function reseed(seed, label) {
    return hashStr(String(seed >>> 0) + "|" + label);
  }

  function fillTemplate(str, vars) {
    return str.replace(/\{(\w+)\}/g, (full, key) => (vars[key] !== undefined ? vars[key] : full));
  }

  function pickFamilyOutcome(seed, age, affection, pet, match) {
    const vars = {
      partner: match?.partnerName || "your partner",
      job: match?.partnerJob || "their job",
      quirk: match?.partnerQuirk || "their favorite hobby",
      country: match?.partnerCountry || "somewhere new",
      greenFlag: match?.partnerGreenFlag || "who they are",
      vow: match?.vowLabel ? match.vowLabel.toLowerCase() : "the vows",
      pet,
    };

    let stage;
    const stageSeed = reseed(seed, "stage");
    if (age < 30) {
      if (affection >= 85) stage = pickOne(["pregnant-first", "newborn"], stageSeed);
      else if (affection >= 65) stage = "trying";
      else stage = "none-20s";
    } else if (age < 45) {
      if (affection >= 85) stage = pickOne(["two-kids", "pregnant-second"], stageSeed);
      else if (affection >= 65) stage = "one-kid";
      else stage = "none-30s";
    } else if (age < 60) {

      if (affection >= 85) stage = "grown-kids";
      else if (affection >= 65) stage = "blended-family";
      else stage = "just-us";
    } else {
      if (affection >= 85) stage = "grandkids-visit";
      else if (affection >= 65) stage = "blended-family";
      else stage = "just-us";
    }

    const kidsLineRaw = pickOne(KIDS_LINE_POOLS[stage], reseed(seed, "kids"));
    const kidsLine = fillTemplate(kidsLineRaw, vars);
    const kidsEmoji = KIDS_EMOJI[stage];
    const milestoneTier = affection >= 80 ? "high" : affection >= 60 ? "mid" : "low";
    const milestoneRaw = pickOne(MILESTONE_POOLS[milestoneTier], reseed(seed, "milestone"));
    const milestone = fillTemplate(milestoneRaw, vars);

    return { stage, kidsLine, kidsEmoji, milestone };
  }

  const TRAIT_MOMENTS = {
    sweet: "{partner} notices you shiver and hands over their jacket without being asked.",
    loyal: "{partner} mentions, offhand, that they haven't spoken to any of their exes in years. On purpose.",
    leader: "{partner} 'gently' takes over ordering for the whole table without checking with anyone.",
    playful: "{partner} turns waiting for the check into a competitive round of thumb war. You lost.",
    ambitious: "{partner} checks a work email mid-date, apologizes, then checks it again.",
    romantic: "{partner} quietly asks the waiter to swap your seat so you get the better view.",
    adventurous: "{partner} suggests ditching dessert to go find 'something more interesting' outside. You go.",
    homebody: "{partner} admits they'd honestly rather be home in sweatpants right now. You're weirdly charmed.",
    cheerful: "{partner} strikes up a full conversation with a total stranger in line, purely for the joy of it.",
    bookworm: "{partner} name-drops three books mid-sentence like it's completely normal.",
    creative: "{partner} rearranges the napkins into a tiny sculpture while you're mid-sentence.",
    genius: "{partner} casually corrects the trivia machine at the bar. They were right.",
    familyoriented: "{partner} shows you forty photos of nieces and nephews you've never met. All forty.",
    outgoing: "{partner} has already made friends with the couple at the next table.",
    perfectionist: "{partner} sends their food back because the plating was 'asymmetrical.'",
    neat: "{partner} straightens the crooked picture frame on the wall without breaking eye contact.",
    foodie: "{partner} orders for both of you, very confidently, without asking what you wanted.",
    musiclover: "{partner} identifies the background music by the second note and will not let it go.",
    artlover: "{partner} stops mid-walk to admire a mural for a genuinely uncomfortable amount of time.",
    active: "{partner} suggests a sunrise workout tomorrow. You did not sign up for this.",
    goofball: "{partner} does an entire bit with the salt shaker that only they find funny. You laugh anyway.",
    selfassured: "{partner} mentions, unprompted, that they're 'kind of a big deal' at work. Three times.",
    loner: "{partner} admits they turned down two friends' invites tonight just to be here with you.",
    materialistic: "{partner} asks what your watch is worth. Not to be rude. Just... curious.",
    snob: "{partner} sends the wine back and explains, at length, exactly why it was beneath them.",
    hotheaded: "{partner} nearly starts a scene with a slow waiter before you manage to calm them down.",
    glutton: "{partner} finishes their plate, then most of yours, without really asking.",
    nightowl: "{partner} visibly perks up the moment the sun goes down, like they were just getting started.",
    frugal: "{partner} quietly calculates the tip out loud, to the cent.",
    clumsy: "{partner} knocks over a glass of water and somehow makes it charming.",
    jealous: "{partner} goes very quiet the moment your phone buzzes with an unfamiliar name.",
    gloomy: "{partner} sighs and says 'nothing ever really lasts' completely out of nowhere.",
    evil: "{partner} smiles a little too long when the waiter trips. You decide not to ask.",
    slob: "{partner} pulls a slightly crumpled receipt from three days ago out of their pocket. Just... has it.",
    mean: "{partner} makes a sharp joke at the waiter's expense. It gets a laugh. It also isn't kind.",
    childish: "{partner} actually pouts when they don't get the seat they wanted.",
    insider: "{partner} is on their phone under the table more than they're looking at you.",
    kleptomaniac: "{partner} 'accidentally' pockets a shiny spoon on the way out. You saw. You say nothing.",
  };

  function pickTraitMoments(desiredTraits, partnerName, seed) {
    const schedule = {};
    const traits = (desiredTraits || []).filter((t) => TRAIT_MOMENTS[t]);
    if (!traits.length) return schedule;
    const negativeTraits = (window.MAFS && window.MAFS.NEGATIVE_TRAITS) || [];
    const candidateDates = [1, 2, 3, 4];
    const assignedDates = pickN(candidateDates, traits.length, reseed(seed, "moment-dates"));
    traits.forEach((trait, i) => {
      const dateIndex = assignedDates[i] ?? candidateDates[i % candidateDates.length];
      const text = fillTemplate(TRAIT_MOMENTS[trait], { partner: partnerName || "Your partner" });
      const tone = negativeTraits.includes(trait) ? "negative" : "positive";
      schedule[dateIndex] = [...(schedule[dateIndex] || []), { trait, text, tone }];
    });
    return schedule;
  }

  const DIVORCE_REACTIONS = [
    { id: "cry_floor", emoji: "😭", text: "{partner} collapses straight onto the floor, sobbing into the tablecloth. The producers do not intervene.", effect: "cry", tint: "#5b7fb5" },
    { id: "mature", emoji: "🤝", text: "{partner} nods slowly. \"I respect that. Genuinely. I hope you find what you're looking for.\" It's almost more unsettling than crying.", effect: "cold", tint: "#3f7d5c" },
    { id: "never_give_up", emoji: "📣", text: "{partner} climbs onto their chair and announces, to the entire room, that they will NEVER stop trying to win you back.", effect: "chaos", tint: "#c2185b" },
    { id: "mother_slap", emoji: "👋", text: "{partner}'s mother appears from seemingly nowhere and slaps you across the face. Nobody explains how she got in.", effect: "shake", tint: "#8a2142" },
    { id: "call_ex", emoji: "📱", text: "{partner} pulls out their phone and calls their ex. Right there. Doesn't even leave the table.", effect: "cold", tint: "#4a5568" },
    { id: "exposure", emoji: "🎤", text: "{partner} grabs a nearby mic and announces the entire experiment was \"only ever for the exposure.\" The mic wasn't on. They grab another one.", effect: "chaos", tint: "#e8743b" },
    { id: "ring_throw", emoji: "💍", text: "{partner} rips off the wedding ring and hurls it clean across the room. It is never recovered. A producer quietly writes something down.", effect: "shake", tint: "#c99a2e" },
    { id: "social_media", emoji: "📸", text: "{partner} pauses mid-sentence. \"Wait — can we maybe just stay married for the socials? The engagement's been really good.\"", effect: "cold", tint: "#6b4a87" },
    { id: "papers_ready", emoji: "📝", text: "{partner} calmly reaches into their bag and produces a fully completed divorce packet. They've clearly had it ready for weeks.", effect: "cold", tint: "#2f6f9e" },
    { id: "run_camera", emoji: "🏃", text: "{partner} bursts into tears and sprints for the exit — the entire camera crew sprinting right behind them, one already tripping over a cable.", effect: "flee", tint: "#e0457b" },
    { id: "silent_treatment", emoji: "😶", text: "{partner} says absolutely nothing. Just stares. For a very, very long ten seconds. Then blinks once and walks away.", effect: "cold", tint: "#4a5568" },
    { id: "relief", emoji: "🎉", text: "{partner} breaks into a huge, relieved grin. \"FINALLY,\" they yell, loud enough to startle the boom operator. \"I was going to ask first!\"", effect: "chaos", tint: "#1a9c6e" },
  ];

  function pickDivorceReaction(partnerName) {
    const reaction = DIVORCE_REACTIONS[Math.floor(Math.random() * DIVORCE_REACTIONS.length)];
    return { ...reaction, text: fillTemplate(reaction.text, { partner: partnerName || "Your partner" }) };
  }

  window.MAFS = window.MAFS || {};
  window.MAFS.QUESTION_POOL = QUESTION_POOL;
  window.MAFS.pickTraitMoments = pickTraitMoments;
  window.MAFS.pickDivorceReaction = pickDivorceReaction;
  window.MAFS.SOLO_POOL = SOLO_POOL;
  window.MAFS.pickDateSet = pickDateSet;
  window.MAFS.pickFamilyOutcome = pickFamilyOutcome;
  window.MAFS.pickOne = pickOne;
  window.MAFS.hashStr = hashStr;
  window.MAFS.buildPartner = buildPartner;
  window.MAFS.hasNameEasterEgg = hasNameEasterEgg;
  window.MAFS.buildNameEasterEggPartner = buildNameEasterEggPartner;
  window.MAFS.pickQuestions = pickQuestions;
  window.MAFS.pickSoloScenes = pickSoloScenes;
})();
