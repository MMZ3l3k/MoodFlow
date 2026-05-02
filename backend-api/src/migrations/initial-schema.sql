--
-- PostgreSQL database dump
--

\restrict nDBEDThmn6e5IisrYI2JJPzTAMV5BP40Ltmmt74Sr9sUxYYuhr38EFQ9xS4AIOT

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: assessment_assignments_targettype_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_assignments_targettype_enum AS ENUM (
    'ALL',
    'USER',
    'DEPARTMENT'
);


--
-- Name: organizations_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.organizations_status_enum AS ENUM (
    'pending',
    'active',
    'blocked',
    'rejected'
);


--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_role_enum AS ENUM (
    'employee',
    'hr',
    'admin',
    'super_admin'
);


--
-- Name: users_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_status_enum AS ENUM (
    'pending',
    'active',
    'rejected',
    'suspended'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: answer_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answer_options (
    id integer NOT NULL,
    "assessmentId" integer NOT NULL,
    value integer NOT NULL,
    label character varying NOT NULL,
    "order" integer NOT NULL
);


--
-- Name: answer_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.answer_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: answer_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.answer_options_id_seq OWNED BY public.answer_options.id;


--
-- Name: assessment_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_assignments (
    id integer NOT NULL,
    "assessmentId" integer NOT NULL,
    "targetType" public.assessment_assignments_targettype_enum DEFAULT 'ALL'::public.assessment_assignments_targettype_enum NOT NULL,
    "targetUserId" integer,
    "targetDepartment" character varying,
    "availableFrom" timestamp without time zone NOT NULL,
    "availableTo" timestamp without time zone NOT NULL,
    "assignedByUserId" integer NOT NULL,
    "organizationId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessment_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_assignments_id_seq OWNED BY public.assessment_assignments.id;


--
-- Name: assessment_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_results (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "assignmentId" integer,
    "assessmentId" integer NOT NULL,
    "rawScore" integer NOT NULL,
    "normalizedScore" integer,
    severity character varying,
    "riskFlags" json,
    "answersSnapshot" json NOT NULL,
    "submittedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: assessment_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessment_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessment_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessment_results_id_seq OWNED BY public.assessment_results.id;


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id integer NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    timeframe character varying,
    "questionCount" integer NOT NULL,
    "isAnonymousForHR" boolean DEFAULT true NOT NULL,
    "requiresAllAnswers" boolean DEFAULT true NOT NULL,
    version character varying DEFAULT '1.0'::character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    "actorUserId" integer,
    "organizationId" integer,
    action character varying(64) NOT NULL,
    "entityType" character varying(64),
    "entityId" integer,
    metadata jsonb,
    "ipAddress" character varying(64),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name character varying NOT NULL,
    "organizationId" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying NOT NULL,
    nip character varying,
    description text,
    status public.organizations_status_enum DEFAULT 'pending'::public.organizations_status_enum NOT NULL,
    "inviteCode" character varying,
    "adminUserId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    "assessmentId" integer NOT NULL,
    "order" integer NOT NULL,
    theme character varying NOT NULL,
    text text,
    "reverseScored" boolean DEFAULT false NOT NULL,
    required boolean DEFAULT true NOT NULL
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: user_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_responses (
    id integer NOT NULL,
    "resultId" integer NOT NULL,
    "questionId" integer NOT NULL,
    "selectedValue" integer NOT NULL
);


--
-- Name: user_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_responses_id_seq OWNED BY public.user_responses.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying NOT NULL,
    "passwordHash" character varying NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    role public.users_role_enum DEFAULT 'employee'::public.users_role_enum NOT NULL,
    status public.users_status_enum DEFAULT 'pending'::public.users_status_enum NOT NULL,
    department character varying,
    "departmentId" integer,
    "organizationId" integer,
    "isOnline" boolean DEFAULT false NOT NULL,
    "lastSeenAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: answer_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options ALTER COLUMN id SET DEFAULT nextval('public.answer_options_id_seq'::regclass);


--
-- Name: assessment_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_assignments ALTER COLUMN id SET DEFAULT nextval('public.assessment_assignments_id_seq'::regclass);


--
-- Name: assessment_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_results ALTER COLUMN id SET DEFAULT nextval('public.assessment_results_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: user_responses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_responses ALTER COLUMN id SET DEFAULT nextval('public.user_responses_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: questions PK_08a6d4b0f49ff300bf3a0ca60ac; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: assessment_results PK_5907c861a69b7bf628090784637; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_results
    ADD CONSTRAINT "PK_5907c861a69b7bf628090784637" PRIMARY KEY (id);


--
-- Name: organizations PK_6b031fcd0863e3f6b44230163f9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY (id);


--
-- Name: answer_options PK_6f7aad84d76ce387af24c1231cb; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT "PK_6f7aad84d76ce387af24c1231cb" PRIMARY KEY (id);


--
-- Name: departments PK_839517a681a86bb84cbcc6a1e9d; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY (id);


--
-- Name: user_responses PK_95f8e565fdbfff567f2b2f70417; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT "PK_95f8e565fdbfff567f2b2f70417" PRIMARY KEY (id);


--
-- Name: assessments PK_a3442bd80a00e9111cefca57f6c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT "PK_a3442bd80a00e9111cefca57f6c" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: assessment_assignments PK_e300035339739f3c27eb55a20e9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_assignments
    ADD CONSTRAINT "PK_e300035339739f3c27eb55a20e9" PRIMARY KEY (id);


--
-- Name: assessment_results UQ_456b21eb5cc4c97355f6479e597; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_results
    ADD CONSTRAINT "UQ_456b21eb5cc4c97355f6479e597" UNIQUE ("userId", "assignmentId");


--
-- Name: organizations UQ_65ebbd58171bb2ed69ea3bda49f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "UQ_65ebbd58171bb2ed69ea3bda49f" UNIQUE ("inviteCode");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: organizations UQ_9b7ca6d30b94fef571cff876884; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE (name);


--
-- Name: assessments UQ_d1d02c4ed1195d3563b4bd8ae1f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT "UQ_d1d02c4ed1195d3563b4bd8ae1f" UNIQUE (code);


--
-- Name: IDX_13c69424c440a0e765053feb4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_13c69424c440a0e765053feb4b" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: IDX_5c4e592ba7096b4c6a3b41354c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5c4e592ba7096b4c6a3b41354c" ON public.audit_logs USING btree ("actorUserId", "createdAt");


--
-- Name: IDX_9885c0f9a2e4081ebae4313d87; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_9885c0f9a2e4081ebae4313d87" ON public.audit_logs USING btree ("organizationId", "createdAt");


--
-- Name: user_responses FK_3b4650dfc86ce23cf50d7a42d02; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT "FK_3b4650dfc86ce23cf50d7a42d02" FOREIGN KEY ("resultId") REFERENCES public.assessment_results(id) ON DELETE CASCADE;


--
-- Name: questions FK_465acef6f7d1194fb40a2e786cf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "FK_465acef6f7d1194fb40a2e786cf" FOREIGN KEY ("assessmentId") REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_assignments FK_490feee50a0d703c63a9732c1ba; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_assignments
    ADD CONSTRAINT "FK_490feee50a0d703c63a9732c1ba" FOREIGN KEY ("assignedByUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users FK_554d853741f2083faaa5794d2ae; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_554d853741f2083faaa5794d2ae" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: user_responses FK_59e610dc09288b16fe182fde0b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_responses
    ADD CONSTRAINT "FK_59e610dc09288b16fe182fde0b8" FOREIGN KEY ("questionId") REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: answer_options FK_708b8014b4e14ea79e7efc27bb3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answer_options
    ADD CONSTRAINT "FK_708b8014b4e14ea79e7efc27bb3" FOREIGN KEY ("assessmentId") REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_results FK_73d09446c6f30e6a7b1cbba18d9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_results
    ADD CONSTRAINT "FK_73d09446c6f30e6a7b1cbba18d9" FOREIGN KEY ("assessmentId") REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_assignments FK_79667d3f566913de881774987d6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_assignments
    ADD CONSTRAINT "FK_79667d3f566913de881774987d6" FOREIGN KEY ("assessmentId") REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: departments FK_9c12b32b01521c1c3595a55b106; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "FK_9c12b32b01521c1c3595a55b106" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: assessment_results FK_b4ed85c463900817973536762ca; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_results
    ADD CONSTRAINT "FK_b4ed85c463900817973536762ca" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: assessment_assignments FK_eec296b42ce6f2bb62b3f37960e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_assignments
    ADD CONSTRAINT "FK_eec296b42ce6f2bb62b3f37960e" FOREIGN KEY ("targetUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users FK_f3d6aea8fcca58182b2e80ce979; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict nDBEDThmn6e5IisrYI2JJPzTAMV5BP40Ltmmt74Sr9sUxYYuhr38EFQ9xS4AIOT

