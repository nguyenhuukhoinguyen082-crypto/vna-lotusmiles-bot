# TASK SPECIFICATION: KLM ACADEMY DISCORD UTILITY & EXAMINATION BOT

## TARGET ENVIRONMENT & REPOSITORY INSTRUCTIONS
- **Target Repository**: Directly edit and commit all code into the GitHub repository at `https://github.com/nguyenhuukhoinguyen082-crypto/vna-lotusmiles-bot/tree/main` - Remove all old files. Use authorization key `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`.
- **Hosting Target**: Optimized for `bot-hosting.net` (Node.js/discord.js or Python/discord.py).
- **Database Engine**: Firebase Realtime Database (via `firebase-admin`) to guarantee persistent storage for exam progress, hostings, and scores across container restarts on free host nodes.
- **Environment File (`.env`)**:
  - `DISCORD_TOKEN`
  - `FIREBASE_CREDENTIALS_JSON` / `FIREBASE_DATABASE_URL`
  - `ROLE_STAGE_1` = `1500499569899999294`
  - `ROLE_PHASE_2` = `1500499568331198604`

---

## AUTOMATED ROLE ASSIGNMENT SYSTEM
- **Stage 1 Assignment**: Assigned (<@&1500499569899999294>) when a user starts an exam or enters Phase 1.
- **Phase 2 Promotion**: When an instructor submits a passing grade for Phase 1 (>= 20/24 points), the bot automatically:
  1. Grants the Phase 2 role (<@&1500499568331198604>).
  2. Removes the Stage 1 role (<@&1500499569899999294>).
  3. Sends the victory announcement into `#phase-1-results` (<#1537369655834968137>).

---

## CORE MODULES

### MODULE 1: IN-DM PHASE 1 EXAMINATION ENGINE
- **Trigger**: Trainee clicks "Start Exam" button or runs `/take-test`.
- **DM Delivery System**:
  - Automatically verifies DMs are open and checks Firebase to ensure no double submissions.
  - Grants Stage 1 Role `<@&1500499569899999294>` if not already present.
  - **Section 1: 6 Multiple Choice Questions (2 Points Each = 12 Points)**: Delivered sequentially via Discord Select Menus/Buttons. Auto-evaluated and saved to Firebase.
  - **Section 2: 4 Written Practical Questions (3 Points Each = 12 Points)**: Collected via Modals or DM prompts. Raw text saved to Firebase.
- **Submission**: Pushes completed payload to private `#instructor-test-queue`.

---

### MODULE 2: INSTRUCTOR GRADING QUEUE & AUTO-RESULT GENERATOR
- Displays pending exams in `#instructor-test-queue` with auto-graded MC score (/12) and trainee written responses.
- Instructors click **"Grade Written Answers"** to input scores (0–3 per question).
- Bot computes final total (/24), updates Firebase, manages role shifts, and posts formatted output to `<#1537369655834968137>`.

**Pass Format (>= 20/24 Points)**:
## <:klmacademy_logo:1543831346856853554> Phase 1 Examination Results
> **Hallo {trainee}!** After careful review of the test, we want to announce that you've ||**Passed <:check:1541027836024856618>**|| the test, with a total score of ||**{points}/24**||. 
### Detailed Results:
- Question 1: /2
- Question 2: /2
- Question 3: /2
- Question 4: /2
- Question 5: /2
- Question 6: /2
- Question 7: /3
- Question 8: /3
- Question 9: /3
- Question 10: /3

Congratulations! Please proceed to the next phase, which is phase 2 by requesting one at <#1537376032737468456> and take a look at <#1500508813629849770>!
*Signed, {yourname}*
-# KLM Academy - Make your dream come true at KLM Flight Academy <:klmacademy_logo:1543831346856853554>

**Fail Format (< 20/24 Points)**:
## <:klmacademy_logo:1543831346856853554> Phase 1 Examination Results
> **Hallo {trainee}!** After careful review of the test, we want to announce that you've ||**Failed <:cross:1541027881344442478>**|| the test, with a total score of ||**{points}/24**||. 
### Detailed Results:
[Same breakdown]

Don't be demotivated, every failure is a time you can look back yourself, we believe that you can improve more. Please proceed back to phase 1 and redo the test again. You now have 2 tries left on your test. We hope you can pass the next test and get to the next stage. 
*Signed, {yourname}*
-# KLM Academy - Make your dream come true at KLM Flight Academy <:klmacademy_logo:1543831346856853554>

---

### MODULE 3: PHASE 2 EVALUATION & HOSTING SUITE
- `/host-eval`: Posts hosting announcement in `<#1537367556656988231>` targeting `<@&1500499568331198604>` with dynamic reaction counter.
- `/join-eval`: Posts private server link and automatically purges the link after **10 minutes**.
- `/grade-phase2`: Interactive evaluation scoring matching department grading rubrics:
  - **Flight Deck** (Pass: 48/60): Pushback (/5), Taxi (/5), Takeoff (/10), Climb (/5), Cruising (/5), Descent (/5), Landing (/20), Taxi to gate (/5).
  - **Cabin Crew** (Pass: 44/55): Check-in (/10), Boarding (/10), Pre-flight Service (/5), Safety Demo (/4), Takeoff (/3), In-flight Service (/10), Descent & Landing (/3), Situation (/10).
  - **Ground Crew** (Pass: 40/50): Cone placement (/6), Aircraft Setup (/30), Pushback (/10), Marshalling (/4).

---

### MODULE 4: CHANNEL MODERATION & PHASE 3 TRACKING
- **Side-Chat Enforcer (`#phase-2-request` / `<#1537376032737468456>`)**: Automatically deletes any message that does not strictly follow the request template:
Username: (Ping/Text)
Training For: (Department)
Phase Number: Phase 2
- **Phase 3 Supervision Module**: Allows trainees to request live flight supervision (`/request-supervision`) and logs claims in `#phase-3-requests`.


---


## HARDCODED ANSWER KEYS & GUIDELINES


### CABIN CREW (STAGE 1)
- **MCQ 1**: Departure and Arrival Airport (1pt), Classes offered on the flight (1pt).
- **MCQ 2**: Ask passengers what they'd like to eat or drink (1pt), Ask if they'd like anything else after serving (1pt).
- **MCQ 3**: Destination, Identification, Class, Boarding pass type and Luggage (2pts).
- **MCQ 4**: Offer them a hot towel and direct them to the Premium Lounge (2pts).
- **MCQ 5**: Wait about 2 minutes to extend the flight time, then notify the captain that service has finished (2pts).
- **MCQ 6**: Contact them for going back to check-in (1pt), Notify the Flight Dispatcher about him (1pt).
- **Written**: Q7 (Conflicting orders strategy), Q8 (Check-in dialogue), Q9 (In-flight questions), Q10 (Disruptive passenger protocol).


### GROUND CREW (STAGE 1)
- **MCQ 1**: Departure and Arrival Airport (1pt), The aircraft's ground crew vehicles types (1pt).
- **MCQ 2**: Use the airport location in real-life and set up by FlightRadar24 Data (2pts).
- **MCQ 3**: 5 or 6 (2pts).
- **MCQ 4**: Back and front right door (2pts).
- **MCQ 5**: A vehicle used to help passengers board the plane if not using the gate, or for staff to get on the plane (2pts).
- **MCQ 6**: 6 (2pts).
- **Written**: Q7 (Cone placement description), Q8 (Perth Gate 14 setup), Q9 (Schiphol arrival workflow), Q10 (Non-jetway vehicles & rationale).


### FLIGHT DECK (STAGE 1)
- **MCQ 1**: 10 (2pts).
- **MCQ 2**: No — not while still connected to the pushback tug, because of a known PTFS bug (2pts).
- **MCQ 3**: 10–20 knots; check the taxi chart for your planned route (2pts).
- **MCQ 4**: Fly a circular descent (1pt) OR Perform a go-around (1pt).
- **MCQ 5**: To indicate how high you currently are, which determines your touchdown point (2pts).
- **MCQ 6**: Apply reverse thrust at 40% once all wheels are on ground (1pt); Switch to taxi thrust at 60 knots (1pt).
- **Written**: Q7 (Cruise level-off procedure & keys), Q8 (Plane check walkaround), Q9 (Flight plan format & example), Q10 (Mid-route to descent workflow).

KLM Stage 1 Form: Cabin Crew
Section 2
* Which of these are mentioned as briefing content that Flight Dispatchers cover? (for Cabin Crew only)
   * Departure and Arrival Airport
   * Classes offered on the flight
   * The pilot's flight minutes
   * The aircraft's ground crew vehicles types
   * The exact number of passengers pre-booked in each class
   * Which cabin crew member is assigned to which class
* According to the in-flight service script, what should you do during flight service?
   * Skip confirming the order and just guess based on class
   * Ask for payment before taking their order
   * Ask if they'd like anything else after serving their order
   * Serve every passenger the same preset meal without asking
   * Wait for passengers to flag you down before offering service
   * Ask passengers what they'd like to eat or drink
* What to ask passengers during check-in before proceeding the boarding pass?
   * Luggage, Food, Seating, Class and Identification
   * Destination, Identification, Class, Boarding pass type and Luggage
   * Destination, Favourite food, Seating type, Boarding Pass and Drinks
   * Hot towel, Gate, Airport, Passport and Boarding Pass
   * Destination, Class, Job, Identification and Luggage
   * Nothing to ask them just tell them to proceed to boarding gate
* How should you serve a World Business Class passenger before departure?
   * Offer them a hot towel and direct them to the Premium Lounge
   * Serve them the same as Economy Class passengers
   * Ask them to wait in the boarding area with everyone else
   * Skip pre-flight service entirely for Business Clas
   * Offer them a hot towel, but have them remain at the gate rather than the Premium Loung
   * Direct them to the Premium Lounge, but skip the hot towel since that's Royal-Class-only
* After completing in-flight service for all passengers, what should you do?
   * Wait about 2 minutes to extend the flight time, then notify the captain that service has finished
   * Notify the captain immediately, then wait 2 minutes before starting descent
   * Wait about 2 minutes, then begin deboarding announcement
   * Start service again from the first passenger to fill the extra time
   * Wait about 5 minutes, then notify the captain
   * Notify the captain that service has finished, with no waiting period required
* A passenger skipped check-in. What should you do?
   * Contact them for going back to check-in
   * Ignore them
   * Shout at them go back to gate
   * Kick him out of the game
   * Notify the Flight Dispatcher about him
   * Let them skipped and continue the flight
Section 3 (Note: These are written practical questions and do not contain multiple-choice options)
* A passenger orders chicken, then another passenger suddenly asks for beef. In that situation, how would you handle the ordering without upsetting either passenger?
* A passenger walks up to your check-in desk. Walk through, step-by-step, exactly what you'd say and ask them, from greeting through handing them their boarding pass.
* What are the main things we should ask the passenger during the flight service?
* A passenger is being disruptive in the cabin. As a cabin crew member, what should you do?
________________
KLM Stage 1 Form: Ground Crew
Section 2
* Which of these are mentioned as briefing content that Flight Dispatchers cover? (for Ground Crew only)
   * Departure and Arrival Airport
   * Classes offered on the flight
   * The pilot's flight minutes
   * The aircraft's ground crew vehicles types
   * The exact number of passengers pre-booked in each class
   * Ground Crew limitations
* How to setup airports on departure
   * Divide the zones and setup by FlightRadar24 Data
   * Use the airport location in real-life and set up by FlightRadar24 Data
   * Set up all white
   * No setup required
   * Use the PTFS Airport Island location in real-life and set up like that
   * Choose random airlines to set up
* How many vehicles is needed for a B787 at the gate?
   * 3
   * 4
   * 5
   * 6
   * 7
   * 8
* Where should the catering truck located on the B737
   * Front right door
   * Front left door
   * Back right door
   * Back left door
   * Back and front right door
   * Back and front left door
* What is a stair truck?
   * A vehicle used for transporting luggage to the plane
   * A vehicle used to supply fuel to the plane
   * A vehicle used for providing services like food and drinks
   * A vehicle used to help passengers board the plane if not using the gate, or for staff to get on the plane
   * A vehicle used for moving passengers to board the plane if not using the gate
   * A vehicle used for pushing back the plane — use the long pushback tow or pushback tug, and avoid using the small one except if it is a small plane
* How many cones is needed for a B777?
   * 3
   * 4
   * 5
   * 6
   * 7
   * 8
Section 3 (Note: These are written practical questions and do not contain multiple-choice options)
* Give me a full demonstration of cone placement. (Describe the image yourself.)
* An Airbus A350 is parking at Perth International at gate 14 (have jetway). How would you set up the Ground Crew vehicles?
* A flight is arriving with Amsterdam Schipol as its destination. Walk through how and when you'd set up the airport for its arrival.
* What are the additional Ground Crew vehicles needed to be add when the flight is not using the jetway for departure? Describe it and explain why do we need it?
________________
KLM Stage 1 Form: Flight Deck
Section 2
* How many sections does the Flight Deck handbook have, not counting Welcome/Introduction, Training, or Conclusion & Credits?
   * 8
   * 9
   * 10
   * 11
   * 12
   * 13
* Should you turn on the engine while being pushed back?
   * Yes — start the engines as soon as pushback begins, regardless of connection status
   * No — never start the engines during pushback under any circumstance, even after disconnecting
   * No — not while still connected to the pushback tug, because of a known PTFS bug
   * Yes — because we can
   * No — but only because ground crew must explicitly approve it first
   * Yes — as long as the pilot wants to
* What is the recommended taxi speed, and what should you check before taxiing?
   * 5–10 knots; check the taxi chart
   * 10–15 knots; check the weather provided by the ATC
   * 10–20 knots; check the taxi chart for your planned route
   * 15–25 knots; check with ground crew
   * 20–30 knots; check the taxi chart
   * 10–20 knots; check with ground crew
* If you find yourself too high during descent, what should you do?
   * Pitch down more steeply to catch the glidepath
   * Fly a circular descent
   * Perform a go-around
   * Reduce your speed to idle and let the aircraft sink naturally
   * Continue the approach and correct once established on short final
   * Back and front left door
* What are PAPI lights used for?
   * To show the correct heading for your final approach course
   * To indicate your horizontal position relative to the runway centerline
   * To indicate how high you currently are, which determines your touchdown point
   * To indicate your current airspeed relative to the approach speed
   * To show the distance remaining to the threshold
   * To communicate directly with the tower during approach
* After touchdown, which of these is correct?
   * Apply reverse thrust at about 40% throttle once all wheels are on the ground
   * Apply reverse thrust at about 60% throttle immediately on touchdown, before the nose wheel is down
   * Switch from reverse thrust to taxi thrust once your speed reaches 60 knots
   * Switch from reverse thrust to taxi thrust once your speed reaches 40 knots
   * Keep reverse thrust engaged all the way to the gate
   * Exit the runway at any convenient speed, then retract the flaps immediately at touchdown
Section 3 (Note: These are written practical questions and do not contain multiple-choice options)
* You've just leveled off at your flight-planned cruising altitude after a smooth climb. Walk through exactly what you do next to properly settle into cruise — including any keys/commands you'd use, and how much altitude inaccuracy is acceptable before you'd need to correct it.
* You and your co-pilot are about to begin operations for today's flight. Walk through what the plane check involves, who's responsible for it, and why we bother doing it even though it has no effect on the game's mechanics.
* What is a Flight Plan? How should you file the flight plan? What components are included in a flight plan? Give me an example flight plan
* You're now halfway through the route in cruise. Walk through what changes at this point — what you'd press, what you'd tell the cabin crew, and what has to happen til we landed at the destination?

Introduction
KLM ACADEMY STAGE 2 GUIDE
This document is developed by vietnamtrainingpilot. This is just a temporary solution for the long pause of the phase 2 private evaluation. The official one is being developed by DennyIsStillHere - DLD

Welcome to Phase 2 of your training for your journey in becoming a KLM Official Staff Member. This phase will be a private evaluation from what you’ve learned in your last stage, phase 1, making sure that you still remember the operation as well as conducting it in practice in PTFS. 

Try to familiarize your “lounge” in your training
- #phase-2-instructions: Brief of instructions of your stage. That channel is also where you can access this file. 
- #phase-2-hosting: Where evaluations are hosted by Instructors. They may post a few hours away from the starting time so make sure to react with ✅ if you are gonna attend this evaluation. Also see what type it is. Your results might be posted there also. 
- #phase-2-request: This channel is where you can request for training, making instructors know when trainees are available so they can train. They might select your time if they are available. Please post by the format. NEVER SIDE CHAT THERE
- #phase-2-chat: Where you can talk and discuss with trainees and instructors, as well as chatting with others also. You can ask questions, clarifications or anything that is related into your training. 
- Stage Flight VC: That place is where you actually take the evaluation. You must join the VC for your training. There, instructors will explain the evaluation and will tell you what’s wrong, what to fix,... Use VC if possible

There are 3 different departments so make sure to read the correct one, else you might not know what to do. There will be fixed grading guidelines for your department, as well as the evaluating environment so you experience different situations also. 

About the pass requirements, you must nail at least 80% on your evaluation to be able to come to the next stage. Failure in doing so will divert you back to Phase 1 for another revision. 

If you are not clarified with anything, feel free to contact one of our Instructors, they will help you. 
Flight Deck
FLIGHT DECK GRADING GUIDELINES


Criterias
	Description
	Points
	Pushback
	Your pushback performance
	5
	Taxi
	Your taxi performance, grade based on your alignment of your gear with the runway and speed
	5
	Takeoff
	Flaps and throttle configuration, Speed, Takeoff Performance and Smoothness
	10
	Climb
	How fast you climb attitude and how steep is your climb, and your speed
	5
	Cruising
	How do you set the plane on cruising attitude and speed configuration
	5
	Descent
	How steep you descent your attitude, your path, your flaps configuration and speed
	5
	Landing
	Approach, Touchdown, Smoothness and Alignment with runway
	20
	Taxi to gate
	Your taxi performance, grade based on your alignment of your gear with the runway and speed
	5
	

Pre-fix routes for evaluation
* Keflavik -> Sauthepomea (hill approach)
* Tokyo -> Perth (approach runway 29)
* Mellor -> Greater Rockford (approach runway 7L)
* Sauthepomea -> Keflavik (runway 16 approach)
* Izolrani -> St.Barts (beach approach)
* Izolrani -> Laranca (runway 26 approach)
Weather are not pre-fix, they are random to wish 

Pass rate: 48
Cabin Crew
CABIN CREW GRADING GUIDELINES


Criterias
	Description (count PA Announcement also)
	Points
	Check-in
	Check-in procedure and PA Announcement
	10
	Boarding
	Boarding Procedure and PA Announcement
	10
	Pre-flight Service
	Pre-flight Service Procedures
	5
	Safety Demonstration
	PA Announcements for safety
	4
	Takeoff
	PA Announcements
	3
	In-flight Service
	In-flight service procedure and PA Announcement
	10
	Descent & Landing
	PA Announcements
	3
	Situation
	Get to handle an interruption from a passenger (simulation) and will grade your performance based on how you react 
	10
	
Pass rate: 44
Ground Crew
GROUND CREW GRADING GUIDELINES


Criterias
	Description
	Points
	Cone placement
	How do you place cones
	6
	Aircraft Setup
	Your taxi performance, grade based on your alignment of your gear with the runway and speed
	30 (5 for each vehicle)
	Pushback 
	Flaps and throttle configuration, Speed, Takeoff Performance and Smoothness
	10
	Marshalling
	How fast you climb attitude and how steep is your climb, and your speed
	4
	All evaluation for Ground Crew will be at Perth
Pass rate is: 40

Overview
Trainers Manual
23rd August, 2026 - Written by ADLD | vietnamtrainingpilot & DLD | DennyIsStillHere

Welcome to reading this handbook. This one no need to be fancy. Your goal is to understand how to grade the tests as well as how to evaluate in the next stage. There are 4 tabs, and this one is the overview tab. The other tabs labeled with each department is how to do training, grade test and supervise the trainees. Do not leak this handbook anywhere in any circumstances and good luck as an Instructor!

For Instructor-In-Training (IIT), you are required to handle at least 5 department tests, as well as evaluate 4 trainees in phase 2 to become an official instructor. Feel free to ask your higher rank for support or giving out your ideas!! 

For stage 1, you are requested to grade tests for trainees. The grading test is described in each tab for each department. You may find the tests below:
* Flight Deck: KLM Stage 1 Form: Flight Deck (Responses)
* Ground Crew: KLM Stage 1 Form: Ground Crew (Responses)
* Cabin Crew: KLM Stage 1 Form: Cabin Crew (Responses)
After grading any test, please Strikethrough (Alt + Shift + S) on the entire test. Then, you may post the results following the format in the #formats channel and post it in #phase-1-results


When grading a test, make sure they follow these rules
- Detailed Answers: The answer needs to be detailed so we know that you have pay effort into the application. Short answers will increase your chance of passing.
- Grammar & Punctuation: Use proper spelling, grammar and capitalization. It will increase your chance of acceptance.
- Meaningful answers: Avoid simple answers. Provide examples, reasons and any additional details to your answers. 
- Originality & Honesty: All answers must be written entirely yourself. Using AI or copying answers straight from a study guide or other test, will result in an immediate fail.  


For Stage 2, you are gonna evaluate Trainees to check their knowledge they’ve learned from Stage 1. You may grade them based on the criteria listed in each department. Please do follow it for results.


In the last stage, you should evaluate a trainee on a flight. Just follow stage 2 procedures. 

Flight Deck
FLIGHT DECK
I> Stage 1 Examination Grading Guidelines
Follow these guidelines of grading to grade a test. It does not have to be 100% accurate but make sure the ideas are similar. 
Question
	Sample Answers/ Guidelines
	Points
	1
	10 (2pts)
	2
	2
	No — not while still connected to the pushback tug, because of a known PTFS bug; it's fine once disconnected (2pts)
	2
	3
	10–20 knots; check the taxi chart for your planned route 
	2
	4
	* Fly a circular descent (1pts)
* Perform a go-around (1pts)
	2
	5
	To indicate how high you currently are, which determines your touchdown point (2pts)
	2
	6
	* Apply reverse thrust at about 40% throttle once all wheels are on the ground (1pts)
* Switch from reverse thrust to taxi thrust once your speed reaches 60 knots (1pts)
	2
	7
	* Slowly tilt the nose down make sure the plane tilt is nearly 0 (1pts)
* Press R for the plane fully goes to 0 degree tilt (0.5pts)
* Press F to fully Cruise (1 pts)
* Maximum 50 feet different from the flight plan filed (0.5 pts)
	3
	8
	* A plane walkaround at gears, engines, under the wing, wingtips and any other crucial plane parts of the plane (1pts)
* Co-pilot or Pilot but usually the Pilot since they are leading the plane more (1pts)
* It makes the flight more realistic and also illustrates real-life procedures (1pts)
	3
	9
	* Is like a form where pilots file their upcoming flight details for a smoother flight (1.5pts)
* Callsign, Aircraft, Departure, Arrival, Route, Flight Level and Runway (they must demonstrate an example of a flight plan) (1.5pts)
	3
	10
	* Press F again to uncruise and tilt the plane down a bit to approach the airport and lower throttle when near the island airport (1pts)
* Slowly descend the plane and control the plane until the aircraft is aligned with the runway for approach, may deploy flaps to reduce the speed (1pts)
* Use PAPI lights to indicate the approach. Deploy gears at 1000ft and touchdown as smoothly as possible. Try to align with the runway, land in the touchdown zone and perfect speed. (1pts)
	3
	II> Stage 2 Evaluation Grading Guidelines
(Completed by Denny - delete the text here to start edit) 
Ground Crew
GROUND CREW
I> Stage 1 Examination Grading Guidelines
Follow these guidelines of grading to grade a test. It does not have to be 100% accurate but make sure the ideas are similar. 
Question
	Sample Answers/ Guidelines
	Points
	1
	* Departure and Arrival Airport (1pts)
* The aircraft's ground crew vehicles types (1pts)
	2
	2
	Use the airport location in real-life and set up by FlightRadar24 Data (2pts)
	2
	3
	5 or 6 (2pts)
	2
	4
	Back and front right door (2pts)
	2
	5
	A vehicle used to help passengers board the plane if not using the gate, or for staff to get on the plane (2pts)
	2
	6
	6 (2pts)
	2
	7
	Just take image as reference and see how they describe
	3
	8
	Catering Trucks at front right door and back right door, fuel truck at the next to right wing, not under. 1 Stair Truck at back left door. 2 baggage trucks at back right part of the plane (and front right part of the plane). 1 pushback tug at front.  (3pts)
	3
	9
	* Set up airport majority as KLM and other European Airlines, leave a gate for the flight arrival (included in briefing)  (1pts)
* Send some basic ground crew vehicles ready for service right after arrival  (1pts)
* Once the aircraft landed, send a follow me truck (optional) and guide them until they are approaching the gate and start marshalling (1pts)
	3
	10
	* Stair Truck - A vehicle for help people board the plane easier and Terminal Bus to transport all the passengers from the stand to the plane (1.5pts)
* The Stair Truck will help passengers board the plane from ground while Terminal bus helps moving passengers to the pit easier and faster (1.5pts)
	3
	II> Stage 2 Evaluation Grading Guidelines
(Completed by Denny - delete the text here to start edit) 
Cabin Crew
CABIN CREW
I> Stage 1 Examination Grading Guidelines
Follow these guidelines of grading to grade a test. It does not have to be 100% accurate but make sure the ideas are similar. 
Question
	Sample Answers/ Guidelines
	Points
	1
	* Departure and Arrival Airport (1pts)
* Classes offered on the flight (1pts)
	2
	2
	* Ask passengers what they'd like to eat or drink (1pts)
* Ask if they'd like anything else after serving their order (1pts)
	2
	3
	Destination, Identification, Class, Boarding pass type and Luggage (2pts)
	2
	4
	Offer them a hot towel and direct them to the Premium Lounge
	2
	5
	Wait about 2 minutes to extend the flight time, then notify the captain that service has finished (2pts)
	2
	6
	* Contact them for going back to check-in (1pts)
* Notify the Flight Dispatcher about him (1pts)
	2
	7
	* Prioritize the passenger ordering chicken because they are first while telling the beef passenger to wait. (1.5pts)
* After completing serving chicken to first passenger, come to the beef passenger, apologize about the delay and serve them what they requested (1.5pts)
	3
	8
	It is the entire dialogue of check-in so grade based on that. If they are wrong in any step (e.g: Asking destination) -> minus them 0.5pts
	3
	9
	* Welcoming them to the in-flight service of the airline (1pts)
* Request the passenger what they want to eat/ drink on flight  (1pts)
* After completing serving them ask them any additional food and continue it (1pts)
	3
	10
	* Remain calm and kindly request them to calm down (1pts)
* Notify the Flight Dispatcher to warn him (1pts)
* If he acting even worse, kick him and report him (1pts)
	3
	II> Stage 2 Evaluation Grading Guidelines
(Completed by Denny - delete the text here to start edit)
