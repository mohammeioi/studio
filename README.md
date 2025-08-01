# Firebase Studio

This is a NextJS starter project in Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Prerequisites

Before you begin, you need to have **Node.js** (version 18 or later) and **npm** installed on your system. These are essential for running the project.

### Recommended: Installing with nvm (Linux & macOS)

The recommended way to install Node.js and npm is with **nvm (Node Version Manager)**. It allows you to manage multiple Node.js versions without permission issues.

1.  **Open your terminal** and run the following command to install nvm:
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
2.  **Close and reopen your terminal** for the changes to take effect.
3.  **Install Node.js** (this command will install the latest Long-Term Support version, which is recommended):
    ```bash
    nvm install --lts
    ```
4.  **Verify the installation** by checking the versions:
    ```bash
    node -v
    npm -v
    ```
    You should see version numbers appear for both commands.

## Installation and Setup

Once the prerequisites are installed, follow these steps. These commands work for all operating systems (Linux, macOS, Windows).

1.  **Go to the project directory** in your terminal:
    ```bash
    cd path/to/your/project
    ```
2.  **Install project dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

### Windows-Specific Instructions

If you are using Windows and encounter errors during `npm install`, it might be due to a default security feature. To solve this, follow these steps:

1.  Open **PowerShell as an administrator**.
2.  Paste the following command and press **Enter**:
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    ```
3.  When prompted, type **Y** and then press **Enter**.

After this, you can run `npm install` and `npm run dev` from the "Installation and Setup" section.
