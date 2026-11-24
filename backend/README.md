# EngiCare Backend

Spring Boot API for reporting and tracking maintenance issues. The current local version supports student registration, JWT sign-in, report submission, technician assignment, status updates, timelines, comments, and photos.

## Run locally

Requirements are Java 25 and OpenSSL. The repository includes the Maven wrapper.

From the directory containing `pom.xml`, run:

```bash
export ENGICARE_JWT_SECRET="$(openssl rand -base64 32)"
./mvnw spring-boot:run
```

Open [the health endpoint](http://localhost:8080/health) and check for `"status":"UP"`. The React dev server proxies `/api` to this backend on port 8080.

The default database is in-memory H2. Restarting Spring Boot clears the test accounts, reports, comments, and photos. Passwords are hashed with BCrypt. JWTs expire after 30 minutes.

## Authentication checks

Leave the backend running and paste this into a second Bash terminal. It requires `curl` and Python 3 and uses a fresh test account each time.

```bash
api='http://localhost:8080/api/auth'
email="engicare-test-$(date +%s)@example.com"
registration="{\"fullName\":\"EngiCare Test\",\"email\":\"$email\",\"password\":\"EngiCareTest123\",\"department\":\"general\"}"
credentials="{\"email\":\"$email\",\"password\":\"EngiCareTest123\"}"

curl -sS -o /dev/null -w 'Registration: HTTP %{http_code}\n' \
  -H 'Content-Type: application/json' -d "$registration" "$api/register"

curl -sS -o /dev/null -w 'Duplicate email: HTTP %{http_code}\n' \
  -H 'Content-Type: application/json' -d "$registration" "$api/register"

login_response="$(mktemp)"
login_status="$(curl -sS -o "$login_response" -w '%{http_code}' \
  -H 'Content-Type: application/json' -d "$credentials" "$api/login")"
printf 'Login: HTTP %s\n' "$login_status"

if [ "$login_status" = 200 ] && token="$(python3 -c 'import json, sys; print(json.load(sys.stdin)["accessToken"])' < "$login_response")"; then
  curl -sS -o /dev/null -w 'Protected profile: HTTP %{http_code}\n' \
    -H "Authorization: Bearer $token" "$api/me"
fi
rm -f -- "$login_response"
unset token
```

Expected results are **201** for registration, **400** for the duplicate email, and **200** each for login and the protected profile. The commands print status codes without printing the JWT.

## Report API

Send the login token in the `Authorization: Bearer <token>` header for report requests.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/reports` | Submit a report. Send JSON, or multipart with a JSON `report` part and up to five `photos` parts. |
| GET | `/api/reports` | List reports the signed-in user may access. |
| GET | `/api/reports/{id}` | View a report. |
| GET | `/api/reports/technicians` | List technicians available for assignment. Admin only. |
| PATCH / DELETE | `/api/reports/{id}/assignee` | Assign or unassign a technician. Admin only. |
| PATCH | `/api/reports/{id}/status` | Update status as an admin or the assigned technician. |
| GET | `/api/reports/{id}/timeline` | View report history. |
| GET / POST | `/api/reports/{id}/comments` | Read or post comments on an accessible report. |
| GET | `/api/reports/{id}/photos`, `/api/reports/{id}/photos/{photoId}` | List metadata or open a protected photo. |

The reporter can track their own reports. Admins can view all reports. Technicians can view and update their assigned reports.

## Staff workflow for local testing

Public registration creates student accounts. To test a staff, faculty, admin, or technician account, set a password in the backend terminal and start Spring Boot with the `local-accounts` profile. Each role is optional.

| Email | Password environment variable |
| --- | --- |
| `staff@engicare.test` | `ENGICARE_LOCAL_STAFF_PASSWORD` |
| `faculty@engicare.test` | `ENGICARE_LOCAL_FACULTY_PASSWORD` |
| `admin@engicare.test` | `ENGICARE_LOCAL_ADMIN_PASSWORD` |
| `technician@engicare.test` | `ENGICARE_LOCAL_TECHNICIAN_PASSWORD` |

For example, to enable the admin account:

```bash
read -rsp 'Local admin password (at least 12 characters): ' ENGICARE_LOCAL_ADMIN_PASSWORD
printf '\n'
export ENGICARE_LOCAL_ADMIN_PASSWORD
./mvnw spring-boot:run -Dspring-boot.run.profiles=local-accounts
```

Set `ENGICARE_JWT_SECRET` as shown above before starting. Staff and faculty use the **Student / Faculty Staff** sign-in option. Admins and technicians use **Facilities Admin / Technician**.

## Pending

Supabase PostgreSQL integration, persistent photo storage, and guest reporting are pending. Keep database credentials.
