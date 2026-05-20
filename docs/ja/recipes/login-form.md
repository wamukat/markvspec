# Login Form

## 目的

ログインフォームの入力、検証、認証 request、成功/失敗 case を1つの screen spec にまとめます。

## 完成イメージ

Email と password を入力し、Sign in を押す。成功したら dashboard へ遷移し、失敗したら error state と message area を更新します。

## 最小 snippet

```markdown
### E-SignInButton Button

- label: Sign in
- variant: primary
- action: A-SubmitLogin

### A-SubmitLogin Submit login

- Triggered
  - E-SignInButton.click
- Process
  - HttpRequest
    - POST /login
    - email: E-EmailInput.value
    - password: E-PasswordInput.value
- Cases
  - success:
    - navigate: SCR-DASHBOARD
  - failure:
    - state: auth-error
```

## 関連 example

- [Login](../../../examples/showcase/login-basic.html)

## 関連 reference

- [Actions Guide](../guide/actions.md)
- [Validation Guide](../guide/validation.md)
- [Reference](../reference/index.md)

## 確認方法

- required field の条件が element または rule として読める。
- request parameter が input element から取られている。
- success と failure の case が分かれている。
