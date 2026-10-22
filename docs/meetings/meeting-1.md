# EngiCare Project Meeting Notes

**Project Title:** EngiCare — Engineering Faculty Issue Reporting System  
**Team Name/Number:** 3A1Y  
**Institution:** Muğla Sıtkı Koçman University  
**Meeting Type:** Project Initiation and Planning Meeting  
**Date:** 22 October 2026  
**Attendees:** Abdullah Mohammed, Ayomide Joshua Ogunmokun, Fahrettin Yiğitalp Karaca, Ali Ened Nayef Dweikat

## 1. Meeting Objectives

The purpose of the meeting was to establish a clear direction for EngiCare, identify the problem the project aims to solve, discuss the proposed technology stack, assign team responsibilities, and agree on the initial development plan.

## 2. Project Overview

EngiCare is a web-based reporting system designed for students and staff of the Engineering Faculty at Muğla Sıtkı Koçman University.

The platform will allow users to report faculty-related problems, such as damaged equipment, classroom issues, Wi-Fi problems, lighting failures, and maintenance needs. Users will be able to submit reports with a description, category, and location, then track their status.

Authorized administrators will be able to review reports, update their status, and manage the resolution process through a centralized dashboard.

## 3. Problem Statement

Students and staff need a more organized way to report and track problems within the Engineering Faculty. Informal reporting methods can lead to delays, lost information, and uncertainty about whether an issue has been resolved.

EngiCare aims to address this problem by providing a centralized platform for submitting, tracking, and managing faculty-related reports.

## 4. Proposed Solution and Initial Scope

The team discussed the essential features required for the first version of EngiCare.

The initial scope will include:

- Secure user registration and login using university credentials.
- A student dashboard for submitting and viewing reports.
- Report submission with a title, description, category, and location.
- Report status tracking.
- An administrative dashboard for reviewing and updating reports.
- Basic report management and filtering.

Advanced analytics, automatic hardware monitoring, email notifications, and integration with external university systems will remain outside the initial scope.

The team agreed to prioritize essential functionality before considering additional features.

## 5. Proposed Technology Stack

The team discussed a technology stack suitable for building a reliable, maintainable web application.

The proposed stack is:

- **Frontend:** React and TypeScript.
- **Styling:** Tailwind CSS.
- **Backend:** Java with Spring Boot.
- **Database:** PostgreSQL or another suitable SQL database.
- **Authentication and security:** Spring Security.
- **Version control and collaboration:** Git and GitHub.
- **API testing:** Postman.
- **Backend testing:** JUnit and Mockito.
- **Frontend testing:** Vitest.
- **Deployment:** Vercel for the frontend and Render for the backend, subject to hosting compatibility and free-tier limitations.
- **Image storage:** Cloudinary, if image attachments are included.

The proposed stack will support the application's reporting workflow, role-based access, database relationships, and future development.

The team should confirm the final database and deployment choices before implementation. Supporting tools will be introduced when needed rather than all at once.

## 6. Team Roles and Responsibilities

The team discussed dividing responsibilities according to the main components of the application.

**Abdullah Mohammed — Frontend Engineer**

Responsibilities:
- Design and implement the user interface.
- Develop the student and administrator dashboards.
- Create report submission and tracking pages.
- Ensure the interface is responsive and easy to use.

**Ayomide Joshua Ogunmokun — Backend Engineer**

Responsibilities:
- Develop the backend structure using Spring Boot.
- Implement REST APIs for report management.
- Develop application business logic and validation.
- Integrate the backend with the frontend and database.

**Fahrettin Yiğitalp Karaca — Database and Cybersecurity Engineer**

Responsibilities:
- Design the database schema and relationships.
- Implement database tables and constraints.
- Support secure data handling.
- Review database permissions and potential security issues.

**Ali Ened Nayef Dweikat — DevOps and Cybersecurity Engineer**

Responsibilities:
- Support deployment and environment configuration.
- Manage development and integration workflows.
- Help establish automated testing and continuous integration.
- Review application security and access controls.

Although each member has a primary responsibility, the team will collaborate on integration, testing, documentation, and problem-solving.

## 7. Development Approach

The team will follow an Agile development approach, building EngiCare incrementally rather than attempting to complete the entire system at once.

The proposed process is:

1. Finalize the requirements and user stories.
2. Design the database schema and user interface.
3. Develop the backend API and frontend components.
4. Integrate the frontend, backend, and database.
5. Test the main reporting workflow and security controls.
6. Deploy the application and prepare the final demonstration.

Regular meetings and GitHub updates will be used to monitor progress and identify problems early.

## 8. Initial Risks and Mitigation

The team identified several risks that could affect development.

**Risk 1: Scope expansion**

Adding too many features could delay completion.

*Mitigation:* Focus on the essential reporting and tracking features before introducing optional functionality.

**Risk 2: Integration difficulties**

The frontend, backend, and database may not work together as expected.

*Mitigation:* Agree on API formats early, integrate components regularly, and test endpoints throughout development.

**Risk 3: Security vulnerabilities**

Poor access control could allow unauthorized users to view or modify reports.

*Mitigation:* Implement authentication, role-based authorization, input validation, and security testing.

**Risk 4: Time constraints**

University coursework and other responsibilities may affect the team's progress.

*Mitigation:* Assign clear tasks, establish realistic deadlines, and review progress during regular meetings.

**Risk 5: Low user adoption**

Students and staff may be reluctant to use the platform if it is difficult to navigate or does not meet their needs.

*Mitigation:* Gather feedback from potential users and keep the interface simple.

## 9. Agreed Priorities and Action Items

The following tasks were identified as the next priorities:

| Task | Responsible member(s) | Expected outcome |
|---|---|---|
| Finalize requirements and user stories | All team members | Agreed list of features and requirements |
| Design the database schema | Fahrettin | Database schema and ER diagram |
| Develop the backend API skeleton | Ayomide | Initial report-management endpoints |
| Create frontend wireframes and UI prototype | Abdullah | Initial interface design |
| Establish CI and a test plan | Ali | Initial testing and integration setup |
| Define API contracts and integration requirements | Frontend and backend members | Agreement on request and response formats |
| Review security and user permissions | Fahrettin and Ali | Initial security requirements |

Progress will be tracked through the team's GitHub repository and project board.

## 10. Expected Outcomes

The team aims to produce a functional web application that allows users to submit and track faculty-related problems while enabling authorized staff to manage reports efficiently.

The project will be considered successful when the core reporting workflow operates correctly, users can access only the functions permitted by their roles, the interface works across common screen sizes, and the application is ready for demonstration.

## 11. Conclusion

The meeting established a shared direction for EngiCare. The team agreed to focus on developing a centralized faculty issue-reporting platform with clear responsibilities, a suitable technology stack, and an incremental development plan.

The immediate priority is to finalize the requirements, design the database and interface, and begin implementing the backend and frontend components. Regular communication, early integration, and controlled project scope will be important to completing the project successfully.
