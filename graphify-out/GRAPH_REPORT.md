# Graph Report - dpx-fitnes  (2026-07-07)

## Corpus Check
- 63 files · ~24,109 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 225 nodes · 521 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc2efe81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth and Navigation Layout|Auth and Navigation Layout]]
- [[_COMMUNITY_Program and Exercise Types|Program and Exercise Types]]
- [[_COMMUNITY_Nutrition and Progress Charts|Nutrition and Progress Charts]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Chat and Notifications|Chat and Notifications]]
- [[_COMMUNITY_Client and Coach Dashboard|Client and Coach Dashboard]]
- [[_COMMUNITY_Print Meal and Program|Print Meal and Program]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_API Utilities and CORS|API Utilities and CORS]]
- [[_COMMUNITY_Client Intake Flow|Client Intake Flow]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Vercel Routing Config|Vercel Routing Config]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 33 edges
2. `supabase` - 32 edges
3. `Profile` - 19 edges
4. `compilerOptions` - 16 edges
5. `notifyUsers()` - 11 edges
6. `Program` - 9 edges
7. `NUTRIENTS` - 7 edges
8. `printProgram()` - 7 edges
9. `printMealPlan()` - 7 edges
10. `ProgramDay` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Planner()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/client/Planner.tsx → src/contexts/AuthContext.tsx
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/contexts/AuthContext.tsx
- `ChatThread()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ChatThread.tsx → src/contexts/AuthContext.tsx
- `Comments()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Comments.tsx → src/contexts/AuthContext.tsx
- `Layout()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Layout.tsx → src/contexts/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "Auth and Navigation Layout"
Cohesion: 0.11
Nodes (20): DPXFITNES Online Coaching Platform, App(), ChatThread(), Comments(), CLIENT_NAV, COACH_NAV, Layout(), NavItem (+12 more)

### Community 1 - "Program and Exercise Types"
Cohesion: 0.15
Nodes (12): YouTubeEmbed(), LibraryExercise, Program, ProgramDay, ProgramExercise, youtubeId(), FullProgram, MyProgram() (+4 more)

### Community 2 - "Nutrition and Progress Charts"
Cohesion: 0.11
Nodes (18): ChartPoint, fmtDate(), NutrientChart(), Props, PR, ProgressCharts(), MEASUREMENT_FIELDS, MeasurementField (+10 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (26): dependencies, date-fns, i18next, react, react-dom, react-i18next, react-router-dom, recharts (+18 more)

### Community 4 - "Chat and Notifications"
Cohesion: 0.17
Nodes (11): Props, Props, INTAKE_QUESTIONS, IntakeQuestionId, NotifyPayload, notifyUsers(), anonKey, supabase (+3 more)

### Community 5 - "Client and Coach Dashboard"
Cohesion: 0.18
Nodes (11): AuthCtx, Profile, Subscription, ClientDetail(), Tab, TABS, ClientRow, CoachDashboard() (+3 more)

### Community 6 - "Print Meal and Program"
Cohesion: 0.21
Nodes (14): esc(), openAndPrint(), PrintDay, PrintExercise, PrintMeal, printMealPlan(), printProgram(), MealPlan (+6 more)

### Community 7 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 9 - "Client Intake Flow"
Cohesion: 0.16
Nodes (13): AppNotification, BoardPost, ChatMessage, Comment, GCalEvent, Group, Role, TrainingSession (+5 more)

### Community 10 - "App Entry Point"
Cohesion: 0.38
Nodes (5): LogRow, ExerciseLog, ProgramAssignment, AssignmentRow, LogRow

## Knowledge Gaps
- **64 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Auth and Navigation Layout` to `Program and Exercise Types`, `Nutrition and Progress Charts`, `Chat and Notifications`, `Client and Coach Dashboard`, `Print Meal and Program`, `Client Intake Flow`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `supabase` connect `Chat and Notifications` to `Auth and Navigation Layout`, `Program and Exercise Types`, `Nutrition and Progress Charts`, `Client and Coach Dashboard`, `Print Meal and Program`, `Client Intake Flow`, `App Entry Point`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `Profile` connect `Client and Coach Dashboard` to `Auth and Navigation Layout`, `Program and Exercise Types`, `Nutrition and Progress Charts`, `Chat and Notifications`, `Print Meal and Program`, `Client Intake Flow`, `App Entry Point`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth and Navigation Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.11491935483870967 - nodes in this community are weakly interconnected._
- **Should `Nutrition and Progress Charts` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._