# Firebase Studio

This is a NextJS starter project in Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Installation and Setup

These commands work for all operating systems (Linux, macOS, Windows).

1.  Install project dependencies:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm run dev
    ```

### Windows-Specific Instructions

You might encounter errors during `npm install` on Windows. This could be due to a default security feature that prevents certain scripts from running. To solve this problem, follow these steps:

1.  Open **PowerShell as an administrator**.
2.  Paste the following command into it and press **Enter**:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
3.  When prompted, type **Y** and then press **Enter**.

After this, you can run `npm install` and `npm run dev` as usual.
