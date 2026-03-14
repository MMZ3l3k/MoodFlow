Jasne — poniżej masz **sam tekst** do technicznego pliku `ARCHITECTURE.md` dla **MoodMaster**, spójny z wcześniej przygotowanym PRD i zakresem systemu. Uwzględniłem role, moduły, anonimizację, dashboard HR, zatwierdzanie użytkowników przez administratora oraz wymagania bezpieczeństwa. 

````md
# ARCHITECTURE.md — MoodMaster (Technical Version)

## 1. Purpose

This document defines the technical architecture of the MoodMaster platform.  
It is intended for developers implementing, extending, and maintaining the system.

MoodMaster is a web platform for monitoring employee wellbeing in organizations.  
The system supports:
- employee authentication and account approval,
- completing psychological assessments and mood check-ins,
- automatic score calculation,
- aggregated reporting for HR,
- administrative management of users, roles, departments, and survey cycles,
- secure and privacy-oriented handling of sensitive data.

---

## 2. System Architecture Overview

The system follows a **modular layered architecture** with two separate frontend applications, one centralized backend API, and one relational database.

### Main system components
- **Client Frontend** — employee-facing application
- **Admin Frontend** — admin and HR-facing application
- **Backend API** — business logic, authentication, authorization, aggregation, reporting
- **Database** — persistent storage for users, organizations, assessments, responses, results, and audit logs

### High-level data flow

```txt
Client Frontend ----\
                     \
                      ---> Backend API ---> MySQL
                     /
Admin Frontend -----/
````

### Architectural goals

* clear separation of concerns,
* modular domain structure,
* centralized business logic,
* secure-by-default handling of sensitive data,
* support for role-based access control,
* extensibility for future reporting and integrations,
* maintainability and predictable project structure.

---

## 3. Technology Stack

## 3.1 Client Frontend

* Language: **TypeScript**
* Framework: **React**
* Router: **React Router**
* State management: **Redux Toolkit**
* UI: **Shadcn/ui + Tailwind CSS**
* Port: **3000**
* Directory: `client-frontend/`

## 3.2 Admin Frontend

* Language: **TypeScript**
* Framework: **Next.js**
* UI: **Shadcn/ui + Tailwind CSS**
* Port: **3001**
* Directory: `admin-frontend/`

## 3.3 Backend API

* Language: **TypeScript**
* Framework: **NestJS**
* Port: **4000**
* Directory: `backend-api/`

## 3.4 Database

* Engine: **MySQL**
* Port: **3306**
* Directory: `mysql/`

---

## 4. Repository Structure

```txt
moodmaster/
├── client-frontend/
├── admin-frontend/
├── backend-api/
├── mysql/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. Frontend Architecture

## 5.1 Client Frontend

The employee application is responsible for:

* login,
* displaying assigned surveys and tests,
* performing daily mood check-ins,
* showing own completion history,
* presenting personal results where allowed by business rules,
* displaying reminders and privacy information.

### Suggested structure

```txt
client-frontend/
├── src/
│   ├── app/
│   ├── routes/
│   ├── pages/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── assessments/
│   │   ├── mood-check/
│   │   ├── results/
│   │   └── profile/
│   ├── components/
│   ├── services/
│   ├── store/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── styles/
```

### Frontend rules

* keep business logic out of UI components,
* isolate API communication in service/query layers,
* keep feature folders domain-oriented,
* use route guards for authenticated views,
* keep form validation deterministic and reusable.

---

## 5.2 Admin Frontend

The admin/HR application is responsible for:

* admin and HR authentication,
* user approval workflow,
* role and department management,
* survey cycle configuration,
* aggregated reporting and analytics,
* filtering by department, group, time range, and test type,
* export operations.

### Suggested structure

```txt
admin-frontend/
├── src/
│   ├── app/
│   ├── pages/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── departments/
│   │   ├── assessments/
│   │   ├── analytics/
│   │   ├── reports/
│   │   └── settings/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── utils/
```

### Admin frontend rules

* separate admin and HR views by permission,
* never expose raw individual sensitive results unless explicitly allowed,
* dashboard screens should consume aggregated backend endpoints only,
* all filtering should be backend-driven.

---

## 6. Backend Architecture

The backend is the system core and should follow a **domain-driven modular structure** inside a layered NestJS application.

### Suggested backend structure

```txt
backend-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── decorators/
│   │   ├── enums/
│   │   ├── utils/
│   │   └── constants/
│   ├── config/
│   ├── database/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── departments/
│   │   ├── assessments/
│   │   ├── questions/
│   │   ├── responses/
│   │   ├── results/
│   │   ├── mood-checks/
│   │   ├── analytics/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── approvals/
│   │   └── audit/
│   └── health/
```

---

## 7. Backend Layers

Each backend module should follow the same internal structure.

### Suggested module layout

```txt
modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── dto/
├── entities/
├── interfaces/
└── tests/
```

### Layer responsibilities

#### Controllers

Responsible for:

* receiving HTTP requests,
* validating input DTOs,
* calling services,
* returning API responses.

#### Services

Responsible for:

* business logic,
* permission checks,
* orchestration between repositories/modules,
* domain rules.

#### Repositories

Responsible for:

* persistence access,
* CRUD operations,
* query composition,
* aggregation queries.

#### DTOs

Responsible for:

* request validation,
* response contracts,
* keeping API payloads explicit and typed.

#### Entities / Models

Responsible for:

* mapping the database structure,
* representing domain records.

#### Guards / Interceptors / Filters

Responsible for:

* authorization,
* request-level access checks,
* response formatting,
* exception mapping,
* logging and audit hooks.

---

## 8. Core Backend Modules

## 8.1 Auth Module

Responsibilities:

* login,
* token issuance,
* refresh token flow,
* password hashing,
* password reset,
* account status verification.

Important rules:

* user cannot access the platform until approved if approval is required,
* access token should be short-lived,
* refresh token should be revocable,
* passwords must be hashed using bcrypt or equivalent secure algorithm.

---

## 8.2 Users Module

Responsibilities:

* user profile storage,
* role assignment,
* user status handling,
* linking users to organizations and departments.

Suggested statuses:

* `PENDING_APPROVAL`
* `ACTIVE`
* `SUSPENDED`
* `DISABLED`

---

## 8.3 Approvals Module

Responsibilities:

* workflow for newly created users,
* admin approval/rejection,
* status transitions,
* optional approval history.

Example flow:

1. user registers,
2. account is created with `PENDING_APPROVAL`,
3. admin reviews request,
4. admin approves or rejects,
5. approved account becomes `ACTIVE`,
6. system optionally sends notification.

---

## 8.4 Organizations Module

Responsibilities:

* company structure,
* departments,
* user assignments,
* filtering context for HR analytics.

---

## 8.5 Assessments Module

Responsibilities:

* assessment definitions,
* supported questionnaire types,
* versioning,
* activation/deactivation,
* scheduling metadata.

Supported examples:

* PHQ-9
* GAD-7
* PSS-10
* WHO-5
* Mood Meter / simple mood check

---

## 8.6 Questions Module

Responsibilities:

* storing question definitions,
* ordering,
* answer scales,
* metadata required for score calculation.

---

## 8.7 Responses Module

Responsibilities:

* saving user answers,
* validating completion payloads,
* preventing duplicate invalid submissions,
* linking answers to user, assessment, and cycle.

---

## 8.8 Results Module

Responsibilities:

* calculating final scores,
* mapping scores to interpretation levels,
* persisting result snapshots,
* exposing history.

Important rule:

* score calculation logic must be backend-only.

---

## 8.9 Mood Checks Module

Responsibilities:

* daily mood recording,
* lightweight trend data,
* optional comment submission,
* compact employee dashboard widget support.

---

## 8.10 Analytics Module

Responsibilities:

* aggregated reporting,
* filtering by department/time/assessment,
* trend generation,
* participation statistics,
* alert generation.

Important rule:

* HR dashboard must consume anonymized aggregated data only.

---

## 8.11 Reports Module

Responsibilities:

* generating exportable report datasets,
* PDF/CSV export preparation,
* summary generation for HR.

---

## 8.12 Notifications Module

Responsibilities:

* reminders about pending assessments,
* status notifications,
* approval notifications,
* optional email/in-app messaging.

---

## 8.13 Audit Module

Responsibilities:

* tracking admin actions,
* tracking approval decisions,
* logging permission-sensitive operations,
* storing access-critical history.

---

## 9. Roles and Authorization Model

### Roles

* `EMPLOYEE`
* `HR`
* `ADMIN`

### Access model

#### Employee

Can:

* log in,
* complete assigned assessments,
* submit mood checks,
* view own allowed history/results,
* manage own account basics.

Cannot:

* view other users’ data,
* access HR analytics,
* access user management.

#### HR

Can:

* access aggregated dashboards,
* filter by department and time,
* view participation and trend data,
* export reports.

Cannot:

* manage system configuration unless explicitly granted,
* access raw administrative settings,
* bypass anonymization rules.

#### Admin

Can:

* approve users,
* manage roles,
* manage departments and structures,
* manage assessment cycles,
* configure the system.

---

## 10. Authentication and Session Model

### Authentication flow

1. user submits email and password,
2. backend validates credentials,
3. backend checks account status,
4. if approved and active, access token and refresh token are issued,
5. frontend stores session securely,
6. protected endpoints require bearer token.

### Recommended token strategy

* access token: short lifetime,
* refresh token: longer lifetime,
* token rotation supported,
* refresh token invalidation on logout or password reset.

### Security requirements

* bcrypt password hashing,
* JWT signing secrets in environment variables only,
* route guards for protected endpoints,
* role-based decorators/guards,
* rate limiting on login endpoints.

---

## 11. Data Privacy and Anonymization

The system handles wellbeing-related data, so privacy rules must be enforced at the architecture level.

### Key principles

* collect only necessary data,
* separate identity data from assessment data where possible,
* do not expose personally identifiable assessment details in HR dashboards,
* aggregate data before exposing analytics,
* define minimum group thresholds before showing departmental analytics.

### Recommended anonymization safeguards

* no HR dashboard for groups below minimum size,
* mask or suppress low-sample results,
* do not expose raw free-text comments with identifiers,
* audit access to sensitive endpoints.

---

## 12. API Design

The system should use **REST API** with **JSON** payloads.

### Base conventions

* `/api/v1/...`
* plural resource naming,
* versioned endpoints,
* DTO-based input/output,
* standardized error format,
* pagination for list endpoints.

### Example route groups

#### Auth

* `POST /api/v1/auth/register`
* `POST /api/v1/auth/login`
* `POST /api/v1/auth/refresh`
* `POST /api/v1/auth/logout`
* `POST /api/v1/auth/forgot-password`
* `POST /api/v1/auth/reset-password`

#### Users

* `GET /api/v1/users/me`
* `PATCH /api/v1/users/me`
* `GET /api/v1/users`
* `PATCH /api/v1/users/:id/status`
* `PATCH /api/v1/users/:id/role`

#### Approvals

* `GET /api/v1/approvals/pending`
* `POST /api/v1/approvals/:id/approve`
* `POST /api/v1/approvals/:id/reject`

#### Assessments

* `GET /api/v1/assessments/assigned`
* `GET /api/v1/assessments/:id`
* `POST /api/v1/assessments/:id/submit`

#### Mood checks

* `POST /api/v1/mood-checks`
* `GET /api/v1/mood-checks/me/history`

#### Results

* `GET /api/v1/results/me`
* `GET /api/v1/results/me/:assessmentId/history`

#### Analytics

* `GET /api/v1/analytics/wellbeing-index`
* `GET /api/v1/analytics/trends`
* `GET /api/v1/analytics/participation`
* `GET /api/v1/analytics/alerts`

#### Reports

* `GET /api/v1/reports/export/csv`
* `GET /api/v1/reports/export/pdf`

---

## 13. Suggested API Response Standard

### Success example

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "error": null
}
```

### Error example

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

---

## 14. Database Model Overview

The database should remain normalized and clearly structured around the main business entities.

### Main entities

* `users`
* `roles`
* `organizations`
* `departments`
* `user_departments`
* `assessment_templates`
* `assessment_questions`
* `assessment_cycles`
* `assessment_assignments`
* `responses`
* `response_items`
* `results`
* `mood_checks`
* `mood_comments`
* `notifications`
* `audit_logs`

### Key relationships

* one organization has many departments,
* one department has many users,
* one user can have one or more roles,
* one assessment template has many questions,
* one assessment cycle has many assignments,
* one assignment belongs to one user and one assessment,
* one response has many response items,
* one response generates one result snapshot,
* one user has many mood checks.

---

## 15. Example Entity Outline

### users

* id
* email
* password_hash
* first_name
* last_name
* role
* status
* organization_id
* department_id
* created_at
* updated_at

### assessment_templates

* id
* code
* name
* description
* is_active
* version
* created_at

### assessment_questions

* id
* template_id
* question_text
* order_index
* answer_scale_type
* scoring_weight

### responses

* id
* user_id
* assignment_id
* submitted_at

### response_items

* id
* response_id
* question_id
* value

### results

* id
* user_id
* template_id
* score
* interpretation
* calculated_at

### mood_checks

* id
* user_id
* mood_value
* optional_comment
* created_at

### audit_logs

* id
* actor_user_id
* action
* entity_type
* entity_id
* metadata
* created_at

---

## 16. Assessment Processing Flow

### Example flow: employee submits an assessment

1. frontend loads assigned assessments,
2. user opens one assessment,
3. backend returns questionnaire definition,
4. user submits answers,
5. backend validates payload,
6. backend stores response and response items,
7. result service calculates score,
8. result record is created,
9. analytics aggregates may be refreshed,
10. frontend receives completion confirmation.

### Rules

* scoring must not happen in frontend,
* incomplete or malformed submissions must be rejected,
* one assignment should not be submitted twice unless explicitly allowed.

---

## 17. HR Analytics Flow

### Example flow: HR views department trend

1. HR opens analytics page,
2. frontend sends filter params,
3. backend validates role and permissions,
4. backend executes aggregation query,
5. backend suppresses or masks low-sample outputs if needed,
6. frontend renders charts and summary cards.

### Analytics examples

* average PHQ-9 per department,
* stress trend over time,
* completion rate,
* distribution by risk level,
* mood trend by week/month.

---

## 18. Security Architecture

Because the system operates on sensitive wellbeing-related data, security requirements must be enforced across all layers.

### Must-have security controls

* HTTPS in production,
* bcrypt password hashing,
* JWT authentication,
* role-based authorization,
* DTO validation,
* SQL injection protection through ORM/query parameterization,
* sanitized logging,
* audit logs for admin actions,
* secrets stored in environment variables,
* CORS restriction.

### Recommended extra controls

* login rate limiting,
* brute-force mitigation,
* account lock or delay after repeated failures,
* refresh token revocation,
* secure cookie strategy if applicable,
* security headers,
* request logging with sensitive-field masking.

---

## 19. Performance Considerations

### Principles

* keep employee operations lightweight,
* paginate large admin lists,
* aggregate on backend, not frontend,
* add indexes on foreign keys and frequent filters,
* avoid expensive repeated analytics queries without caching.

### Recommended optimization targets

* fast login responses,
* fast dashboard summary loading,
* low-latency assessment submission,
* efficient time-range filtering.

### Potential future optimizations

* Redis caching,
* precomputed analytics tables,
* async export generation,
* background jobs for reminders and reports.

---

## 20. Deployment Model

For local development and staging, the system should run in containers.

### Required containers

* `client-frontend`
* `admin-frontend`
* `backend-api`
* `mysql`

### Orchestration

* `docker-compose.yml`

### Environments

* local
* development
* staging
* production

Each environment should define its own environment variables and secrets.

---

## 21. Environment Variables

### Backend

* `PORT`
* `NODE_ENV`
* `DB_HOST`
* `DB_PORT`
* `DB_USER`
* `DB_PASSWORD`
* `DB_NAME`
* `JWT_SECRET`
* `JWT_REFRESH_SECRET`
* `CORS_ORIGIN`

### Frontends

* `VITE_API_URL` or equivalent for client frontend
* `NEXT_PUBLIC_API_URL` for admin frontend

### Optional services

* `MAIL_HOST`
* `MAIL_PORT`
* `MAIL_USER`
* `MAIL_PASSWORD`

A `.env.example` file must be included without real secrets.

---

## 22. Coding Conventions

### General

* use TypeScript everywhere,
* enforce ESLint and Prettier,
* use domain-based module naming,
* keep business rules in services,
* keep DTOs explicit,
* avoid leaking persistence details into controllers.

### Naming

* React components: `PascalCase`
* files: `kebab-case` or consistent project convention
* DTOs: `CreateUserDto`, `LoginDto`, etc.
* services: `UsersService`
* repositories: `UsersRepository`
* REST resources: noun-based, plural routes

---

## 23. Testing Strategy

### Required test layers

* unit tests for services and scoring logic,
* integration tests for API routes,
* component tests for important frontend flows,
* end-to-end tests for critical user paths.

### Critical paths to test

* registration and approval,
* login and token refresh,
* assessment completion,
* score calculation,
* HR-only analytics access,
* anonymization thresholds,
* role-based access denial,
* export endpoints.

---

## 24. Recommended Implementation Order

### Phase 1

* repository setup,
* frontend skeletons,
* backend skeleton,
* database container,
* docker-compose,
* README.

### Phase 2

* auth module,
* users module,
* approvals module,
* organizations/departments module.

### Phase 3

* assessments,
* questions,
* assignments,
* responses,
* results.

### Phase 4

* employee dashboard,
* HR analytics,
* admin management screens.

### Phase 5

* reports,
* notifications,
* audit logs,
* performance improvements,
* additional security hardening.

---

## 25. Developer Rules

Rules:
Start with the application skeleton, then create Docker configuration.
First write a short technical plan describing what, how, and why you are going to implement.
Keep the folder structure as simple as possible, without unnecessary intermediate folders.
Use the `pwd` command to verify the current working directory before generating files.
Create and maintain documentation in `README.md`.

Additional rules:

* implement incrementally,
* do not mix domain logic with presentation logic,
* do not expose sensitive internal models directly to the frontend,
* keep API contracts stable,
* treat anonymization as a backend responsibility,
* every new module should follow the same structural convention.

---

## 26. Summary

MoodMaster is designed as a modular full-stack web platform with:

* two dedicated frontend applications,
* one centralized NestJS backend,
* one relational MySQL database,
* role-based access control,
* aggregated and anonymized HR analytics,
* approval workflow for new users,
* architecture ready for future reporting, integrations, and scaling.

This architecture supports both MVP delivery and long-term maintainability.
