## Testing policy (non‑negotiable)
- Tests **MUST** cover the functionality being implemented.
- **NEVER** ignore the output of the system or the tests - logs and messages often contain **CRITICAL** information.
- **TEST OUTPUT MUST BE PRISTINE TO PASS.**
- If logs are **supposed** to contain errors, capture and test it.
- **NO EXCEPTIONS POLICY:** Under no circumstances should you mark any test type as "not applicable". Every project, regardless of size or complexity, **MUST** have unit tests, integration tests, **AND** end‑to‑end tests. If you believe a test type doesn't apply, you need the human to say exactly **"I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME"**.

### TDD (how we work)
- Write tests **before** implementation.
- Only write enough code to make the failing test pass.
- Refactor continuously while keeping tests green.

**TDD cycle**
1. Write a failing test that defines a desired function or improvement.  
2. Run the test to confirm it fails as expected.  
3. Write minimal code to make the test pass.  
4. Run the test to confirm success.  
5. Refactor while keeping tests green.  
6. Repeat for each new feature or bugfix.

---

## Important checks
- **NEVER** disable functionality to hide a failure. Fix root cause.  
- **NEVER** create duplicate templates or files. Fix the original.  
- **NEVER** claim something is “working” when any functionality is disabled or broken.  
- If you can’t open a file or access something requested, say so. Do not assume contents.  
- **ALWAYS** identify and fix the root cause of template or compilation errors.  
- If git is initialized, ensure a '.gitignore' exists and contains at least:
  
  .env
  .env.local
  .env.*
  
  Ask the human whether additional patterns should be added, and suggest any that you think are important given the project. 

