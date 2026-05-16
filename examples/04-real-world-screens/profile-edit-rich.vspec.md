---
id: SCR-PROFILE-EDIT-RICH
type: screen
title: Profile Edit Rich
route: /profile/edit-rich
owner: docs
locale: en
viewport: desktop
status: draft
---

# SCR-PROFILE-EDIT-RICH Profile Edit Rich

This example is a release-facing element type coverage screen. It keeps the
flow small and focuses on form primitives, media helpers, list content, and a
confirmation dialog that are not covered by the smaller examples.

## States

- idle*

## Layout: desktop

### L1:L-Page Profile edit page

- stack
- gap: lg

#### Items

- E-PageTitle
- L-ProfileHeader
- E-FormDivider
- L-ProfileForm
- L-PreferenceForm
- E-AuditList
- L-Actions

### L2:L-ProfileHeader Profile header

- row
- gap: md
- align: center

#### Items

- E-AvatarPreview
- E-ProfileIcon
- E-ProfileStatusBadge

### L3:L-ProfileForm Profile form

- grid
- columns: 2
- gap: md

#### Items

- E-BioTextarea
- E-AvatarUpload
- E-EvidenceFile
- E-StartDate
- E-RequestedDate
- E-ReminderTime
- E-Headcount

### L4:L-PreferenceForm Preference form

- grid
- columns: 2
- gap: md

#### Items

- E-InterestsSelect
- E-NotificationChannels
- E-VisibilityRadio
- E-EmailSwitch

### L5:L-Actions Form actions

- row
- gap: sm
- align: end

#### Items

- E-SaveButton
- E-DiscardButton

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Edit profile

### 2:E-AvatarPreview Image

- src: assets/markvspec-icon.svg
- alt: Current avatar preview

### 3:E-ProfileIcon Icon

- name: user-round
- label: Profile

### 4:E-ProfileStatusBadge Badge

- sample: Draft changes

### 5:E-FormDivider Divider

- label: Profile details

### 6:E-BioTextarea Textarea

- label: Bio
- value: ${model.bio}
- initial value: Product designer focused on member self-service.
- placeholder: Write a short profile.
- rows: 4
- width: full

### 7:E-AvatarUpload FileUpload

- label: Upload avatar
- accept: image/png,image/jpeg
- sample: PNG or JPEG, up to 2 MB.
- width: long

### 8:E-EvidenceFile FileInput

- label: Verification document
- accept: application/pdf,image/png,image/jpeg
- multiple
- width: long

### 9:E-StartDate DatePicker

- label: Availability start
- value: ${model.availabilityStart}
- initial value: 2026-06-01
- min: 2026-05-01
- max: 2027-12-31
- width: medium

### 10:E-RequestedDate DateInput

- label: Requested review date
- value: ${model.reviewDate}
- initial value: 2026-06-15
- min: 2026-05-15
- max: 2026-12-31
- width: medium

### 11:E-ReminderTime TimeInput

- label: Reminder time
- value: ${model.reminderTime}
- initial value: 09:30
- min: 09:00
- max: 18:00
- width: short

### 12:E-Headcount NumberInput

- label: Team size
- value: ${model.teamSize}
- initial value: 4
- min: 1
- max: 20
- step: 1
- width: short

### 13:E-InterestsSelect MultiSelect

- label: Interests
- value: ${model.interests}
- initial value: Accessibility, Analytics
- width: long
- options:
  - Accessibility
  - Analytics
  - Automation
  - Customer support

### 14:E-NotificationChannels CheckboxGroup

- label: Notification channels
- name: notificationChannels
- initial value: Email, In-app
- options:
  - Email
  - In-app
  - SMS

### 15:E-VisibilityRadio RadioGroup

- label: Profile visibility
- name: profileVisibility
- value: ${model.visibility}
- initial value: Team
- options:
  - Private
  - Team
  - Public

### 16:E-EmailSwitch Switch

- label: Email notifications
- initial value: true

### 17:E-AuditList List

- items: Created by Morgan Lee, Reviewed by Admin, Last edited today

### 18:E-SaveButton Button

- label: Save changes
- variant: primary

### 19:E-DiscardButton Button

- label: Discard
- variant: secondary
- action: A-RequestDiscardDialog

### 20:E-DiscardDialog Dialog

- title: Discard unsaved changes?
- message: Unsaved profile changes will be lost.
- tone: warning
- actions: E-CancelDiscardButton, E-ConfirmDiscardButton

### 21:E-CancelDiscardButton Button

- label: Keep editing
- variant: secondary
- action: A-CloseDiscardDialog

### 22:E-ConfirmDiscardButton Button

- label: Discard
- variant: primary
- tone: danger
- action: A-ConfirmDiscard

## Actions

### A-RequestDiscardDialog Request discard dialog

- Triggered
  - E-DiscardButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - element: E-DiscardDialog
    - stop

### A-CloseDiscardDialog Close discard dialog

- Triggered
  - E-CancelDiscardButton.click
  - E-DiscardDialog.close
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

### A-ConfirmDiscard Confirm discard

- Triggered
  - E-ConfirmDiscardButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

## Preview Scenarios

### idle-discard-dialog

- state: idle
- cases:
  - A-RequestDiscardDialog.P1.done
