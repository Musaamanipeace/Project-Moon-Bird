Moonbug Product & Technical Documentation
Table of Contents
Login, Authentication, and Authorization

PostgreSQL Database Schema

REST APIs

Profile Portfolio

Challenges

Localized Ads & Surveys (Watchers and Advertisers)

Tools, Widgets, and Games

Landing Pages (Signed and Unsigned Users)

Support, FAQ, and Contact Page

Terms and Conditions

Payment System

Live Chat

User Education

Profile Settings

Donate Tab

Repository Licensing (Future Additions)

1. Login, Authentication, and Authorization
Session Management: Implements secure cookie saving and session expiry logic.

Security Mechanisms: Features rate-limiting, CAPTCHA verification, and device tracking to prevent automated attacks.

Onboarding Flow: Requires verification using a legitimate email address. An One-Time Password (OTP) with a strict expiration window is sent to complete registration or login.

2. Profile Portfolio
The portfolio supports dynamic fields to showcase a user's identity, assets, and activities.

Standard Fields: Real name, nickname, age, birthday, weight, height, status, hobbies, current projects/activities, completed challenges, current challenge, achievements, rank, professional CV, and links (either a collection of URLs or a single Linktree reference).

Asset Asset Tracking: Dedicated sections for personal items: "My Car," "My Bicycle," "My Pets," "My Jewelry," and "Clothing Collections."

Favorites Field: Defaults to favorite book, movie, meal, place to visit, color, superhero, junk food, fruit, video game, day of the week, and Moonbug challenge. The system automatically populates additional suggestion fields based on user hobbies.

Data Architecture: Fields use a nested, hierarchical structure. A basic portfolio field consists of a title and a value (e.g., Name: Jacob). However, the system supports complex types: integers, multi-value fields, and custom sub-fields where users can input nested key-value pairs. Data integrity is maintained via a strict, logical rendering order.

3. Tools, Widgets, and Games
Tools are central to the Moonbug ecosystem and work in tandem with user challenges and activities.

A. The Notebook
The notebook operates across several distinct functional modes:

Daily Journal: Updated every evening to plan for the upcoming day.

Dream Journal: Dedicated space to record and track dreams.

Logbook: Built to log progress on challenges and personal activities.

Life Goals: A roadmap to document lifetime acquisitions and achievements.

Scheduler: Handles daily, weekly, or monthly activities with attached deadlines.

Ideas Mode: A cataloging space to title and categorize spontaneous thoughts.

B. The Moon Dial (Lunar Clock)
An offline-first widget that visualizes the moon’s position and trajectory using a local, universal data point. It eliminates constant network dependency, performing validation checks only during active internet connections.

Visual Elements: Displays a circular layout showing the celestial equator (the sun's path at equinox), the current overhead latitude (indicated by a sun icon), and the current day's lunar trajectory (indicated by a moon icon).

Path Tracking: Tracks continuous orbital paths rather than immediate altitude. The 24-hour dial tracks from sunrise to sunrise. Markers explicitly denote sunrise, midday, sunset, midnight, moonrise, moonset, mid-moonlight, and mid-nomoon.

Calculators & Insights: Features horizon visibility indicators, local weather, upcoming astronomical events, illumination percentage, and time remaining until the next phase. Includes a phase scroller for future dates, a "Did You Know?" daily synopsis, and a historical calculator that determines the exact number of lunar cycles elapsed since a user's birthday alongside their birth moon phase.

C. The Events Catalogue
Tier 1 (Astronomical Events): A comprehensive annual catalog available completely offline. An automated AI pipeline identifies, updates, and persists newly discovered celestial events into the database. Users can browse significant past astronomical occurrences and historical catastrophic events visible from Earth. Each event tracking object stores properties for rarity, title, a short synopsis, and educational source material.

Tier 2 (Community Events): Added directly by users and verified advertisers. These entries can be saved natively to a user's personal calendar.

D. Word-Guessing Game
A general knowledge word-guessing game requiring players to identify a word or a two-word phrase (representing famous people, places, or corporations).

Mechanics: Players receive 4 primary hints, with each hint flashing sequentially for 6 seconds. Answering early preserves a point bonus.

Difficulty Scaling: 1,000 highly challenging game levels generated via AI, split into three difficulty modes:

Easy: Grants 3 additional hints.

Medium: Grants 1 additional hint.

Hard: Standard mode restricted strictly to the 4 core hints.

4. Challenges
Challenges are real-world activities designed to foster community engagement and skill development across writing, programming, art, and creative disciplines.

Structure: Challenges are broken down into sequential stages. Each stage includes an educational tutorial layout providing resource links, alongside a prominent task display.

Proof of Execution: Users document completion by uploading logs, links, screenshots, or native smartphone photos. Tasks can contain optional steps, such as tracking non-mandatory daily progress photos for fitness challenges.

Short Challenges: Simplified, self-monitored tasks requiring no peer review (e.g., creating a timetable, setting life goals, answering astronomical trivia, or a manual 10,000-count tapping matrix that verifies exact input interactions). Users can create and share these freely.

Long Challenges: Multi-stage, complex activities requiring an audit phase.

The Audit Phase: A random Moonbug peer reviews submitted logs via a dedicated live chat room where creators explain their workflow. Points are released upon successful validation.

Social & Layout Features: Challenges support group completion via collaborative chatrooms. Challenge logs generate clean, visually polished achievement cards optimized for cross-platform sharing. Code implementation emphasizes structural attention to detail and a robust architectural base over rapid deployment.

5. Advertisers and Watchers (The Ads Feed)
The advertising engine operates as a core monetization pillar, balancing user privacy with direct-to-wallet reward infrastructure.

Ad Formats: Features commercial video ads, campaign visuals, picture ads, paid challenges, and targeted surveys.

Direct Crypto Payouts: Surveyors and paid-ad partners pay users directly into their individual, external cryptocurrency wallets. Moonbug avoids internal escrow or withdrawal thresholds for these interactions.

User Personalization: Watchers curate their feed by selecting preferred brands, target business domains, or behavioral categories (e.g., influential, humorous). Video advertisements allow a skip action after 6 seconds.

Content Guardrails: The platform enforces content filters. Users must explicitly toggle access for NSFW material (such as music videos or legal cannabis enterprises). Explicit pornography, prostitution, full nudity, and low-value self-promotion (e.g., basic Instagram follower farming) are strictly banned.

Phased Implementation: The ad network will launch using curated, embedded fallbacks. As native advertisers register, the algorithmic matching engine will progressively swap embedded assets for direct campaign feeds.

6. User Navigation & Home Dashboards
The application utilizes a static master header containing all primary tabs, allowing vertical scrolling for individual view components.

Logged-In Home Dashboard:

User achievements and ranking summary.

Personalized challenge suggestions with an instant action button.

Upcoming astronomical events card with a deep-link to the full catalog.

A public social logs feed displaying shared community milestones.

A tailored ad container with a direct gateway button.

Newsletter subscription block. The community newsletter is written bi-weekly by selected Moonbug users.

An informational banner highlighting targeted survey opportunities based on hobbies, interests, and geographical location.

Survey Integrity: Partners use analytical tools to scan demographic profiles, but survey validation is strictly governed by Moonbug. Once a user passes initial screening and begins a survey, partner companies cannot trigger a mid-survey screen-out to collect unpaid partial data.

7. Future Additions (Long-Term Roadmap)
Moonbug Radio: A community-queued audio streaming feature. Users can submit embeddable links under 6 minutes in length to a global playback queue.

Expanded Gaming Suite: Additional modules to expand the application's built-in minigame catalog.

Development Tracking: Step-by-step progress requires complete technical feature tracking. Unimplemented, planned capabilities must be meticulously listed in a dedicated feature log file following every sprint milestone.

1. Crypto Wallet Integration & Direct PayoutsTo allow advertisers to pay users directly without using Moonbug as a financial escrow, use a stateless routing architecture built around non-custodial public keys.Public Key Ledger: During profile setup, users provide a public wallet address (e.g., Solana, Bitcoin Lightning LNURL, or EVM-compatible address). Moonbug stores only this public key in the PostgreSQL database.Encrypted Ad/Survey Payloads: When a partner company uploads a survey or ad campaign, they must deposit the total reward pool into a smart contract or programmatically managed hot wallet on their end.Cryptographic Completion Tokens: When a user completes a survey or watches an ad, the Moonbug backend validates the interaction and signs a one-time completion token using Moonbug's private key. The client app forwards this signed token directly to the advertiser’s payout API. The advertiser's system verifies the Moonbug signature and instantly broadcasts the payout transaction to the user's public address on-chain. This keeps Moonbug completely out of the financial flow while retaining full monitoring authority over completion verification.2. Universal Data Point for the Offline Lunar ClockTo compute highly precise local lunar tracking without hitting a network API, implement a lightweight client-side astronomical calculation engine.Ephemeris Coefficients Baseline: Embed a compressed dataset of semi-analytical variations (such as a simplified ELP2000-82 lunar theory model or standard orbital elements) directly within the SQLite database.The Universal Data Point: Use Terrestrial Time (TT) / Julian Date as your core universal temporal variable.Client-Side Computation: The app takes the device's internal hardware clock (converted to Julian Date) and its last known hardware GPS coordinates (latitude/longitude stored locally). A JavaScript/Go math module runs the trigonometric algorithms locally to calculate the moon's right ascension, declination, and local topocentric coordinates. This generates the exact visual paths for the Moon Dial completely offline. When the user goes online, the app simply pulls a small delta file to adjust for clock drift or polar motion variations.3. Client-Side Security for Non-Proof-of-Work ChallengesBecause short tasks (like the 10,000-tap challenge) run completely local to the device without external auditing, you must protect the integrity of the client-side state machine.Cryptographic Input Taps: Instead of incrementing a simple integer variable (which is easily manipulated via memory editors like Cheat Engine or rooted device hooks), tie each screen tap to a hardware-timestamped user event. For example, pass the screen coordinates and timing interval ($t_{\text{current}} - t_{\text{previous}}$) of each tap into a rolling HMAC (Hash-based Message Authentication Code) chain.Anomaly Detection Hooks: Implement a lightweight client-side script that analyzes the rhythm of the inputs. Human tapping has natural variance; automated macro clickers tap at perfectly uniform millisecond intervals or inhumanly high speeds. If the standard deviation of tap intervals falls below a strict threshold, flag the event stream as a bot.Signed State Payloads: Upon reaching 10,000 taps, the client packages the final cryptographic hash chain alongside the device metrics and sends it to the backend. The backend quickly verifies the signature and the tap cadence profile before unlocking the point reward.


*  more in depth context *

1. Crypto Wallet Integration & Direct PayoutsTo allow advertisers to pay users directly without using Moonbug as a financial escrow, use a stateless routing architecture built around non-custodial public keys.Public Key Ledger: During profile setup, users provide a public wallet address (e.g., Solana, Bitcoin Lightning LNURL, or EVM-compatible address). Moonbug stores only this public key in the PostgreSQL database.Encrypted Ad/Survey Payloads: When a partner company uploads a survey or ad campaign, they must deposit the total reward pool into a smart contract or programmatically managed hot wallet on their end.Cryptographic Completion Tokens: When a user completes a survey or watches an ad, the Moonbug backend validates the interaction and signs a one-time completion token using Moonbug's private key. The client app forwards this signed token directly to the advertiser’s payout API. The advertiser's system verifies the Moonbug signature and instantly broadcasts the payout transaction to the user's public address on-chain. This keeps Moonbug completely out of the financial flow while retaining full monitoring authority over completion verification.2. Universal Data Point for the Offline Lunar ClockTo compute highly precise local lunar tracking without hitting a network API, implement a lightweight client-side astronomical calculation engine.Ephemeris Coefficients Baseline: Embed a compressed dataset of semi-analytical variations (such as a simplified ELP2000-82 lunar theory model or standard orbital elements) directly within the SQLite database.The Universal Data Point: Use Terrestrial Time (TT) / Julian Date as your core universal temporal variable.Client-Side Computation: The app takes the device's internal hardware clock (converted to Julian Date) and its last known hardware GPS coordinates (latitude/longitude stored locally). A JavaScript/Go math module runs the trigonometric algorithms locally to calculate the moon's right ascension, declination, and local topocentric coordinates. This generates the exact visual paths for the Moon Dial completely offline. When the user goes online, the app simply pulls a small delta file to adjust for clock drift or polar motion variations.3. Client-Side Security for Non-Proof-of-Work ChallengesBecause short tasks (like the 10,000-tap challenge) run completely local to the device without external auditing, you must protect the integrity of the client-side state machine.Cryptographic Input Taps: Instead of incrementing a simple integer variable (which is easily manipulated via memory editors like Cheat Engine or rooted device hooks), tie each screen tap to a hardware-timestamped user event. For example, pass the screen coordinates and timing interval ($t_{\text{current}} - t_{\text{previous}}$) of each tap into a rolling HMAC (Hash-based Message Authentication Code) chain.Anomaly Detection Hooks: Implement a lightweight client-side script that analyzes the rhythm of the inputs. Human tapping has natural variance; automated macro clickers tap at perfectly uniform millisecond intervals or inhumanly high speeds. If the standard deviation of tap intervals falls below a strict threshold, flag the event stream as a bot.Signed State Payloads: Upon reaching 10,000 taps, the client packages the final cryptographic hash chain alongside the device metrics and sends it to the backend. The backend quickly verifies the signature and the tap cadence profile before unlocking the point reward.