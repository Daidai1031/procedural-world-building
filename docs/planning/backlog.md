# Project Backlog

## project concept

Delirious NYC is an interactive city simulation in which players take on different roles with unequal power, goals, and access to information. Their decisions and unexpected events will procedurally shape the city, producing unpredictable or absurd outcomes.

## Core World Components

The final synthetic world should include:

- **Geography:** districts and neighborhoods with different characteristics
- **Inhabitants:** residents, organizers, tourists, and government actors
- **Internal logic:** rules connecting policies, behavior, attention, rent, tourism, and satisfaction
- **History:** a generated record of decisions, events, and changes
- **Interaction:** ways for users to intervene in and influence the simulation
- **Emergence:** outcomes produced by interacting systems rather than predetermined endings


## Initial Feature Backlog

### 1. Project Foundation

- [ ] Set up the project with React and Three.js
- [ ] Create the basic Three.js scene, camera, lighting, and controls
- [ ] Define the main city variables and the relationships between them
- [ ] Create a simulation loop that updates the city over time

### 2. Procedural Geography

- [ ] Create a simplified 3D city divided into districts or neighborhoods
- [ ] Give each neighborhood procedurally generated characteristics
- [ ] Represent characteristics such as rent, population, tourism, and public attention
- [ ] Make the appearance of each neighborhood respond to changes in its data

### 3. Inhabitants and Roles

- [ ] Add residents, organizers, tourists, and government actors to the city
- [ ] Give each type of inhabitant different goals, behaviors, and influence
- [ ] Distribute inhabitants across neighborhoods according to procedural rules
- [ ] Allow inhabitants to react to policies, events, and changing city conditions

### 4. City Systems and Feedback Loops

- [ ] Create relationships between rent, tourism, attention, and resident satisfaction
- [ ] Allow changes in one city variable to affect other variables
- [ ] Add population movement between neighborhoods
- [ ] Make city conditions evolve without requiring constant user input

### 5. Procedural Events

- [ ] Generate events based on the current state of the city
- [ ] Include events such as protests, viral posts, tourism spikes, and rent increases
- [ ] Give events different probabilities and consequences
- [ ] Allow multiple events and systems to interact and create unexpected outcomes

### 6. Player Interaction

- [ ] Allow the player to select and inspect neighborhoods
- [ ] Display the current conditions and history of each neighborhood
- [ ] Allow the player to propose or select city policies
- [ ] Create a basic voting or public-response system
- [ ] Allow residents and organizers to protest or submit petitions
- [ ] Allow tourists to influence the city through spending or social attention
- [ ] Show the consequences of player decisions over time

### 7. Generated History

- [ ] Record major policies, events, protests, and neighborhood changes
- [ ] Create a timeline of the city’s generated history
- [ ] Connect past events to current city conditions
- [ ] Allow each simulation run to produce a different version of New York City

### 8. Complete Browser Experience

- [ ] Create a landing screen that introduces the world and its rules
- [ ] Add clear instructions and interface feedback
- [ ] Create a way to start, pause, reset, and replay the simulation
- [ ] Save or export the current simulation state
- [ ] Test performance and usability in the browser
- [ ] Deploy a publicly accessible version of the project

### 9. Documentation

- [ ] Explain the conceptual premise of Delirious NYC
- [ ] Document the procedural rules and algorithms
- [ ] Document the project’s React and Three.js structure
- [ ] Record the tools, libraries, and external assets used
- [ ] Document how AI-assisted coding contributed to development
- [ ] Update the README with setup and deployment instructions

## Stretch Goals

These features will be considered after the core synthetic world is functional.

- [ ] Add real-time multiplayer interaction
- [ ] Assign different roles to different players
- [ ] Give each player access to different information
- [ ] Add more detailed procedural characters and relationships
- [ ] Add additional neighborhoods, policies, and city systems
- [ ] Allow players to intentionally disrupt the system
- [ ] Compare the histories created by different simulation runs