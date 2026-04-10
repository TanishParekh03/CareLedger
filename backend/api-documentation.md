# CareLedger — API Documentation

> **Base URL:** `http://localhost:3000/api`
> **Content-Type:** `application/json` (unless stated otherwise)
> **Last Updated:** April 2026

---

## Table of Contents

1. [Standard Response Format](#standard-response-format)
2. [Authentication](#authentication)
3. [Users](#1-users--apiusers)
4. [Patients](#2-patients--apipatients)
5. [Patient Allergies](#3-patient-allergies--apipatients)
6. [Patient Chronic Conditions](#4-patient-chronic-conditions--apipatients)
7. [Patient Emergency Info](#5-patient-emergency-info--apipatients)
8. [Doctors](#6-doctors--apidoctors)
9. [Consultations](#7-consultations--apiconsultations)
10. [Admin](#8-admin--apiadmin)
11. [Active Medications](#9-active-medications--apimedications)
12. [Clinics](#10-clinics--apiclinics)
13. [OCR](#11-ocr--apiocr)
14. [Error Codes Reference](#error-codes-reference)

---

## Standard Response Format

All responses follow a consistent JSON envelope.

### Success Response

```json
{
  "success": true,
  "data": { /* resource payload */ },
  "message": "Operation successful."
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message."
  }
}
```

---

## Authentication

Protected routes require a **JWT Bearer token** in the `Authorization` header.

```
Authorization: Bearer <token>
```

The token is obtained from the [Login](#post-apiuserslogin) endpoint. The JWT payload contains:

| Field    | Type   | Description              |
|----------|--------|--------------------------|
| `userId` | UUID   | The authenticated user's ID |
| `role`   | string | `patient`, `doctor`, or `admin` |

### Middleware Summary

| Middleware              | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `authenticate`          | Validates JWT token and populates `req.user` with `{ id, role }`           |
| `requireRole(role)`     | Checks `req.user.role` matches the required role                           |
| `requireVerifiedDoctor` | Checks user is a doctor AND their profile has `is_verified = true`         |
| `requireAdmin`          | Checks `req.user.role` is `admin`                                          |

> **Key icons used below:**
> - 🔓 Public — no auth required
> - 🔐 Authenticated — requires Bearer token
> - 👤 Role-restricted — requires specific role

---

## 1. Users — `/api/users`

### `POST /api/users/signup` 🔓

Register a new user account.

**Request Body:**

| Field            | Type   | Required | Description                        |
|------------------|--------|----------|------------------------------------|
| `email`          | string | ✅       | User's email address               |
| `phone`          | string | ✅       | User's phone number                |
| `plain_password` | string | ✅       | Plain-text password (hashed server-side) |
| `role`           | string | ✅       | Must be `"patient"` or `"doctor"`  |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "patient"
  },
  "message": "User created successfully"
}
```

**Possible Errors:**

| Status | Code         | When                          |
|--------|--------------|-------------------------------|
| 400    | BAD_REQUEST  | Missing fields or invalid role |
| 409    | CONFLICT     | User already exists            |

---

### `POST /api/users/login` 🔓

Authenticate and receive a JWT token.

**Request Body:**

| Field            | Type   | Required | Description                                       |
|------------------|--------|----------|---------------------------------------------------|
| `role`           | string | ✅       | `"patient"`, `"doctor"`, or `"admin"`             |
| `plain_password` | string | ✅       | User's password                                   |
| `email`          | string | ⚠️       | At least one of `email` or `phone` is required    |
| `phone`          | string | ⚠️       | At least one of `email` or `phone` is required    |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful"
}
```

> ⏳ Token expires in **24 hours**.

**Possible Errors:**

| Status | Code         | When                      |
|--------|--------------|---------------------------|
| 400    | BAD_REQUEST  | Missing required fields   |
| 401    | UNAUTHORIZED | Wrong password            |
| 404    | NOT_FOUND    | User not found            |

---

### `GET /api/users/:id` 🔓

Get a user by ID.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | User ID     |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "patient",
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "message": "User retrieved successfully"
}
```

---

### `GET /api/users/` 🔐 👤 `admin`

Get all users. Supports optional role filter.

**Query Params:**

| Param  | Type   | Required | Description                                    |
|--------|--------|----------|------------------------------------------------|
| `role` | string | ❌       | Filter by role: `patient`, `doctor`, or `admin` |

**Success Response:** `200 OK` — returns an array of user objects.

---

### `PUT /api/users/:id` 🔐

Update a user's account info.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | User ID     |

**Request Body (all optional, at least one required):**

| Field            | Type   | Description                |
|------------------|--------|----------------------------|
| `email`          | string | New email                  |
| `phone`          | string | New phone number           |
| `plain_password` | string | New password               |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "new@example.com",
    "phone": "1111111111",
    "role": "patient",
    "updated_at": "2026-01-02T00:00:00.000Z"
  },
  "message": "User updated successfully"
}
```

---

### `DELETE /api/users/:id` 🔐 👤 `admin`

Delete a user by ID.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | User ID     |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": { "id": "uuid" },
  "message": "User deleted successfully"
}
```

---

## 2. Patients — `/api/patients`

> ⚠️ All patient routes below use `authenticate` middleware at the route level (via `requireRole('patient')`), **except** `GET /:id` which allows both patients and doctors.

### `POST /api/patients/` 🔐 👤 `patient`

Create the authenticated patient's profile.

**Request Body:**

| Field           | Type   | Required | Description                              |
|-----------------|--------|----------|------------------------------------------|
| `full_name`     | string | ✅       | Patient's full name                      |
| `health_id`     | string | ✅       | Unique health identifier                 |
| `date_of_birth` | string | ❌       | Date of birth (e.g. `"2000-01-15"`)      |
| `gender`        | string | ❌       | `"male"`, `"female"`, or `"other"`       |
| `blood_group`   | string | ❌       | Blood group (e.g. `"O+"`, `"AB-"`)       |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "John Doe",
    "health_id": "HLTH-12345",
    "date_of_birth": "2000-01-15",
    "gender": "male",
    "blood_group": "O+"
  },
  "message": "Patient profile created successfully."
}
```

**Possible Errors:**

| Status | Code             | When                                    |
|--------|------------------|-----------------------------------------|
| 400    | BAD_REQUEST      | Missing `full_name` or `health_id`      |
| 400    | VALIDATION_ERROR | Invalid gender value                    |
| 409    | CONFLICT         | Profile already exists / Health ID taken |

---

### `GET /api/patients/` 🔐 👤 `patient`

Get the authenticated patient's own profile (includes `email` and `phone` from user table).

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "John Doe",
    "health_id": "HLTH-12345",
    "date_of_birth": "2000-01-15",
    "gender": "male",
    "blood_group": "O+",
    "email": "john@example.com",
    "phone": "9876543210"
  },
  "message": "Operation successful."
}
```

---

### `PUT /api/patients/` 🔐 👤 `patient`

Update the authenticated patient's profile.

**Request Body (all optional, at least one required):**

| Field           | Type   | Description                        |
|-----------------|--------|------------------------------------|
| `full_name`     | string | Updated name                       |
| `date_of_birth` | string | Updated DOB                        |
| `gender`        | string | `"male"`, `"female"`, or `"other"` |
| `blood_group`   | string | Updated blood group                |

**Success Response:** `200 OK`

---

### `GET /api/patients/consultations` 🔐 👤 `patient`

Get all consultations for the authenticated patient.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "doctor_id": "uuid",
      "consultation_date": "2026-03-15T10:00:00.000Z",
      "status": "completed",
      "doctor_name": "Dr. Smith",
      "specialization": "Cardiology",
      "clinic_name": "Heart Care Center"
    }
  ],
  "message": "Operation successful."
}
```

---

### `GET /api/patients/:id` 🔐

Get a patient profile by their **patient ID** (not user ID).

**Access Control:**
- **Patients** — can only view their own profile.
- **Doctors** — can only view if they have an active `access_permission` for this patient.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | Patient ID  |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "John Doe",
    "health_id": "HLTH-12345",
    "date_of_birth": "2000-01-15",
    "gender": "male",
    "blood_group": "O+"
  },
  "message": "Operation successful."
}
```

---

### `POST /api/patients/grant-access` 🔐 👤 `patient`

Grant a verified doctor access to the patient's records.

**Request Body:**

| Field       | Type   | Required | Description                                       |
|-------------|--------|----------|---------------------------------------------------|
| `doctor_id` | UUID   | ✅       | The **doctor profile ID** (not user ID) to grant   |
| `expires_at`| string | ❌       | ISO timestamp for access expiry (null = permanent) |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "status": "ACTIVE",
    "expires_at": null,
    "created_at": "2026-03-15T10:00:00.000Z"
  },
  "message": "Access granted successfully."
}
```

**Possible Errors:**

| Status | Code       | When                                        |
|--------|------------|---------------------------------------------|
| 404    | NOT_FOUND  | Doctor not found or not verified             |
| 409    | CONFLICT   | Active permission already exists for doctor  |

---

### `DELETE /api/patients/revoke-access/:doctorId` 🔐 👤 `patient`

Revoke a doctor's access to the patient's records.

**URL Params:**

| Param      | Type | Description       |
|------------|------|-------------------|
| `doctorId` | UUID | Doctor profile ID |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "status": "REVOKED"
  },
  "message": "Access revoked successfully."
}
```

---

### `GET /api/patients/access-list` 🔐 👤 `patient`

Get all access permissions the patient has granted.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "doctor_id": "uuid",
      "status": "ACTIVE",
      "expires_at": null,
      "created_at": "2026-03-15T10:00:00.000Z",
      "doctor_name": "Dr. Smith",
      "specialization": "Cardiology",
      "clinic_name": "Heart Care Center"
    }
  ],
  "message": "Operation successful."
}
```

---

## 3. Patient Allergies — `/api/patients`

> All allergy routes require 🔐 👤 `patient`.

### `POST /api/patients/allergies` 🔐 👤 `patient`

Add a new allergy.

**Request Body:**

| Field      | Type   | Required | Description                                |
|------------|--------|----------|--------------------------------------------|
| `allergen` | string | ✅       | Name of the allergen                       |
| `severity` | string | ✅       | `"mild"`, `"moderate"`, or `"severe"`      |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "allergen": "Peanuts",
    "severity": "severe"
  },
  "message": "Allergy added successfully."
}
```

---

### `GET /api/patients/allergies` 🔐 👤 `patient`

Get the authenticated patient's allergies (sorted alphabetically by allergen).

**Success Response:** `200 OK` — returns array of allergy objects.

---

### `PUT /api/patients/allergies/:id` 🔐 👤 `patient`

Update an allergy by ID.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | Allergy ID  |

**Request Body (at least one required):**

| Field      | Type   | Description                           |
|------------|--------|---------------------------------------|
| `allergen` | string | Updated allergen name                 |
| `severity` | string | `"mild"`, `"moderate"`, or `"severe"` |

**Success Response:** `200 OK`

---

### `DELETE /api/patients/allergies/:id` 🔐 👤 `patient`

Delete an allergy by ID.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": { "id": "uuid" },
  "message": "Allergy deleted successfully."
}
```

---

## 4. Patient Chronic Conditions — `/api/patients`

> All chronic condition routes require 🔐 👤 `patient`.

### `POST /api/patients/chronic-conditions` 🔐 👤 `patient`

Add a new chronic condition.

**Request Body:**

| Field            | Type   | Required | Description                                    |
|------------------|--------|----------|------------------------------------------------|
| `condition_name` | string | ✅       | Name of the condition                          |
| `status`         | string | ✅       | `"active"`, `"managed"`, or `"resolved"`       |
| `diagnosed_date` | string | ❌       | Date of diagnosis (e.g. `"2023-06-01"`)        |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "condition_name": "Diabetes Type 2",
    "status": "managed",
    "diagnosed_date": "2023-06-01"
  },
  "message": "Chronic condition added successfully."
}
```

---

### `GET /api/patients/chronic-conditions` 🔐 👤 `patient`

Get the authenticated patient's chronic conditions (sorted by `diagnosed_date` descending).

**Success Response:** `200 OK` — returns array of condition objects.

---

### `PUT /api/patients/chronic-conditions/:id` 🔐 👤 `patient`

Update a chronic condition by ID.

**URL Params:**

| Param | Type | Description   |
|-------|------|---------------|
| `id`  | UUID | Condition ID  |

**Request Body (at least one required):**

| Field            | Type   | Description                              |
|------------------|--------|------------------------------------------|
| `condition_name` | string | Updated condition name                   |
| `status`         | string | `"active"`, `"managed"`, or `"resolved"` |
| `diagnosed_date` | string | Updated diagnosis date                   |

**Success Response:** `200 OK`

---

### `DELETE /api/patients/chronic-conditions/:id` 🔐 👤 `patient`

Delete a chronic condition by ID.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": { "id": "uuid" },
  "message": "Chronic condition deleted successfully."
}
```

---

## 5. Patient Emergency Info — `/api/patients`

> All emergency info routes require 🔐 👤 `patient`.

### `POST /api/patients/emergency-info` 🔐 👤 `patient`

Add a new emergency contact.

**Request Body:**

| Field                  | Type   | Required | Description                       |
|------------------------|--------|----------|-----------------------------------|
| `contact_name`         | string | ✅       | Emergency contact's name          |
| `contact_phone`        | string | ✅       | Emergency contact's phone number  |
| `contact_email`        | string | ✅       | Emergency contact's email         |
| `contact_relationship` | string | ❌       | Relationship (e.g. `"spouse"`)    |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "contact_name": "Jane Doe",
    "contact_phone": "1111111111",
    "contact_relationship": "spouse",
    "contact_email": "jane@example.com"
  },
  "message": "Emergency info saved successfully."
}
```

---

### `GET /api/patients/emergency-info` 🔐 👤 `patient`

Get the authenticated patient's emergency contacts (grouped/aggregated).

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "patientid": "uuid",
    "emergency_details": [
      {
        "emergency_email": "jane@example.com",
        "emergency_name": "Jane Doe",
        "emergency_phone_number": "1111111111"
      }
    ]
  },
  "message": "Operation successful."
}
```

---

### `PUT /api/patients/emergency-info/:id` 🔐 👤 `patient`

Update an emergency contact by ID.

**URL Params:**

| Param | Type | Description           |
|-------|------|-----------------------|
| `id`  | UUID | Emergency contact ID  |

**Request Body (all optional):**

| Field                  | Type   | Description                 |
|------------------------|--------|-----------------------------|
| `contact_name`         | string | Updated name                |
| `contact_phone`        | string | Updated phone               |
| `contact_email`        | string | Updated email               |
| `contact_relationship` | string | Updated relationship        |

**Success Response:** `200 OK`

---

### `DELETE /api/patients/emergency-info/:id` 🔐 👤 `patient`

Delete an emergency contact by ID.

**Success Response:** `200 OK`

---

## 6. Doctors — `/api/doctors`

> All doctor routes require 🔐 (authenticated). Role restrictions noted per endpoint.

### `POST /api/doctors/` 🔐 👤 `doctor`

Create the authenticated doctor's profile.

**Request Body:**

| Field            | Type   | Required | Description                         |
|------------------|--------|----------|-------------------------------------|
| `full_name`      | string | ✅       | Doctor's full name                  |
| `license_number` | string | ✅       | Medical license number (unique)     |
| `specialization` | string | ❌       | Area of specialization              |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "Dr. Smith",
    "license_number": "MED-123456",
    "specialization": "Cardiology",
    "is_verified": false
  },
  "message": "Doctor profile created successfully. Awaiting admin verification."
}
```

> ⚠️ Newly created doctors have `is_verified = false`. An admin must verify them before they can create consultations.

---

### `GET /api/doctors/` 🔐 👤 `doctor`

Get the authenticated doctor's own profile (includes `email`, `phone`).

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "full_name": "Dr. Smith",
    "license_number": "MED-123456",
    "specialization": "Cardiology",
    "is_verified": true,
    "email": "drsmith@example.com",
    "phone": "9999999999"
  },
  "message": "Operation successful."
}
```

---

### `PUT /api/doctors/` 🔐 👤 `doctor`

Update the authenticated doctor's profile.

**Request Body (at least one required):**

| Field            | Type   | Description            |
|------------------|--------|------------------------|
| `full_name`      | string | Updated name           |
| `specialization` | string | Updated specialization |

**Success Response:** `200 OK`

---

### `GET /api/doctors/consultations` 🔐 👤 `verified doctor`

Get all consultations for the authenticated doctor.

> Requires the doctor to be **verified** (`requireVerifiedDoctor`).

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "consultation_date": "2026-03-15T10:00:00.000Z",
      "status": "in_progress",
      "patient_name": "John Doe",
      "health_id": "HLTH-12345"
    }
  ],
  "message": "Operation successful."
}
```

---

### `GET /api/doctors/:id` 🔐

Get a doctor's public profile by their **doctor profile ID**. Only returns verified doctors.

**URL Params:**

| Param | Type | Description      |
|-------|------|------------------|
| `id`  | UUID | Doctor profile ID |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "full_name": "Dr. Smith",
    "license_number": "MED-123456",
    "specialization": "Cardiology",
    "is_verified": true
  },
  "message": "Operation successful."
}
```

---

### `GET /api/doctors/emergency/:patientId/:clinicId` 🔐 👤 `verified doctor`

Fetch comprehensive patient data during an emergency. **Also triggers email notifications** to the patient's emergency contacts.

**URL Params:**

| Param       | Type | Description      |
|-------------|------|------------------|
| `patientId` | UUID | Patient ID       |
| `clinicId`  | UUID | Clinic ID        |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "patient-name": "John Doe",
      "gender": "male",
      "blood_group": "O+",
      "age": { "years": 26 },
      "allergies": [
        { "allergy": "Peanuts", "severity": "severe" }
      ],
      "chronic-illness": [
        { "condition-name": "Diabetes", "status": "managed", "diagnosed-date": "2023-06-01" }
      ],
      "active-medications": [
        {
          "medicine-name": "Metformin",
          "dosage": "500mg",
          "prescribed-for": "Diabetes",
          "prescribed_by": "Dr. Smith",
          "date": "2026-01-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "message": "Operation successful."
}
```

> 📧 **Side Effect:** Sends emails to the patient's emergency contacts with doctor and clinic information.

---

## 7. Consultations — `/api/consultations`

> All consultation routes require 🔐 👤 `verified doctor` (authenticate → requireRole('doctor') → requireVerifiedDoctor).

### `POST /api/consultations/` 🔐 👤 `verified doctor`

Start a new consultation. The doctor must have active access permission from the patient.

**Request Body:**

| Field        | Type | Required | Description   |
|--------------|------|----------|---------------|
| `patient_id` | UUID | ✅       | Patient ID    |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "status": "in_progress",
    "consultation_date": "2026-03-15T10:00:00.000Z"
  },
  "message": "Consultation created."
}
```

**Possible Errors:**

| Status | Code      | When                                    |
|--------|-----------|----------------------------------------|
| 403    | FORBIDDEN | No active access permission for patient |

---

### `GET /api/consultations/:consultationId` 🔐 👤 `verified doctor`

Get a specific consultation by ID (only if it belongs to the authenticated doctor).

**URL Params:**

| Param            | Type | Description     |
|------------------|------|-----------------|
| `consultationId` | UUID | Consultation ID |

**Success Response:** `200 OK`

---

### `PUT /api/consultations/:consultationId/status` 🔐 👤 `verified doctor`

Update a consultation's status.

**URL Params:**

| Param            | Type | Description     |
|------------------|------|-----------------|
| `consultationId` | UUID | Consultation ID |

**Request Body:**

| Field    | Type   | Required | Description                              |
|----------|--------|----------|------------------------------------------|
| `status` | string | ✅       | `"in_progress"` or `"completed"`         |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "status": "completed",
    "updated_at": "2026-03-15T11:00:00.000Z"
  },
  "message": "Operation successful."
}
```

---

### `POST /api/consultations/:consultationId/prescription` 🔐 👤 `verified doctor`

Create or update a prescription for a consultation. **Replaces** all existing prescription items.

> ⚠️ Cannot modify prescriptions for `completed` consultations.

**URL Params:**

| Param            | Type | Description     |
|------------------|------|-----------------|
| `consultationId` | UUID | Consultation ID |

**Request Body:**

| Field   | Type  | Required | Description                    |
|---------|-------|----------|--------------------------------|
| `items` | array | ✅       | Array of prescription items    |

**Each item in `items`:**

| Field           | Type    | Required | Description              |
|-----------------|---------|----------|--------------------------|
| `drug_name`     | string  | ✅       | Name of the drug         |
| `dosage`        | string  | ✅       | Dosage (e.g. `"500mg"`)  |
| `frequency`     | string  | ✅       | Frequency (e.g. `"2x daily"`) |
| `duration_days` | integer | ✅       | Duration in days         |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "prescription_id": "uuid",
    "consultation_id": "uuid",
    "items_count": 3
  },
  "message": "Prescription saved successfully"
}
```

---

### `GET /api/consultations/:consultationId/prescription` 🔐 👤 `verified doctor`

Get the prescription for a consultation.

**URL Params:**

| Param            | Type | Description     |
|------------------|------|-----------------|
| `consultationId` | UUID | Consultation ID |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "prescription_id": "uuid",
    "consultation_id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "issued_at": "2026-03-15T10:30:00.000Z",
    "items": [
      {
        "drug_name": "Metformin",
        "dosage": "500mg",
        "frequency": "2x daily",
        "duration_days": 30
      }
    ]
  },
  "message": "Operation successful."
}
```

---

## 8. Admin — `/api/admin`

> All admin routes require 🔐 👤 `admin` (authenticate → requireRole('admin') → requireAdmin).

### `PUT /api/admin/doctors/:id/verify` 🔐 👤 `admin`

Verify a doctor's profile, enabling them to create consultations.

**URL Params:**

| Param | Type | Description      |
|-------|------|------------------|
| `id`  | UUID | Doctor profile ID |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "is_verified": true
  },
  "message": "Operation successful."
}
```

---

## 9. Active Medications — `/api/medications`

### `GET /api/medications/:userId` 🔓

Get active medications for a user by their **user ID**.

**URL Params:**

| Param    | Type | Description |
|----------|------|-------------|
| `userId` | UUID | User ID     |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Metformin",
      "dosage": "500mg",
      "prescibed_for": "Diabetes",
      "prescibed_at": "2026-01-01T00:00:00.000Z",
      "prescribed_by": "doctor-uuid",
      "user_id": "user-uuid"
    }
  ],
  "message": "Medications fetched successfully"
}
```

> Returns empty array with `200` if no medications found.

---

### `POST /api/medications/` 🔐 👤 `doctor`

Add a new active medication for a patient.

**Request Body:**

| Field          | Type   | Required | Description                              |
|----------------|--------|----------|------------------------------------------|
| `user_id`      | UUID   | ✅       | The patient's **user ID**                |
| `name`         | string | ✅       | Medication name                          |
| `dosage`       | string | ✅       | Dosage (e.g. `"500mg"`)                  |
| `prescibed_for`| string | ✅       | Condition the medication is for          |
| `prescibed_at` | string | ✅       | Prescription date (ISO timestamp)        |

**Success Response:** `201 Created`

---

### `PUT /api/medications/:id` 🔐 👤 `doctor`

Update an active medication.

**URL Params:**

| Param | Type | Description   |
|-------|------|---------------|
| `id`  | UUID | Medication ID |

**Request Body (at least one required):**

| Field          | Type   | Description        |
|----------------|--------|--------------------|
| `name`         | string | Updated name       |
| `dosage`       | string | Updated dosage     |
| `prescibed_for`| string | Updated condition  |
| `prescibed_at` | string | Updated date       |

**Success Response:** `200 OK`

---

### `DELETE /api/medications/:id` 🔐 👤 `doctor`

Delete an active medication.

**URL Params:**

| Param | Type | Description   |
|-------|------|---------------|
| `id`  | UUID | Medication ID |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Metformin",
    "user_id": "user-uuid"
  },
  "message": "Medication deleted successfully"
}
```

---

## 10. Clinics — `/api/clinics`

> All clinic routes require 🔐 👤 `verified doctor`.

### `POST /api/clinics/` 🔐 👤 `verified doctor`

Add a new clinic for the authenticated doctor.

**Request Body:**

| Field       | Type   | Required | Description          |
|-------------|--------|----------|----------------------|
| `clinicName`| string | ✅       | Clinic name          |
| `address`   | string | ✅       | Clinic address       |
| `email`     | string | ✅       | Clinic email         |
| `phone`     | string | ✅       | Clinic phone number  |
| `logoURL`   | string | ❌       | Clinic logo URL      |

**Success Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "doctor_id": "uuid",
    "clinic_name": "Heart Care Center",
    "address": "123 Main St",
    "logo_url": "https://example.com/logo.png",
    "email": "clinic@example.com",
    "phone": "5555555555"
  },
  "message": "Clinic added successfully."
}
```

---

### `GET /api/clinics/` 🔐 👤 `verified doctor`

Get all clinics for the authenticated doctor.

**Success Response:** `200 OK` — returns array of clinic objects with `id`, `clinic_name`, `address`, `logo_url`, `email`, `phone`.

---

### `GET /api/clinics/:id` 🔐 👤 `verified doctor`

Get a single clinic by ID (must belong to authenticated doctor).

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | Clinic ID   |

**Success Response:** `200 OK`

---

### `PUT /api/clinics/:id` 🔐 👤 `verified doctor`

Update a clinic by ID.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | Clinic ID   |

**Request Body (all optional):**

| Field       | Type   | Description          |
|-------------|--------|----------------------|
| `clinicName`| string | Updated clinic name  |
| `address`   | string | Updated address      |
| `email`     | string | Updated email        |
| `phone`     | string | Updated phone        |
| `logoURL`   | string | Updated logo URL     |

**Success Response:** `200 OK`

---

### `DELETE /api/clinics/:id` 🔐 👤 `verified doctor`

Delete a clinic by ID.

**URL Params:**

| Param | Type | Description |
|-------|------|-------------|
| `id`  | UUID | Clinic ID   |

**Success Response:** `200 OK`

---

## 11. OCR — `/api/ocr`

### `POST /api/ocr/scan` 🔓

Upload a prescription image/PDF for OCR processing and save the extracted data.

> ⚠️ Authentication is **currently disabled** (commented out in code).

**Request Headers:**

```
Content-Type: multipart/form-data
```

**Form Data:**

| Field             | Type   | Required | Description                                              |
|-------------------|--------|----------|----------------------------------------------------------|
| `file`            | File   | ✅       | Image (JPEG/PNG) or PDF. **Max 10 MB**.                  |
| `consultation_id` | string | ❌       | Consultation ID to link the prescription to               |
| `patient_id`      | string | ❌       | Patient ID to link the prescription to                    |
| `doctor_id`       | string | ❌       | Doctor ID to link the prescription to                     |

**Accepted File Types:** `image/jpeg`, `image/png`, `image/jpg`, `application/pdf`

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "prescription_id": "uuid",
    "drugs_count": 3,
    "success": true
  },
  "message": "Prescription saved successfully"
}
```

**Possible Errors:**

| Status | Code                 | When                                 |
|--------|----------------------|--------------------------------------|
| 400    | VALIDATION_ERROR     | No file uploaded                     |
| 500    | DATABASE_ERROR       | Failed to save to database           |
| 500    | OCR_PROCESSING_ERROR | OCR processing failed                |
| 503    | OCR_NOT_READY        | OCR service is still initializing    |

---

### `GET /api/ocr/health` 🔓

Check OCR service health and readiness status.

**Success Response (ready):** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "ready": true,
    "pendingRequests": 0
  },
  "message": "OCR service is healthy"
}
```

**Success Response (initializing):** `202 Accepted`

```json
{
  "success": true,
  "data": {
    "status": "initializing",
    "ready": false,
    "initializing": true
  },
  "message": "OCR service is initializing"
}
```

---

## Health Check

### `GET /health` 🔓

> ⚠️ Note: This is mounted at the root level, NOT under `/api`.

```json
{
  "success": true,
  "data": { "ok": true },
  "message": "Operation successful."
}
```

---

## Error Codes Reference

| Code                  | HTTP Status | Description                                    |
|-----------------------|-------------|------------------------------------------------|
| `BAD_REQUEST`         | 400         | Missing or invalid request parameters          |
| `VALIDATION_ERROR`    | 400         | Input validation failure (invalid UUID, enum)  |
| `UNAUTHORIZED`        | 401         | Missing/invalid token or credentials           |
| `FORBIDDEN`           | 403         | Insufficient permissions / role mismatch       |
| `NOT_FOUND`           | 404         | Resource not found                             |
| `CONFLICT`            | 409         | Duplicate resource (already exists)            |
| `OCR_NOT_READY`       | 503         | OCR service not initialized yet                |
| `OCR_PROCESSING_ERROR`| 500         | OCR scan failed                                |
| `DATABASE_ERROR`      | 500         | Database operation failed                      |
| `INTERNAL_ERROR`      | 500         | Unexpected server error                        |

---

## Route Summary Table

| Method   | Endpoint                                              | Auth         | Role / Middleware             |
|----------|-------------------------------------------------------|--------------|-------------------------------|
| `POST`   | `/api/users/signup`                                   | 🔓 Public    | —                             |
| `POST`   | `/api/users/login`                                    | 🔓 Public    | —                             |
| `GET`    | `/api/users/:id`                                      | 🔓 Public    | —                             |
| `GET`    | `/api/users/`                                         | 🔐 Auth      | `admin`                       |
| `PUT`    | `/api/users/:id`                                      | 🔐 Auth      | —                             |
| `DELETE` | `/api/users/:id`                                      | 🔐 Auth      | `admin`                       |
| `GET`    | `/api/patients/`                                      | 🔐 Auth      | `patient`                     |
| `POST`   | `/api/patients/`                                      | 🔐 Auth      | `patient`                     |
| `PUT`    | `/api/patients/`                                      | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/patients/consultations`                         | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/patients/:id`                                   | 🔐 Auth      | `patient` or `doctor`         |
| `POST`   | `/api/patients/grant-access`                          | 🔐 Auth      | `patient`                     |
| `DELETE` | `/api/patients/revoke-access/:doctorId`               | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/patients/access-list`                           | 🔐 Auth      | `patient`                     |
| `POST`   | `/api/patients/allergies`                             | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/patients/allergies`                             | 🔐 Auth      | `patient`                     |
| `PUT`    | `/api/patients/allergies/:id`                         | 🔐 Auth      | `patient`                     |
| `DELETE` | `/api/patients/allergies/:id`                         | 🔐 Auth      | `patient`                     |
| `POST`   | `/api/patients/chronic-conditions`                    | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/patients/chronic-conditions`                    | 🔐 Auth      | `patient`                     |
| `PUT`    | `/api/patients/chronic-conditions/:id`                | 🔐 Auth      | `patient`                     |
| `DELETE` | `/api/patients/chronic-conditions/:id`                | 🔐 Auth      | `patient`                     |
| `POST`   | `/api/patients/emergency-info`                        | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/patients/emergency-info`                        | 🔐 Auth      | `patient`                     |
| `PUT`    | `/api/patients/emergency-info/:id`                    | 🔐 Auth      | `patient`                     |
| `DELETE` | `/api/patients/emergency-info/:id`                    | 🔐 Auth      | `patient`                     |
| `GET`    | `/api/doctors/`                                       | 🔐 Auth      | `doctor`                      |
| `POST`   | `/api/doctors/`                                       | 🔐 Auth      | `doctor`                      |
| `PUT`    | `/api/doctors/`                                       | 🔐 Auth      | `doctor`                      |
| `GET`    | `/api/doctors/consultations`                          | 🔐 Auth      | `verified doctor`             |
| `GET`    | `/api/doctors/:id`                                    | 🔐 Auth      | —                             |
| `GET`    | `/api/doctors/emergency/:patientId/:clinicId`         | 🔐 Auth      | `verified doctor`             |
| `POST`   | `/api/consultations/`                                 | 🔐 Auth      | `verified doctor`             |
| `GET`    | `/api/consultations/:consultationId`                  | 🔐 Auth      | `verified doctor`             |
| `PUT`    | `/api/consultations/:consultationId/status`           | 🔐 Auth      | `verified doctor`             |
| `POST`   | `/api/consultations/:consultationId/prescription`     | 🔐 Auth      | `verified doctor`             |
| `GET`    | `/api/consultations/:consultationId/prescription`     | 🔐 Auth      | `verified doctor`             |
| `PUT`    | `/api/admin/doctors/:id/verify`                       | 🔐 Auth      | `admin`                       |
| `GET`    | `/api/medications/:userId`                            | 🔓 Public    | —                             |
| `POST`   | `/api/medications/`                                   | 🔐 Auth      | `doctor`                      |
| `PUT`    | `/api/medications/:id`                                | 🔐 Auth      | `doctor`                      |
| `DELETE` | `/api/medications/:id`                                | 🔐 Auth      | `doctor`                      |
| `POST`   | `/api/clinics/`                                       | 🔐 Auth      | `verified doctor`             |
| `GET`    | `/api/clinics/`                                       | 🔐 Auth      | `verified doctor`             |
| `GET`    | `/api/clinics/:id`                                    | 🔐 Auth      | `verified doctor`             |
| `PUT`    | `/api/clinics/:id`                                    | 🔐 Auth      | `verified doctor`             |
| `DELETE` | `/api/clinics/:id`                                    | 🔐 Auth      | `verified doctor`             |
| `POST`   | `/api/ocr/scan`                                       | 🔓 Public*   | — *(auth commented out)*      |
| `GET`    | `/api/ocr/health`                                     | 🔓 Public    | —                             |
| `GET`    | `/health`                                             | 🔓 Public    | — *(root-level, not `/api`)*  |

---

> **Note for `/api/patients/:id`:** This route does **not** have `requireRole` middleware at the route level. Instead, the controller checks `req.user.role` internally and applies different access logic for patients vs. doctors. The `authenticate` middleware is applied at the route level via `router.use(authenticate)` — **however**, looking at the route file, `authenticate` is NOT applied via `router.use()` for patient routes. Instead, `requireRole('patient')` is applied per-route. Since `requireRole` checks `req.user.role` (set by `authenticate`), and this route does NOT have `authenticate` or `requireRole`, **this route may need the token to be passed but will work differently** — the controller reads `req.user` which implies it expects authentication context. Frontend developers should always send the Bearer token for this route.

