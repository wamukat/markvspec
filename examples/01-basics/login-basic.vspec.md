---
id: SCR-LOGIN
type: screen
title: Login
route: /login
owner: docs
locale: en
viewport: mobile
status: draft
---

# SCR-LOGIN Login

This example teaches the minimum login form worth keeping as a release example:
required fields, one FormGroup, validation feedback, request sending, response
handling, and disabled controls while authentication is pending.

## States

- idle*
- authenticating
  - The login request was sent and the screen is waiting for the authentication response.
- validation-error
  - Required input is missing.
- request-error
  - The login request could not be sent.
- auth-error
  - The server rejected the submitted credentials.

## Layout: mobile

### L1:L-Page Login page

- stack
- align: center
- gap: md

#### Items

- E-PageTitle
- E-LeadText
- L-MessageArea
- L-LoginForm

### L2:L-LoginForm Login form

- stack
- gap: md
- disabled when: authenticating

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- E-RememberMe
- E-SignInButton
- L-AuthProgress

### L3:L-MessageArea Message area

- stack

#### Items

- L-ValidationMessageArea
- L-RequestErrorMessageArea
- L-AuthMessageArea

### L4:L-ValidationMessageArea Validation message area

- stack
- visible when: validation-error

#### Items

- E-ValidationMessage

### L5:L-RequestErrorMessageArea Request error message area

- stack
- visible when: request-error

#### Items

- E-RequestErrorBanner

### L6:L-AuthMessageArea Authentication message area

- stack
- visible when: auth-error

#### Items

- E-AuthErrorBanner

### L7:L-AuthProgress Auth progress

- stack
- overlay: area
- visible when: authenticating

#### Items

- E-AuthSpinner

## Layout: desktop

### L1:L-Page Login page

- stack
- align: center
- gap: lg

#### Items

- E-PageTitle
- E-LeadText
- L-MessageArea
- L-LoginForm

### L2:L-LoginForm Login form

- stack
- gap: md
- disabled when: authenticating

#### Items

- "Email": E-EmailInput
- "Password": E-PasswordInput
- L-DesktopActions
- L-AuthProgress

### L8:L-DesktopActions Desktop actions

- row
- gap: md
- align: center

#### Items

- E-RememberMe
- E-ForgotPasswordLink
- E-SignInButton

### L3:L-MessageArea Message area

- stack

#### Items

- L-ValidationMessageArea
- L-RequestErrorMessageArea
- L-AuthMessageArea

### L4:L-ValidationMessageArea Validation message area

- stack
- visible when: validation-error

#### Items

- E-ValidationMessage

### L5:L-RequestErrorMessageArea Request error message area

- stack
- visible when: request-error

#### Items

- E-RequestErrorBanner

### L6:L-AuthMessageArea Authentication message area

- stack
- visible when: auth-error

#### Items

- E-AuthErrorBanner

### L7:L-AuthProgress Auth progress

- stack
- overlay: area
- visible when: authenticating

#### Items

- E-AuthSpinner

## Elements

### 1:E-PageTitle Heading

- level: 1
- label: Login

### 2:E-LeadText Paragraph

- sample: Sign in to continue.

### 3:E-EmailInput Input

- label: Email
- value: ${model.email}
- placeholder: user@example.com

### 4:E-ValidationMessage Text

- tone: danger
- sample: Enter both email and password.
- visible when: validation-error

### 5:E-PasswordInput Input

- label: Password
- type: password
- value: ${model.password}

### 6:E-RememberMe Checkbox

- label: Remember this device
- value: ${model.rememberMe}

### 7:E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin
- disabled when: E-EmailInput is empty
- disabled when: E-PasswordInput is empty

### 8:E-ForgotPasswordLink Link

- label: Forgot password?
- href: /password/reset
- action: A-ForgotPassword

### 9:E-AuthErrorBanner Banner

- tone: danger
- sample: The email address or password is incorrect.
- visible when: auth-error

### 10:E-RequestErrorBanner Banner

- tone: danger
- sample: The login request could not be sent.
- visible when: request-error

### 11:E-AuthSpinner Spinner

- label: Signing in...
- visible when: authenticating

## Form Groups

### F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
  - E-RememberMe
- submit: A-SubmitLogin

## Actions

### A1:A-SubmitLogin Submit login

Validate required fields and submit the current form values. This action does
not decide whether credentials are correct.

- Triggered
  - E-SignInButton.click
- From
  - idle
  - validation-error
  - request-error
  - auth-error
- Process P1: Check validation
  - receive:
    - validation: V-LoginForm.result
  - case: invalid
    - description: required field missing
    - Effects
      - state: validation-error
      - display:
        - target: L-MessageArea
        - element: E-ValidationMessage
    - stop
  - case: valid
    - description: all required fields are valid
    - continue
- Process P2: Submit login
  - request:
    - method: POST
    - path: /login
    - params:
      - email: E-EmailInput.value
      - password: E-PasswordInput.value
      - rememberMe: E-RememberMe.value
  - result:
    - login submission request
  - case: sent
    - Effects
      - state: authenticating
  - case: send-failed
    - Effects
      - state: request-error
      - display:
        - target: L-MessageArea
        - element: E-RequestErrorBanner

The `sent` case means only that the browser submitted the request. Authentication
success or failure is handled by `A-HandleLoginResponse`.

### A2:A-HandleLoginResponse Handle login response

- Triggered
  - A-SubmitLogin.P2.response
- From
  - authenticating
- Process P1: Handle response
  - receive:
    - response: A-SubmitLogin.P2.response
  - case: success
    - response: 200 authenticated
    - Effects
      - navigate: SCR-HOME
  - case: failure
    - response: 401 invalid credentials
    - Effects
      - state: auth-error
      - display:
        - target: L-MessageArea
        - element: E-AuthErrorBanner

### A3:A-ForgotPassword Open password reset

- Triggered
  - E-ForgotPasswordLink.click
- From
  - idle
- Process P1: Apply immediate effect
  - navigate: SCR-PASSWORD-RESET

## Validations

### V-LoginForm Required login fields

- target: F-LoginForm
- rules:
  - required:
    - E-EmailInput
    - E-PasswordInput
- scope: composite
- run: client
- message: Email and password are required.

## Business Rules

### R-AUTH-001

- Do not send a login request when required fields are missing.
- Show request send failures and credential rejection inside the page message area.
