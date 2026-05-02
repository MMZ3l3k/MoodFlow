# Diagram klas — moduły backendu MoodFlow

Diagram pokazuje główne klasy modułów NestJS i ich zależności (dependency injection).

## Diagram

```mermaid
classDiagram
    class AppModule {
        +imports: [ConfigModule, TypeOrmModule, AuthModule, ...]
    }

    class AuthService {
        -usersService: UsersService
        -organizationsService: OrganizationsService
        -jwtService: JwtService
        -auditService: AuditService
        +register(dto): Promise~void~
        +registerCompany(dto): Promise~void~
        +registerEmployee(dto): Promise~void~
        +login(dto): Promise~Tokens~
        +refresh(userId, email): Promise~Tokens~
        +logout(authHeader): Promise~void~
        -generateTokens(): Tokens
    }

    class UsersService {
        -usersRepository: Repository~User~
        -auditService: AuditService
        +findByEmail(email): Promise~User~
        +findById(id): Promise~User~
        +updateStatus(id, dto, orgId, actorId): Promise~User~
        +changePassword(id, current, next): Promise~void~
        +deleteAccount(id): Promise~void~
        +findAll(orgId?): Promise~User[]~
    }

    class OrganizationsService {
        -organizationsRepository: Repository~Organization~
        -auditService: AuditService
        +create(dto): Promise~Organization~
        +approve(id, actorId): Promise~Organization~
        +reject(id, actorId): Promise~Organization~
        +block(id, actorId): Promise~Organization~
        +findByInviteCode(code): Promise~Organization~
    }

    class AssessmentsService {
        -assessmentRepo: Repository~Assessment~
        -assignmentRepo: Repository~Assignment~
        -mailService: MailService
        -auditService: AuditService
        +findAll(): Promise~Assessment[]~
        +createAssignment(dto, actorId, orgId): Promise~Assignment~
        +deleteAssignment(id, orgId, actorId): Promise~void~
        +findAssignedForUser(userId): Promise~Assignment[]~
        -resolveTargetUsers(assignment): Promise~User[]~
        -sendAssignmentEmails(assignment, name): Promise~void~
    }

    class ResultsService {
        -resultRepo: Repository~Result~
        -responseRepo: Repository~Response~
        +submit(userId, dto): Promise~Result~
        +getMyResults(userId): Promise~Result[]~
        +calculateScore(answers, assessment): Score
        +getWellbeingIndex(userId): WellbeingIndex
    }

    class AnalyticsService {
        -resultRepo: Repository~Result~
        -userRepo: Repository~User~
        +getSummary(orgId): Summary
        +getDepartmentStats(orgId): DeptStats[]
        +getDepartmentWellbeingLoad(orgId): WellbeingLoad
        +getRiskReport(orgId): RiskReport
        -meetsThreshold(groupSize): bool
    }

    class AuditService {
        -auditRepo: Repository~AuditLog~
        +log(event): Promise~void~
        +list(orgId?, limit): Promise~AuditLog[]~
    }

    class MailService {
        -mailerService: MailerService
        +sendAssignmentNotification(payload): Promise~void~
        -escapeHtml(input): string
    }

    class JwtAuthGuard {
        +canActivate(context): bool
    }

    class RolesGuard {
        +canActivate(context): bool
    }

    AppModule --> AuthService
    AppModule --> UsersService
    AppModule --> OrganizationsService
    AppModule --> AssessmentsService
    AppModule --> ResultsService
    AppModule --> AnalyticsService
    AppModule --> AuditService

    AuthService --> UsersService
    AuthService --> OrganizationsService
    AuthService --> AuditService

    UsersService --> AuditService
    OrganizationsService --> AuditService
    AssessmentsService --> MailService
    AssessmentsService --> AuditService

    JwtAuthGuard --> UsersService
    RolesGuard --> JwtAuthGuard
```

## Wzorce architektoniczne

- **Dependency Injection** — wszystkie zależności przez konstruktor (NestJS IoC container).
- **Repository Pattern** — TypeORM `Repository<Entity>` dla każdego agregatu.
- **Guard Pattern** — `JwtAuthGuard` (autentykacja) + `RolesGuard` (autoryzacja) jako warstwa pre-handler.
- **DTO + ValidationPipe** — globalna walidacja wejścia (whitelist + forbidNonWhitelisted).
- **Audit Log Service** — wstrzykiwany do innych serwisów, niezależny od kontekstu HTTP (wartość `actorUserId` przekazywana z kontrolera).
