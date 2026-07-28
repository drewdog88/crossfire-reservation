✨ Product Requirements Document (PRD): Crossfire Select Field Manager

This document outlines the requirements for Crossfire Select Field Manager, a website created to support easier scheduling for soccer teams signing up for soccer fields on a weekly basis.


1. Project Overview & Vision
Section
Detail
Source
Product Name
Crossfire Select Field Manager


Product Type
New Website


Product Vision
To be the single, unified platform to manage field sign up for 50+ Crossfire select teams.


Problem Statement
Today, the Director of Crossfire Select updates a spreadsheet to share with coaches which fields are available for sign up and how many spots are available for each field. Coaches will then add their name to one of the available spots. In the past, this has led to coaches overwriting each others entries.


Business Justification
This seems to be a general gap in the industry. For soccer teams such as Crossfire Select, I could not find any websites or products that allow for easy field scheduling.


Primary Goal
Deliver a purpose-built solution that helps the Crossfire Director and coaches understand which fields are available and sign up for those fields without having to worry about having their sign up overwritten.


Website Aesthetics
The website should try to follow the branding as listed here but should not be restricted to following the site if there is a better or more intuitive approach
https://www.crossfireselect.com/



2. Target Audience & User Personas
The solution is targeted at the key professionals involved in delivering the customer journey, who are referred to as Stakeholders in this PRD.

Persona Name
Primary Role & Responsibility
Primary Goals
Core Pain Points
Hugo
Crossfire Select Director
To deliver a seamless, experience and have the ability to define which fields are available for coaches to sign up for and communicate that sign up is open for the week.
Team uses disconnected systems/spreadsheets to track medical, training, and preference data. Lack of a centralized system creates a fragmented customer experience.
Sean
Crossfire Select B13 Coach
To have an easy way to view which fields are available for sign up, how many spots are available for sign up on a given field and to see where other teams are signed up in case his team wants to scrimmage with other teams.
Current Excel spreadsheet is tedious to use and error prone.
Meghan
Crossfire Select Admin
To be able to manage the website via an easy to use interface that allows for:

1. Adding/Listing all fields available by the club
2. For a given week, identifying which fields are available that week (not all fields are available every week)
3. Provide the ability to define the specific times that a field is available
This is currently done in Excel and is completely manual



3. Jobs-to-be-Done (JTBD) & Success Metrics
The following critical Jobs-to-be-Done (JTBD) will form the basis of the feature set. P0 jobs represent the absolute must-haves for the Minimum Viable Product (MVP).
P0 (Mission-Critical) Jobs
JTBD (User Story)
Acceptance Criteria (Functional Requirements)
Primary Persona
As an admin I want to be able to manage the website via an easy to use interface that allows for:

1. Adding/Listing all fields available by the club
2. For a given week, identifying which fields are available that week (not all fields are available every week)
3. Provide the ability to define the specific times that a field is available
4. Provide the ability to add/remove users from the site
5. Provide the ability to add/remove coaches who are assigned to teams from the site
* The system provides a way to manage the:

1. The addition of locations that can have 1 to many fields
2. A field can have 1 to 8 spots available for sign up. The number of spots to sign up is configurable and can change each week as determined by the administrator
3. Only one team can sign up for a spot on a field at a given time
4. A team can sign up for two different spots within the week (on different days)
Hugo and Meghan
As a Crossfire Select Soccer Coach, I want to 
1. Be able to register on the site and select which team I’m associated with
2. View fields that are available for that week
3. Select the fields that I want to sign up for that week
4. Sign up for the selected fields
5. View all of the teams that are currently signed up that week
The system shall provide an intuitive and easy to use method for registration and field sign up. 

After sign up, the coach can go to the site and see which fields they’ve signed up for that week
Sean



4. Functional Requirements (Feature List)
The feature list is prioritized based on the JTBD and organized into logical categories.
Category 1: Administrators
(Core features focused on the mission-critical workflows for flight safety and participant readiness)

Priority
Feature Name
Description
P0
The Team Set Up
A simple and easy way to set up the 50+ crossfire teams. Each team has the attribute of Boy or Girls Team, Birth Year and level (A,B,C,D). Example B12-B is the Boys 2012 B team.
P0
The location set up
A simple and easy way to add the location that each field is associated with. As an example, “Marymoor Park” is a location and contains 4 fields.
P0
Field Set Up
A simple and easy way to add fields to the site and associate with a location. As an example, Field 4 is associated with Marymoor Park. The field should also have a property that distinguishes whether it’s a Turf field or a grass field.
P0
Slot Availability
A simple and easy way to define how many teams can sign up on a field on a given day. As an example, on November 10th, Field 4 may allow for 6 teams to sign up, On November 12th, 2 teams can sign up but on November 17th, 8 teams may be allowed to sign up 
P0
Account Management
Provide an easy way for admins to add/remove coaches or update coaches information via the website interface
PO
Override Field Scheduling
Provide an easy way to change existing field reservations made by coaches
PO
Admin
Provide an easy way to associate admin privileges with any account. The admin privileges allow for updating any of the properties in this section.







Category 2: Coaches
(Features designed to create and manage a seamless, ultra-premium, and personalized customer journey)

Priority
Feature Name
Description
P0
Coach Website Sign Up
A coach should be allowed to register/sign up. As part of registration, the coach is required to add their First Name, Last Name, Email Address and Team that they coach. A team can have one to many coaches.
PO
Coach Field Reservation
A simple and easy way to view fields that are available the next week. Select up to 2 spots on a field (on 2 different days) and reserve.
PO
View of all Fields for the week
Without being signed in, a visitor to the site should be able to see for a given week all of the fields that are available and which teams are signed up. There should be 2 different views, one for Turf and one for Grass fields.









5. Non-Functional Requirements (NF-R)
Area
Requirement
Security & Compliance
Must meet the highest standards for data security to protect PII.
Auditability
Updating information in the site should have an audit trail for historical purposes
Integration
TBD
User Experience (UX)
The experience must be intuitive, ultra-premium, and seamless to reflect the luxury nature of the product.
Scalability
Must be able to support ~60 teams using the tool on a weekly basis


5. Existing Process







Would you like me to elaborate on one of the P0 features by breaking it down into more detailed user stories?

